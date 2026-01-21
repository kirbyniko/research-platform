// Add comprehensive ICE Deaths tracker fields to test-form
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Complete field set matching ICE Deaths tracker
const comprehensiveFields = [
  // Main Incident Types - hierarchical multi-select
  { name: 'Incident Types', slug: 'incident_types', type: 'checkbox_group', required: true, requiresQuote: true, group: 'Incident Details', 
    config: { options: [
      {value: 'death_in_custody', label: 'Death in Custody', category: 'Deaths'},
      {value: 'death_during_operation', label: 'Death During Operation', category: 'Deaths'},
      {value: 'death_at_protest', label: 'Death at Protest', category: 'Deaths'},
      {value: 'shooting', label: 'Shooting', category: 'Force/Violence'},
      {value: 'excessive_force', label: 'Excessive Force', category: 'Force/Violence'},
      {value: 'injury', label: 'Injury', category: 'Force/Violence'},
      {value: 'arrest_detention', label: 'Arrest/Detention', category: 'Enforcement'},
      {value: 'deportation', label: 'Deportation', category: 'Enforcement'},
      {value: 'workplace_raid', label: 'Workplace Raid', category: 'Enforcement'},
      {value: 'family_separation', label: 'Family Separation', category: 'Enforcement'},
      {value: 'rights_violation', label: 'Rights Violation', category: 'Rights Issues'},
      {value: 'protest_suppression', label: 'Protest Suppression', category: 'Rights Issues'},
      {value: 'retaliation', label: 'Retaliation', category: 'Rights Issues'},
      {value: 'medical_neglect_incident', label: 'Medical Neglect', category: 'Rights Issues'}
    ]} },
  
  // Summary field
  { name: 'Summary', slug: 'summary', type: 'textarea', required: true, requiresQuote: false, group: 'Incident Details' },
  
  // Tags
  { name: 'Tags', slug: 'tags', type: 'text', required: false, requiresQuote: false, group: 'Incident Details', 
    config: { help: 'Comma-separated tags for categorization' } },
  
  // === SHOOTING DETAILS ===
  { name: 'Fatal', slug: 'shooting_fatal', type: 'boolean', required: false, requiresQuote: true, group: 'Shooting Details',
    config: { show_when: { field: 'incident_types', value: 'shooting' } } },
  { name: 'Shots Fired', slug: 'shooting_shots_fired', type: 'number', required: false, requiresQuote: true, group: 'Shooting Details',
    config: { show_when: { field: 'incident_types', value: 'shooting' }, min: 0 } },
  { name: 'Weapon Type', slug: 'shooting_weapon_type', type: 'select', required: false, requiresQuote: true, group: 'Shooting Details',
    config: { 
      show_when: { field: 'incident_types', value: 'shooting' },
      options: [
        {value: 'handgun', label: 'Handgun'},
        {value: 'rifle', label: 'Rifle'},
        {value: 'shotgun', label: 'Shotgun'},
        {value: 'unknown', label: 'Unknown'}
      ]
    } },
  { name: 'Victim Armed', slug: 'shooting_victim_armed', type: 'boolean', required: false, requiresQuote: true, group: 'Shooting Details',
    config: { show_when: { field: 'incident_types', value: 'shooting' } } },
  { name: 'Warning Given', slug: 'shooting_warning_given', type: 'boolean', required: false, requiresQuote: true, group: 'Shooting Details',
    config: { show_when: { field: 'incident_types', value: 'shooting' } } },
  { name: 'Bodycam Available', slug: 'shooting_bodycam', type: 'boolean', required: false, requiresQuote: true, group: 'Shooting Details',
    config: { show_when: { field: 'incident_types', value: 'shooting' } } },
  { name: 'Shooting Context', slug: 'shooting_context', type: 'textarea', required: false, requiresQuote: false, group: 'Shooting Details',
    config: { show_when: { field: 'incident_types', value: 'shooting' } } },
  
  // === DEATH DETAILS ===
  { name: 'Autopsy Available', slug: 'death_autopsy_available', type: 'boolean', required: false, requiresQuote: true, group: 'Death Details',
    config: { show_when: { field: 'incident_types', value: ['death_in_custody', 'death_during_operation', 'death_at_protest'] } } },
  { name: 'Medical Neglect Alleged', slug: 'death_medical_neglect', type: 'boolean', required: false, requiresQuote: true, group: 'Death Details',
    config: { show_when: { field: 'incident_types', value: ['death_in_custody', 'death_during_operation', 'death_at_protest'] } } },
  { name: 'Death Circumstances', slug: 'death_circumstances', type: 'textarea', required: false, requiresQuote: false, group: 'Death Details',
    config: { show_when: { field: 'incident_types', value: ['death_in_custody', 'death_during_operation', 'death_at_protest'] } } },
  
  // === ARREST DETAILS ===
  { name: 'Arrest Reason', slug: 'arrest_reason', type: 'text', required: false, requiresQuote: true, group: 'Arrest Details',
    config: { show_when: { field: 'incident_types', value: 'arrest_detention' } } },
  { name: 'Charges', slug: 'arrest_charges', type: 'textarea', required: false, requiresQuote: true, group: 'Arrest Details',
    config: { show_when: { field: 'incident_types', value: 'arrest_detention' } } },
  { name: 'Warrant Present', slug: 'arrest_warrant', type: 'boolean', required: false, requiresQuote: true, group: 'Arrest Details',
    config: { show_when: { field: 'incident_types', value: 'arrest_detention' } } },
  { name: 'Selective Enforcement', slug: 'arrest_selective', type: 'boolean', required: false, requiresQuote: true, group: 'Arrest Details',
    config: { show_when: { field: 'incident_types', value: 'arrest_detention' } } },
  { name: 'Timing Suspicious', slug: 'arrest_timing_suspicious', type: 'boolean', required: false, requiresQuote: true, group: 'Arrest Details',
    config: { show_when: { field: 'incident_types', value: 'arrest_detention' } } },
  { name: 'Pretext Arrest', slug: 'arrest_pretext', type: 'boolean', required: false, requiresQuote: true, group: 'Arrest Details',
    config: { show_when: { field: 'incident_types', value: 'arrest_detention' } } },
  { name: 'Arrest Context', slug: 'arrest_context', type: 'textarea', required: false, requiresQuote: false, group: 'Arrest Details',
    config: { show_when: { field: 'incident_types', value: 'arrest_detention' } } },
  
  // === EXCESSIVE FORCE / INJURY DETAILS ===
  { name: 'Force Types Used', slug: 'force_types', type: 'checkbox_group', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { 
      show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] },
      options: [
        {value: 'physical', label: 'Physical'},
        {value: 'taser', label: 'Taser'},
        {value: 'pepper_spray', label: 'Pepper Spray'},
        {value: 'baton', label: 'Baton'},
        {value: 'rubber_bullets', label: 'Rubber Bullets'},
        {value: 'chokehold', label: 'Chokehold'},
        {value: 'knee_on_neck', label: 'Knee on Neck'},
        {value: 'firearm', label: 'Firearm'}
      ]
    } },
  { name: 'Injuries Sustained', slug: 'force_injuries', type: 'textarea', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  { name: 'Victim Restrained', slug: 'force_restrained', type: 'boolean', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  { name: 'Victim Complying', slug: 'force_complying', type: 'boolean', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  { name: 'Video Evidence Available', slug: 'force_video', type: 'boolean', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  { name: 'Hospitalization Required', slug: 'force_hospitalization', type: 'boolean', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  { name: 'Injury Type', slug: 'force_injury_type', type: 'text', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  { name: 'Injury Severity', slug: 'force_injury_severity', type: 'select', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { 
      show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] },
      options: [
        {value: 'minor', label: 'Minor'},
        {value: 'moderate', label: 'Moderate'},
        {value: 'serious', label: 'Serious'},
        {value: 'life_threatening', label: 'Life Threatening'},
        {value: 'fatal', label: 'Fatal'}
      ]
    } },
  { name: 'Weapon Used by Officer', slug: 'force_weapon', type: 'text', required: false, requiresQuote: true, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  { name: 'Force Cause/Context', slug: 'force_context', type: 'textarea', required: false, requiresQuote: false, group: 'Force/Injury Details',
    config: { show_when: { field: 'incident_types', value: ['excessive_force', 'injury'] } } },
  
  // === MEDICAL NEGLECT DETAILS ===
  { name: 'Medical Condition Reported', slug: 'neglect_condition', type: 'textarea', required: false, requiresQuote: true, group: 'Medical Neglect Details',
    config: { show_when: { field: 'incident_types', value: 'medical_neglect_incident' } } },
  { name: 'Treatment Denied', slug: 'neglect_treatment_denied', type: 'textarea', required: false, requiresQuote: true, group: 'Medical Neglect Details',
    config: { show_when: { field: 'incident_types', value: 'medical_neglect_incident' } } },
  { name: 'Requests Documented', slug: 'neglect_requests_documented', type: 'boolean', required: false, requiresQuote: true, group: 'Medical Neglect Details',
    config: { show_when: { field: 'incident_types', value: 'medical_neglect_incident' } } },
  { name: 'Resulted in Death', slug: 'neglect_resulted_death', type: 'boolean', required: false, requiresQuote: true, group: 'Medical Neglect Details',
    config: { show_when: { field: 'incident_types', value: 'medical_neglect_incident' } } },
  
  // === PROTEST SUPPRESSION DETAILS ===
  { name: 'Protest Topic', slug: 'protest_topic', type: 'text', required: false, requiresQuote: true, group: 'Protest Details',
    config: { show_when: { field: 'incident_types', value: 'protest_suppression' } } },
  { name: 'Protest Size', slug: 'protest_size', type: 'select', required: false, requiresQuote: true, group: 'Protest Details',
    config: { 
      show_when: { field: 'incident_types', value: 'protest_suppression' },
      options: [
        {value: 'small', label: '<50'},
        {value: 'medium', label: '50-100'},
        {value: 'large', label: '100-500'},
        {value: 'very_large', label: '500+'}
      ]
    } },
  { name: 'Permit Obtained', slug: 'protest_permit', type: 'boolean', required: false, requiresQuote: true, group: 'Protest Details',
    config: { show_when: { field: 'incident_types', value: 'protest_suppression' } } },
  { name: 'Dispersal Methods', slug: 'protest_dispersal', type: 'checkbox_group', required: false, requiresQuote: true, group: 'Protest Details',
    config: { 
      show_when: { field: 'incident_types', value: 'protest_suppression' },
      options: [
        {value: 'tear_gas', label: 'Tear Gas'},
        {value: 'pepper_spray', label: 'Pepper Spray'},
        {value: 'rubber_bullets', label: 'Rubber Bullets'},
        {value: 'flashbang', label: 'Flashbang'},
        {value: 'batons', label: 'Batons'},
        {value: 'sound_cannons', label: 'Sound Cannons'},
        {value: 'water_cannon', label: 'Water Cannon'},
        {value: 'mounted_police', label: 'Mounted Police'},
        {value: 'mass_arrest', label: 'Mass Arrest'},
        {value: 'other', label: 'Other'}
      ]
    } },
  { name: 'Arrests Made', slug: 'protest_arrests', type: 'number', required: false, requiresQuote: true, group: 'Protest Details',
    config: { show_when: { field: 'incident_types', value: 'protest_suppression' }, min: 0 } },
  
  // === CONSTITUTIONAL VIOLATIONS (Expanded) ===
  { name: '4th Amendment Description', slug: 'violation_4th_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '4th_amendment' } } },
  { name: '4th Amendment Case Law', slug: 'violation_4th_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '4th_amendment' } } },
  
  { name: '5th Amendment Description', slug: 'violation_5th_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '5th_amendment' } } },
  { name: '5th Amendment Case Law', slug: 'violation_5th_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '5th_amendment' } } },
  
  { name: '8th Amendment Description', slug: 'violation_8th_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '8th_amendment' } } },
  { name: '8th Amendment Case Law', slug: 'violation_8th_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '8th_amendment' } } },
  
  { name: '14th Amendment Description', slug: 'violation_14th_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '14th_amendment' } } },
  { name: '14th Amendment Case Law', slug: 'violation_14th_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '14th_amendment' } } },
  
  { name: '1st Amendment Description', slug: 'violation_1st_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '1st_amendment' } } },
  { name: '1st Amendment Case Law', slug: 'violation_1st_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: '1st_amendment' } } },
  
  { name: 'Medical Neglect Violation Description', slug: 'violation_medical_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'medical_neglect' } } },
  { name: 'Medical Neglect Case Law', slug: 'violation_medical_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'medical_neglect' } } },
  
  { name: 'Excessive Force Violation Description', slug: 'violation_force_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'excessive_force' } } },
  { name: 'Excessive Force Case Law', slug: 'violation_force_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'excessive_force' } } },
  
  { name: 'False Imprisonment Description', slug: 'violation_imprisonment_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'false_imprisonment' } } },
  { name: 'False Imprisonment Case Law', slug: 'violation_imprisonment_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'false_imprisonment' } } },
  
  { name: 'Civil Rights Violation Description', slug: 'violation_civilrights_description', type: 'textarea', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'civil_rights' } } },
  { name: 'Civil Rights Case Law', slug: 'violation_civilrights_caselaw', type: 'text', required: false, requiresQuote: false, group: 'Constitutional Violations',
    config: { show_when: { field: 'legal_violations', value: 'civil_rights' } } },
];

async function addComprehensiveFields() {
  try {
    console.log('📋 Adding comprehensive ICE Deaths tracker fields...\n');
    
    // Get record type
    const rtResult = await pool.query('SELECT id FROM record_types WHERE slug = $1', ['test-form']);
    if (rtResult.rows.length === 0) {
      console.log('❌ test-form record type not found');
      process.exit(1);
    }
    const recordTypeId = rtResult.rows[0].id;
    
    // Get existing groups
    const existingGroupsResult = await pool.query(
      'SELECT id, name FROM field_groups WHERE record_type_id = $1',
      [recordTypeId]
    );
    const groupIds = {};
    existingGroupsResult.rows.forEach(row => {
      groupIds[row.name] = row.id;
    });
    
    // Create missing groups
    const newGroups = ['Shooting Details', 'Death Details', 'Arrest Details', 'Force/Injury Details', 'Medical Neglect Details', 'Protest Details'];
    for (const groupName of newGroups) {
      if (!groupIds[groupName]) {
        const result = await pool.query(
          `INSERT INTO field_groups (record_type_id, slug, name, description)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [recordTypeId, groupName.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_'), groupName, `${groupName} fields`]
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
    console.log('\n📝 Adding comprehensive fields...');
    let added = 0;
    let skipped = 0;
    
    for (const field of comprehensiveFields) {
      // Check if field already exists
      const existsResult = await pool.query(
        'SELECT id FROM field_definitions WHERE record_type_id = $1 AND slug = $2',
        [recordTypeId, field.slug]
      );
      
      if (existsResult.rows.length > 0) {
        skipped++;
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
    
    console.log(`\n🎉 Added ${added} new fields! (${skipped} already existed)`);
    console.log('\n📊 Total fields now:');
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count FROM field_definitions WHERE record_type_id = $1',
      [recordTypeId]
    );
    console.log(`   ${totalResult.rows[0].count} fields in test-form`);
    
    console.log('\n✨ New type-specific sections added:');
    console.log('   • Shooting Details (8 fields)');
    console.log('   • Death Details (3 fields)');
    console.log('   • Arrest Details (7 fields)');
    console.log('   • Force/Injury Details (10 fields)');
    console.log('   • Medical Neglect Details (4 fields)');
    console.log('   • Protest Suppression Details (5 fields)');
    console.log('   • Expanded Constitutional Violations (18 fields)');
    console.log('   • Summary, Tags, Incident Types (3 fields)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

addComprehensiveFields();
