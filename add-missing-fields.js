// Add missing fields from ICE Deaths tracker to test-form
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Additional fields based on ICE Deaths incidents table
const additionalFields = [
  // Agencies Involved
  { name: 'Agencies Involved', slug: 'agencies_involved', type: 'checkbox_group', required: false, requiresQuote: true, group: 'Agencies & Oversight', 
    config: { options: [
      {value: 'ice', label: 'ICE'},
      {value: 'cbp', label: 'CBP (Border Patrol)'},
      {value: 'ice_ere', label: 'ICE ERO (Enforcement & Removal Operations)'},
      {value: 'local_police', label: 'Local Police'},
      {value: 'state_police', label: 'State Police'},
      {value: 'federal_marshals', label: 'Federal Marshals'},
      {value: 'dhs', label: 'DHS'},
      {value: 'private_contractor', label: 'Private Contractor'},
      {value: 'national_guard', label: 'National Guard'},
      {value: 'other', label: 'Other'},
      {value: 'unknown', label: 'Unknown'}
    ]} },
  
  // Legal/Constitutional violations
  { name: 'Legal Violations Alleged', slug: 'legal_violations', type: 'checkbox_group', required: false, requiresQuote: true, group: 'Legal & Oversight',
    config: { options: [
      {value: '4th_amendment', label: '4th Amendment (Search & Seizure)'},
      {value: '5th_amendment', label: '5th Amendment (Due Process)'},
      {value: '8th_amendment', label: '8th Amendment (Cruel & Unusual)'},
      {value: '14th_amendment', label: '14th Amendment (Equal Protection)'},
      {value: '1st_amendment', label: '1st Amendment (Speech/Religion)'},
      {value: 'medical_neglect', label: 'Medical Neglect'},
      {value: 'excessive_force', label: 'Excessive Force'},
      {value: 'false_imprisonment', label: 'False Imprisonment'},
      {value: 'civil_rights', label: 'Civil Rights Violation'}
    ]} },
  
  // Outcome fields
  { name: 'Legal Action Status', slug: 'legal_action_status', type: 'select', required: false, requiresQuote: false, group: 'Legal & Oversight',
    config: { options: [
      {value: 'lawsuit_filed', label: 'Lawsuit Filed'},
      {value: 'lawsuit_pending', label: 'Lawsuit Pending'},
      {value: 'lawsuit_settled', label: 'Lawsuit Settled'},
      {value: 'lawsuit_dismissed', label: 'Lawsuit Dismissed'},
      {value: 'no_legal_action', label: 'No Legal Action'},
      {value: 'unknown', label: 'Unknown'}
    ]} },
  { name: 'Settlement Amount', slug: 'settlement_amount', type: 'text', required: false, requiresQuote: true, group: 'Legal & Oversight' },
  { name: 'Criminal Charges Filed', slug: 'criminal_charges', type: 'textarea', required: false, requiresQuote: true, group: 'Legal & Oversight' },
  { name: 'Internal Investigation Outcome', slug: 'internal_investigation', type: 'textarea', required: false, requiresQuote: true, group: 'Legal & Oversight' },
  { name: 'Policy Changes Resulting', slug: 'policy_changes', type: 'textarea', required: false, requiresQuote: false, group: 'Legal & Oversight' },
  
  // Subject/Person information
  { name: 'Years in U.S.', slug: 'years_in_us', type: 'number', required: false, requiresQuote: true, group: 'Basic Information', config: { min: 0 } },
  { name: 'Family in U.S.', slug: 'family_in_us', type: 'text', required: false, requiresQuote: true, group: 'Basic Information' },
  { name: 'Occupation', slug: 'occupation', type: 'text', required: false, requiresQuote: false, group: 'Basic Information' },
  
  // Location precision
  { name: 'Date Precision', slug: 'date_precision', type: 'select', required: false, requiresQuote: false, group: 'Incident Details',
    config: { options: [
      {value: 'exact', label: 'Exact Date'},
      {value: 'approximate', label: 'Approximate'},
      {value: 'month_year', label: 'Month/Year Only'},
      {value: 'year_only', label: 'Year Only'},
      {value: 'unknown', label: 'Unknown'}
    ]} },
  { name: 'Address', slug: 'address', type: 'textarea', required: false, requiresQuote: true, group: 'Incident Details' },
  { name: 'Coordinates (Latitude)', slug: 'latitude', type: 'number', required: false, requiresQuote: false, group: 'Incident Details', config: { step: 0.000001 } },
  { name: 'Coordinates (Longitude)', slug: 'longitude', type: 'number', required: false, requiresQuote: false, group: 'Incident Details', config: { step: 0.000001 } },
  
  // Verification
  { name: 'First Verifier Notes', slug: 'first_verification_notes', type: 'textarea', required: false, requiresQuote: false, group: 'Verification' },
  { name: 'Second Verifier Notes', slug: 'second_verification_notes', type: 'textarea', required: false, requiresQuote: false, group: 'Verification' },
];

async function addFields() {
  try {
    console.log('📋 Adding ICE Tracker fields to test-form...\n');
    
    // Get record type
    const rtResult = await pool.query('SELECT id FROM record_types WHERE slug = $1', ['test-form']);
    if (rtResult.rows.length === 0) {
      console.log('❌ test-form record type not found');
      process.exit(1);
    }
    const recordTypeId = rtResult.rows[0].id;
    
    // Get or create field groups
    const groupNames = ['Agencies & Oversight', 'Legal & Oversight', 'Verification'];
    const groupIds = {};
    
    // Get existing groups
    const existingGroupsResult = await pool.query(
      'SELECT id, name FROM field_groups WHERE record_type_id = $1',
      [recordTypeId]
    );
    existingGroupsResult.rows.forEach(row => {
      groupIds[row.name] = row.id;
    });
    
    // Create missing groups
    for (const groupName of groupNames) {
      if (!groupIds[groupName]) {
        const result = await pool.query(
          `INSERT INTO field_groups (record_type_id, slug, name, description)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [recordTypeId, groupName.toLowerCase().replace(/\s+/g, '_'), groupName, `${groupName} fields`]
        );
        groupIds[groupName] = result.rows[0].id;
        console.log(`✅ Created group: ${groupName}`);
      }
    }
    
    // Get current max sort_order
    const sortOrderResult = await pool.query(
      'SELECT MAX(sort_order) as max_order FROM field_definitions WHERE record_type_id = $1',
      [recordTypeId]
    );
    let sortOrder = (sortOrderResult.rows[0].max_order || 0) + 1;
    
    // Add fields
    console.log('\n📝 Adding fields...');
    let added = 0;
    
    for (const field of additionalFields) {
      // Check if field already exists
      const existsResult = await pool.query(
        'SELECT id FROM field_definitions WHERE record_type_id = $1 AND slug = $2',
        [recordTypeId, field.slug]
      );
      
      if (existsResult.rows.length > 0) {
        console.log(`   ⏭️  Skipped: ${field.name} (already exists)`);
        continue;
      }
      
      const groupId = groupIds[field.group];
      await pool.query(
        `INSERT INTO field_definitions (
          record_type_id, field_group_id, slug, name, field_type, 
          is_required, requires_quote, config, sort_order,
          show_in_guest_form, show_in_review_form, show_in_validation_form
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          recordTypeId, groupId, field.slug, field.name, field.type,
          field.required, field.requiresQuote, JSON.stringify(field.config || {}), sortOrder++,
          true, true, true
        ]
      );
      console.log(`   ✅ ${field.name} (${field.type})`);
      added++;
    }
    
    console.log(`\n🎉 Added ${added} new fields!`);
    console.log('\n📊 Total fields now:');
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count FROM field_definitions WHERE record_type_id = $1',
      [recordTypeId]
    );
    console.log(`   ${totalResult.rows[0].count} fields in test-form`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

addFields();
