// Fix field order and remove non-original fields to match original ICE Deaths tracker
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// The exact field order from the original ICE Deaths tracker sidepanel.html
// Based on analysis:
// 1. Incident Type (first section)
// 2. Basic Information: victim_name, date, age, nationality, gender, immigration_status, facility, city, state, summary, media, tags
// 3. Conditional sections: Shooting, Death, Arrest, Excessive Force, Injury, Medical Neglect, Protest
// 4. Agencies Involved
// 5. Constitutional Violations
// NO: investigation_status, legal_action_status, settlement_amount, criminal_charges, internal_investigation, policy_changes, etc.

const ORIGINAL_FIELD_ORDER = [
  // === INCIDENT TYPE SECTION ===
  'incident_types',                // multi-select checkbox for incident types
  
  // === BASIC INFORMATION SECTION ===
  'victim_name',                   // Subject Name
  'date_of_death',                 // Incident Date
  'date_approximate',              // Date approximate checkbox
  'date_precision',                // Date precision dropdown
  'age',                           // Age
  'country_of_origin',             // Nationality
  'gender',                        // Gender
  'immigration_status',            // Immigration Status
  'facility_name',                 // Facility
  'location_city',                 // City
  'location_state',                // State
  'summary',                       // Summary
  'tags',                          // Tags
  
  // === SHOOTING DETAILS (conditional on incident_types=shooting) ===
  'shooting_fatal',
  'shooting_shots_fired',
  'shooting_weapon_type',
  'shooting_victim_armed',
  'shooting_warning_given',
  'shooting_bodycam',
  'shooting_context',
  
  // === DEATH DETAILS (conditional on death types) ===
  'death_autopsy_available',
  'death_medical_neglect',
  'death_circumstances',
  
  // === ARREST DETAILS (conditional on incident_types=arrest_detention) ===
  'arrest_reason',
  'arrest_charges',
  'arrest_warrant',
  'arrest_selective',
  'arrest_timing_suspicious',
  'arrest_pretext',
  'arrest_context',
  
  // === EXCESSIVE FORCE DETAILS (conditional) ===
  'force_types',
  'force_injuries',
  'force_restrained',
  'force_complying',
  'force_video',
  'force_hospitalization',
  'force_injury_type',
  'force_injury_severity',
  'force_weapon',
  'force_context',
  
  // === MEDICAL NEGLECT DETAILS (conditional) ===
  'neglect_condition',
  'neglect_treatment_denied',
  'neglect_requests_documented',
  'neglect_resulted_death',
  
  // === PROTEST DETAILS (conditional) ===
  'protest_topic',
  'protest_size',
  'protest_permit',
  'protest_dispersal',
  'protest_arrests',
  
  // === AGENCIES INVOLVED ===
  'agencies_involved',
  
  // === CONSTITUTIONAL VIOLATIONS ===
  'constitutional_violations',
  
  // === VERIFICATION (internal tracking, not in original but needed) ===
  'first_verification_notes',
  'second_verification_notes',
];

// Fields that DO NOT exist in the original ICE tracker and should be removed
const FIELDS_TO_REMOVE = [
  'incident_type',              // Replaced by incident_types (multi-select)
  'incident_description',       // Not in original
  'investigation_status',       // Not in original
  'family_notified',            // Not in original (this is tracked differently)
  'family_notification_delay',  // Not in original
  'media_coverage',             // Not in original (sources are separate)
  'additional_notes',           // Not in original
  'legal_violations',           // Replaced by constitutional_violations
  'legal_action_status',        // Not in original
  'settlement_amount',          // Not in original
  'criminal_charges',           // Not in original
  'internal_investigation',     // Not in original
  'policy_changes',             // Not in original
  'years_in_us',                // Not in original
  'family_in_us',               // Not in original
  'occupation',                 // Not in original
  'address',                    // Not in original (city/state only)
  'latitude',                   // Not in original
  'longitude',                  // Not in original
  'cause_of_death',             // Replaced by summary and death_circumstances
  'manner_of_death',            // Not in original
  'medical_conditions',         // Not in original
  'medical_requests_denied',    // Replaced by neglect fields
  'medical_neglect_details',    // Replaced by neglect fields
  'custody_duration',           // Not in original
  'detention_reason',           // Not in original (part of arrest)
  'facility_type',              // Not in original
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get all current fields
    const currentFields = await pool.query(`
      SELECT id, slug, name, field_group_id
      FROM field_definitions
      WHERE record_type_id = 6
      ORDER BY sort_order
    `);
    
    console.log('Current fields:', currentFields.rows.length);
    
    // Create a map of slug to field info
    const fieldMap = {};
    currentFields.rows.forEach(f => {
      fieldMap[f.slug] = f;
    });
    
    // Check which fields to remove exist
    const fieldsExistToRemove = FIELDS_TO_REMOVE.filter(slug => fieldMap[slug]);
    console.log('\nFields that exist and should be removed:', fieldsExistToRemove.length);
    fieldsExistToRemove.forEach(slug => console.log(`  - ${slug}`));
    
    // Check which fields from order list don't exist
    const missingFields = ORIGINAL_FIELD_ORDER.filter(slug => !fieldMap[slug]);
    if (missingFields.length > 0) {
      console.log('\nWARNING: These fields from order list do not exist:');
      missingFields.forEach(slug => console.log(`  - ${slug}`));
    }
    
    // Calculate new sort order for fields that should be kept
    const fieldsToKeep = ORIGINAL_FIELD_ORDER.filter(slug => fieldMap[slug]);
    console.log('\nFields to reorder:', fieldsToKeep.length);
    
    // Start transaction
    await pool.query('BEGIN');
    
    // First, soft delete fields that should be removed
    if (fieldsExistToRemove.length > 0) {
      console.log('\n--- Removing fields ---');
      for (const slug of fieldsExistToRemove) {
        await pool.query(`
          DELETE FROM field_definitions
          WHERE record_type_id = 6 AND slug = $1
        `, [slug]);
        console.log(`  Deleted: ${slug}`);
      }
    }
    
    // Update sort_order for remaining fields
    console.log('\n--- Reordering fields ---');
    for (let i = 0; i < fieldsToKeep.length; i++) {
      const slug = fieldsToKeep[i];
      await pool.query(`
        UPDATE field_definitions
        SET sort_order = $1
        WHERE record_type_id = 6 AND slug = $2
      `, [i, slug]);
      console.log(`  ${i}. ${slug}`);
    }
    
    await pool.query('COMMIT');
    
    // Verify final count
    const finalCount = await pool.query(`
      SELECT COUNT(*) FROM field_definitions WHERE record_type_id = 6
    `);
    console.log('\n=== DONE ===');
    console.log(`Final field count: ${finalCount.rows[0].count}`);
    
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

main();
