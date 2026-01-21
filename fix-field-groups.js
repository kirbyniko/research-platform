// Fix field groups to match original ICE tracker sections
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Group structure matching original ICE tracker sidepanel.html
const FIELD_GROUPS = [
  { name: 'Incident Type', slug: 'incident_type', sort_order: 0 },
  { name: 'Basic Information', slug: 'basic_information', sort_order: 1 },
  { name: 'Shooting Details', slug: 'shooting_details', sort_order: 2 },
  { name: 'Death Details', slug: 'death_details', sort_order: 3 },
  { name: 'Arrest Details', slug: 'arrest_details', sort_order: 4 },
  { name: 'Excessive Force Details', slug: 'force_details', sort_order: 5 },
  { name: 'Medical Neglect Details', slug: 'neglect_details', sort_order: 6 },
  { name: 'Protest Details', slug: 'protest_details', sort_order: 7 },
  { name: 'Agencies Involved', slug: 'agencies_involved', sort_order: 8 },
  { name: 'Constitutional Violations', slug: 'constitutional_violations', sort_order: 9 },
  { name: 'Verification', slug: 'verification', sort_order: 10 },
];

// Field to group mapping
const FIELD_TO_GROUP = {
  // Incident Type
  'incident_types': 'incident_type',
  
  // Basic Information
  'victim_name': 'basic_information',
  'date_of_death': 'basic_information',
  'date_approximate': 'basic_information',
  'date_precision': 'basic_information',
  'age': 'basic_information',
  'country_of_origin': 'basic_information',
  'gender': 'basic_information',
  'immigration_status': 'basic_information',
  'facility_name': 'basic_information',
  'location_city': 'basic_information',
  'location_state': 'basic_information',
  'summary': 'basic_information',
  'tags': 'basic_information',
  
  // Shooting Details
  'shooting_fatal': 'shooting_details',
  'shooting_shots_fired': 'shooting_details',
  'shooting_weapon_type': 'shooting_details',
  'shooting_victim_armed': 'shooting_details',
  'shooting_warning_given': 'shooting_details',
  'shooting_bodycam': 'shooting_details',
  'shooting_context': 'shooting_details',
  
  // Death Details
  'death_autopsy_available': 'death_details',
  'death_medical_neglect': 'death_details',
  'death_circumstances': 'death_details',
  
  // Arrest Details
  'arrest_reason': 'arrest_details',
  'arrest_charges': 'arrest_details',
  'arrest_warrant': 'arrest_details',
  'arrest_selective': 'arrest_details',
  'arrest_timing_suspicious': 'arrest_details',
  'arrest_pretext': 'arrest_details',
  'arrest_context': 'arrest_details',
  
  // Excessive Force Details
  'force_types': 'force_details',
  'force_injuries': 'force_details',
  'force_restrained': 'force_details',
  'force_complying': 'force_details',
  'force_video': 'force_details',
  'force_hospitalization': 'force_details',
  'force_injury_type': 'force_details',
  'force_injury_severity': 'force_details',
  'force_weapon': 'force_details',
  'force_context': 'force_details',
  
  // Medical Neglect Details
  'neglect_condition': 'neglect_details',
  'neglect_treatment_denied': 'neglect_details',
  'neglect_requests_documented': 'neglect_details',
  'neglect_resulted_death': 'neglect_details',
  
  // Protest Details
  'protest_topic': 'protest_details',
  'protest_size': 'protest_details',
  'protest_permit': 'protest_details',
  'protest_dispersal': 'protest_details',
  'protest_arrests': 'protest_details',
  
  // Agencies Involved
  'agencies_involved': 'agencies_involved',
  
  // Constitutional Violations
  'constitutional_violations': 'constitutional_violations',
  
  // Verification
  'first_verification_notes': 'verification',
  'second_verification_notes': 'verification',
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query('BEGIN');
    
    // Get all existing field groups for record_type_id 6
    const existingGroups = await pool.query(`
      SELECT id, slug, name FROM field_groups WHERE record_type_id = 6
    `);
    
    console.log('Existing groups:', existingGroups.rows.map(g => g.slug));
    
    const groupSlugToId = {};
    existingGroups.rows.forEach(g => {
      groupSlugToId[g.slug] = g.id;
    });
    
    // Create/update field groups
    console.log('\n--- Creating/updating field groups ---');
    for (const group of FIELD_GROUPS) {
      if (groupSlugToId[group.slug]) {
        // Update existing
        await pool.query(`
          UPDATE field_groups
          SET name = $1, sort_order = $2
          WHERE id = $3
        `, [group.name, group.sort_order, groupSlugToId[group.slug]]);
        console.log(`  Updated: ${group.slug}`);
      } else {
        // Create new
        const result = await pool.query(`
          INSERT INTO field_groups (record_type_id, name, slug, sort_order)
          VALUES (6, $1, $2, $3)
          RETURNING id
        `, [group.name, group.slug, group.sort_order]);
        groupSlugToId[group.slug] = result.rows[0].id;
        console.log(`  Created: ${group.slug}`);
      }
    }
    
    // Update field to group assignments
    console.log('\n--- Assigning fields to groups ---');
    for (const [fieldSlug, groupSlug] of Object.entries(FIELD_TO_GROUP)) {
      const groupId = groupSlugToId[groupSlug];
      if (!groupId) {
        console.log(`  WARNING: Group ${groupSlug} not found for field ${fieldSlug}`);
        continue;
      }
      
      await pool.query(`
        UPDATE field_definitions
        SET field_group_id = $1
        WHERE record_type_id = 6 AND slug = $2
      `, [groupId, fieldSlug]);
      console.log(`  ${fieldSlug} -> ${groupSlug}`);
    }
    
    // Delete unused field groups
    console.log('\n--- Cleaning up unused groups ---');
    const usedGroupSlugs = [...new Set(Object.values(FIELD_TO_GROUP))];
    const unusedGroups = existingGroups.rows.filter(g => !usedGroupSlugs.includes(g.slug));
    for (const group of unusedGroups) {
      // Check if group has any fields
      const count = await pool.query(`
        SELECT COUNT(*) FROM field_definitions WHERE field_group_id = $1
      `, [group.id]);
      
      if (parseInt(count.rows[0].count) === 0) {
        await pool.query(`DELETE FROM field_groups WHERE id = $1`, [group.id]);
        console.log(`  Deleted empty group: ${group.slug}`);
      } else {
        console.log(`  Keeping group with fields: ${group.slug}`);
      }
    }
    
    await pool.query('COMMIT');
    console.log('\n=== DONE ===');
    
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

main();
