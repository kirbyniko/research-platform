// This script updates the constitutional violation fields to use the new 'violations' field type
// Instead of separate description/caselaw text fields, we use a single violations field that
// renders as checkbox cards with expandable details

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateViolationFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating constitutional violation fields...\n');
    
    // Get the test-form record type
    const rtResult = await client.query(
      "SELECT id FROM record_types WHERE slug = 'test-form'"
    );
    
    if (rtResult.rows.length === 0) {
      console.log('❌ test-form record type not found');
      return;
    }
    
    const recordTypeId = rtResult.rows[0].id;
    console.log(`📋 Found record type ID: ${recordTypeId}`);
    
    // Get or create a Constitutional Violations group
    let groupId;
    const groupResult = await client.query(
      `SELECT id FROM field_groups 
       WHERE record_type_id = $1 AND name = 'Constitutional Violations'`,
      [recordTypeId]
    );
    
    if (groupResult.rows.length > 0) {
      groupId = groupResult.rows[0].id;
      console.log(`📁 Found existing Constitutional Violations group: ${groupId}`);
    } else {
      const insertGroup = await client.query(
        `INSERT INTO field_groups (record_type_id, slug, name, description, sort_order)
         VALUES ($1, 'constitutional_violations', 'Constitutional Violations', 'Track potential constitutional and civil rights violations with supporting case law', 
                 (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM field_groups WHERE record_type_id = $1))
         RETURNING id`,
        [recordTypeId]
      );
      groupId = insertGroup.rows[0].id;
      console.log(`✅ Created Constitutional Violations group: ${groupId}`);
    }
    
    // Delete old violation-related fields (we're replacing them with a single violations field)
    const oldFieldPatterns = [
      'violation_%',
      'constitutional_%',
      '%_amendment_description',
      '%_amendment_caselaw'
    ];
    
    let deletedCount = 0;
    for (const pattern of oldFieldPatterns) {
      const deleteResult = await client.query(
        `DELETE FROM field_definitions 
         WHERE record_type_id = $1 AND slug LIKE $2
         RETURNING slug`,
        [recordTypeId, pattern]
      );
      deletedCount += deleteResult.rowCount;
      if (deleteResult.rowCount > 0) {
        console.log(`   Deleted ${deleteResult.rowCount} fields matching: ${pattern}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`\n🗑️  Removed ${deletedCount} old violation fields`);
    }
    
    // Get current max sort order
    const sortResult = await client.query(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM field_definitions WHERE record_type_id = $1',
      [recordTypeId]
    );
    let sortOrder = sortResult.rows[0].max_order + 1;
    
    // Check if violations field already exists
    const existingField = await client.query(
      `SELECT id FROM field_definitions 
       WHERE record_type_id = $1 AND slug = 'constitutional_violations'`,
      [recordTypeId]
    );
    
    if (existingField.rows.length > 0) {
      // Update existing field
      await client.query(
        `UPDATE field_definitions 
         SET field_type = 'violations',
             name = 'Constitutional Violations',
             description = 'Check applicable violations and provide descriptions with supporting case law',
             field_group_id = $2,
             config = $3,
             show_in_guest_form = true,
             show_in_review_form = true,
             show_in_validation_form = true
         WHERE record_type_id = $1 AND slug = 'constitutional_violations'`,
        [recordTypeId, groupId, JSON.stringify({
          violations: [
            { type: '1st_amendment', name: '1st Amendment', subtitle: 'Free Speech/Assembly' },
            { type: '4th_amendment', name: '4th Amendment', subtitle: 'Unreasonable Search/Seizure' },
            { type: '5th_amendment', name: '5th Amendment', subtitle: 'Due Process' },
            { type: '6th_amendment', name: '6th Amendment', subtitle: 'Right to Counsel' },
            { type: '8th_amendment', name: '8th Amendment', subtitle: 'Cruel & Unusual Punishment' },
            { type: '14th_amendment', name: '14th Amendment', subtitle: 'Equal Protection' },
            { type: 'medical_neglect', name: 'Medical Neglect', subtitle: '8th Amendment Application' },
            { type: 'excessive_force', name: 'Excessive Force', subtitle: '4th/14th Amendment Application' },
            { type: 'false_imprisonment', name: 'False Imprisonment', subtitle: 'Civil Rights Violation' },
            { type: 'civil_rights_violation', name: 'Civil Rights Violation', subtitle: '42 U.S.C. § 1983' }
          ]
        })]
      );
      console.log('\n✅ Updated existing constitutional_violations field');
    } else {
      // Create new violations field
      await client.query(
        `INSERT INTO field_definitions (
          record_type_id, field_group_id, name, slug, field_type, description,
          sort_order, show_in_guest_form, show_in_review_form, show_in_validation_form, config
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, true, $8)`,
        [
          recordTypeId,
          groupId,
          'Constitutional Violations',
          'constitutional_violations',
          'violations',
          'Check applicable violations and provide descriptions with supporting case law',
          sortOrder,
          JSON.stringify({
            violations: [
              { type: '1st_amendment', name: '1st Amendment', subtitle: 'Free Speech/Assembly' },
              { type: '4th_amendment', name: '4th Amendment', subtitle: 'Unreasonable Search/Seizure' },
              { type: '5th_amendment', name: '5th Amendment', subtitle: 'Due Process' },
              { type: '6th_amendment', name: '6th Amendment', subtitle: 'Right to Counsel' },
              { type: '8th_amendment', name: '8th Amendment', subtitle: 'Cruel & Unusual Punishment' },
              { type: '14th_amendment', name: '14th Amendment', subtitle: 'Equal Protection' },
              { type: 'medical_neglect', name: 'Medical Neglect', subtitle: '8th Amendment Application' },
              { type: 'excessive_force', name: 'Excessive Force', subtitle: '4th/14th Amendment Application' },
              { type: 'false_imprisonment', name: 'False Imprisonment', subtitle: 'Civil Rights Violation' },
              { type: 'civil_rights_violation', name: 'Civil Rights Violation', subtitle: '42 U.S.C. § 1983' }
            ]
          })
        ]
      );
      console.log('\n✅ Created new constitutional_violations field');
    }
    
    // Final count
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM field_definitions WHERE record_type_id = $1',
      [recordTypeId]
    );
    
    console.log(`\n📊 Total fields now: ${countResult.rows[0].count}`);
    console.log('\n✨ Constitutional violations field updated successfully!');
    console.log('\nThe violations field now renders as expandable checkbox cards with:');
    console.log('   • Checkbox to select each violation');
    console.log('   • Classification dropdown (Alleged/Potential/Possible/Confirmed)');
    console.log('   • Description textarea');
    console.log('   • Case law dropdown with pre-populated legal citations');
    console.log('   • Custom citation field for additional case law');
    console.log('   • "?" button to view full constitutional text');
    
  } catch (error) {
    console.error('❌ Error updating violation fields:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateViolationFields();
