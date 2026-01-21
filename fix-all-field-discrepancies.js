// Comprehensive fix for ALL field discrepancies between research platform and original ICE tracker
// Based on thorough analysis of extension/sidepanel.html

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query('BEGIN');
    
    // ============================================
    // 1. FIX INCIDENT TYPES - needs individual source linking per checkbox
    // Each checkbox option should be a separate field with quotable capability
    // ============================================
    console.log('\n=== 1. Updating incident_types to use individual quotable checkboxes ===');
    
    // The incident_types field already exists, but we need to change its field_type
    // to a new type "incident_types" that renders checkboxes with individual [src] buttons
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'incident_types',
          config = $1
      WHERE record_type_id = 6 AND slug = 'incident_types'
    `, [JSON.stringify({
      options: [
        // Deaths
        { value: 'death_in_custody', label: 'Death in Custody', category: 'Deaths' },
        { value: 'death_during_operation', label: 'Death During Operation', category: 'Deaths' },
        { value: 'death_at_protest', label: 'Death at Protest', category: 'Deaths' },
        // Force/Violence
        { value: 'shooting', label: 'Shooting', category: 'Force/Violence' },
        { value: 'excessive_force', label: 'Excessive Force', category: 'Force/Violence' },
        { value: 'injury', label: 'Injury', category: 'Force/Violence' },
        // Enforcement
        { value: 'arrest_detention', label: 'Arrest/Detention', category: 'Enforcement' },
        { value: 'deportation', label: 'Deportation', category: 'Enforcement' },
        { value: 'workplace_raid', label: 'Workplace Raid', category: 'Enforcement' },
        { value: 'family_separation', label: 'Family Separation', category: 'Enforcement' },
        // Rights Issues
        { value: 'rights_violation', label: 'Rights Violation', category: 'Rights Issues' },
        { value: 'protest_suppression', label: 'Protest Suppression', category: 'Rights Issues' },
        { value: 'retaliation', label: 'Retaliation', category: 'Rights Issues' },
        { value: 'medical_neglect_incident', label: 'Medical Neglect', category: 'Rights Issues' }
      ]
    })]);
    console.log('  Updated incident_types to support per-checkbox source linking');
    
    // ============================================
    // 2. FIX DATE FIELD - "Incident Date" not "Date of Death"
    //    Remove date_approximate and date_precision (not in original)
    // ============================================
    console.log('\n=== 2. Fixing date field and removing non-original date fields ===');
    
    // Rename date_of_death to incident_date
    await pool.query(`
      UPDATE field_definitions 
      SET slug = 'incident_date', name = 'Incident Date'
      WHERE record_type_id = 6 AND slug = 'date_of_death'
    `);
    console.log('  Renamed date_of_death -> incident_date');
    
    // Delete date_approximate (not in original)
    await pool.query(`DELETE FROM field_definitions WHERE record_type_id = 6 AND slug = 'date_approximate'`);
    console.log('  Deleted date_approximate (not in original)');
    
    // Delete date_precision (not in original)
    await pool.query(`DELETE FROM field_definitions WHERE record_type_id = 6 AND slug = 'date_precision'`);
    console.log('  Deleted date_precision (not in original)');
    
    // ============================================
    // 3. FIX NATIONALITY - "Nationality" not "Country of Origin"
    // ============================================
    console.log('\n=== 3. Fixing nationality field name ===');
    
    await pool.query(`
      UPDATE field_definitions 
      SET name = 'Nationality'
      WHERE record_type_id = 6 AND slug = 'country_of_origin'
    `);
    console.log('  Renamed "Country of Origin" -> "Nationality"');
    
    // ============================================
    // 4. FIX TAGS - should be multi-select with preset options, not free text
    // ============================================
    console.log('\n=== 4. Fixing tags to use preset categories ===');
    
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'multi_select',
          config = $1
      WHERE record_type_id = 6 AND slug = 'tags'
    `, [JSON.stringify({
      options: [
        // Incident Type
        { value: 'Death in Custody', label: 'Death in Custody', category: 'Incident Type' },
        { value: 'Use of Force', label: 'Use of Force', category: 'Incident Type' },
        { value: 'Shooting', label: 'Shooting', category: 'Incident Type' },
        { value: 'Medical Neglect', label: 'Medical Neglect', category: 'Incident Type' },
        // Health/Medical
        { value: 'Mental Health Crisis', label: 'Mental Health Crisis', category: 'Health/Medical' },
        { value: 'Suicide', label: 'Suicide', category: 'Health/Medical' },
        { value: 'COVID-19', label: 'COVID-19', category: 'Health/Medical' },
        { value: 'Cardiac Event', label: 'Cardiac Event', category: 'Health/Medical' },
        { value: 'Respiratory Illness', label: 'Respiratory Illness', category: 'Health/Medical' },
        // Vulnerable Populations
        { value: 'Asylum Seeker', label: 'Asylum Seeker', category: 'Vulnerable Populations' },
        { value: 'Minor', label: 'Minor', category: 'Vulnerable Populations' },
        { value: 'Elderly', label: 'Elderly', category: 'Vulnerable Populations' },
        { value: 'DACA Recipient', label: 'DACA Recipient', category: 'Vulnerable Populations' },
        { value: 'Military Veteran', label: 'Military Veteran', category: 'Vulnerable Populations' },
        { value: 'Young Adult', label: 'Young Adult', category: 'Vulnerable Populations' },
        // Circumstances
        { value: 'Prolonged Detention', label: 'Prolonged Detention', category: 'Circumstances' },
        { value: 'Family Separation', label: 'Family Separation', category: 'Circumstances' },
        { value: 'Communication Denied', label: 'Communication Denied', category: 'Circumstances' },
        { value: 'Rapid Deterioration', label: 'Rapid Deterioration', category: 'Circumstances' },
        { value: 'In Transit', label: 'In Transit', category: 'Circumstances' },
        { value: 'Permanent Injury', label: 'Permanent Injury', category: 'Circumstances' },
        // Special Cases
        { value: 'Bystander Victim', label: 'Bystander Victim', category: 'Special Cases' },
        { value: 'Journalist', label: 'Journalist', category: 'Special Cases' },
        { value: 'Legal Observer', label: 'Legal Observer', category: 'Special Cases' },
        { value: 'Protest-Related', label: 'Protest-Related', category: 'Special Cases' },
        // Legal Issues
        { value: 'Judicial Finding', label: 'Judicial Finding', category: 'Legal Issues' },
        { value: 'Fourth Amendment', label: 'Fourth Amendment', category: 'Legal Issues' },
        { value: 'Due Process Violation', label: 'Due Process Violation', category: 'Legal Issues' },
        { value: 'Cruel & Unusual Punishment', label: 'Cruel & Unusual Punishment', category: 'Legal Issues' }
      ]
    })]);
    console.log('  Updated tags to multi_select with preset categories');
    
    // ============================================
    // 5. ADD MEDIA FIELD - for images/videos with URL + upload support
    // ============================================
    console.log('\n=== 5. Adding media field ===');
    
    // Get basic_information group id
    const groupRes = await pool.query(`
      SELECT id FROM field_groups 
      WHERE record_type_id = 6 AND slug = 'basic_information'
    `);
    const basicInfoGroupId = groupRes.rows[0]?.id;
    
    // Check if media field exists
    const mediaExists = await pool.query(`
      SELECT id FROM field_definitions 
      WHERE record_type_id = 6 AND slug = 'media'
    `);
    
    if (mediaExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, field_group_id, name, slug, field_type, sort_order, config)
        VALUES (6, $1, 'Media (Images & Videos)', 'media', 'media', 14, $2)
      `, [basicInfoGroupId, JSON.stringify({
        accept: ['image/*', 'video/*'],
        maxFileSize: { image: 10485760, video: 104857600 }, // 10MB images, 100MB videos
        description: 'Upload screenshots or videos directly, or add URLs to existing media.'
      })]);
      console.log('  Added media field');
    } else {
      console.log('  Media field already exists');
    }
    
    // ============================================
    // 6. FIX SHOOTING FIELDS - Fatal should be tri-state dropdown, not boolean
    // ============================================
    console.log('\n=== 6. Fixing shooting fields ===');
    
    // shooting_fatal: boolean -> tri_state (Yes/No/Unknown)
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'tri_state', name = 'Fatal'
      WHERE record_type_id = 6 AND slug = 'shooting_fatal'
    `);
    console.log('  Changed shooting_fatal to tri_state');
    
    // shooting_victim_armed: boolean -> tri_state
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'tri_state', name = 'Victim Armed'
      WHERE record_type_id = 6 AND slug = 'shooting_victim_armed'
    `);
    console.log('  Changed shooting_victim_armed to tri_state');
    
    // shooting_warning_given: boolean -> tri_state
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'tri_state', name = 'Warning Given'
      WHERE record_type_id = 6 AND slug = 'shooting_warning_given'
    `);
    console.log('  Changed shooting_warning_given to tri_state');
    
    // shooting_bodycam: boolean -> tri_state, rename to Bodycam Available
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'tri_state', name = 'Bodycam Available'
      WHERE record_type_id = 6 AND slug = 'shooting_bodycam'
    `);
    console.log('  Changed shooting_bodycam to tri_state');
    
    // ============================================
    // 7. ADD MISSING DEATH FIELDS - cause, manner, custody_duration
    // ============================================
    console.log('\n=== 7. Adding missing death detail fields ===');
    
    // Get death_details group id
    const deathGroupRes = await pool.query(`
      SELECT id FROM field_groups 
      WHERE record_type_id = 6 AND slug = 'death_details'
    `);
    const deathGroupId = deathGroupRes.rows[0]?.id;
    
    // Get current max sort_order for death fields
    const deathSortRes = await pool.query(`
      SELECT MAX(sort_order) as max_sort FROM field_definitions 
      WHERE record_type_id = 6 AND field_group_id = $1
    `, [deathGroupId]);
    let deathSortOrder = (deathSortRes.rows[0]?.max_sort || 20) + 1;
    
    // Add cause of death
    const causeExists = await pool.query(`
      SELECT id FROM field_definitions WHERE record_type_id = 6 AND slug = 'death_cause'
    `);
    if (causeExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, field_group_id, name, slug, field_type, sort_order, config)
        VALUES (6, $1, 'Cause of Death', 'death_cause', 'text', $2, $3)
      `, [deathGroupId, deathSortOrder++, JSON.stringify({
        placeholder: 'As stated in records',
        show_when: { field: 'incident_types', value: ['death_in_custody', 'death_during_operation', 'death_at_protest'] }
      })]);
      console.log('  Added death_cause field');
    }
    
    // Add manner of death
    const mannerExists = await pool.query(`
      SELECT id FROM field_definitions WHERE record_type_id = 6 AND slug = 'death_manner'
    `);
    if (mannerExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, field_group_id, name, slug, field_type, sort_order, config)
        VALUES (6, $1, 'Manner of Death', 'death_manner', 'select', $2, $3)
      `, [deathGroupId, deathSortOrder++, JSON.stringify({
        options: [
          { value: '', label: 'Unknown' },
          { value: 'natural', label: 'Natural' },
          { value: 'accident', label: 'Accident' },
          { value: 'suicide', label: 'Suicide' },
          { value: 'homicide', label: 'Homicide' },
          { value: 'undetermined', label: 'Undetermined' },
          { value: 'pending', label: 'Pending' }
        ],
        show_when: { field: 'incident_types', value: ['death_in_custody', 'death_during_operation', 'death_at_protest'] }
      })]);
      console.log('  Added death_manner field');
    }
    
    // Add custody duration
    const custodyExists = await pool.query(`
      SELECT id FROM field_definitions WHERE record_type_id = 6 AND slug = 'death_custody_duration'
    `);
    if (custodyExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, field_group_id, name, slug, field_type, sort_order, config)
        VALUES (6, $1, 'Custody Duration', 'death_custody_duration', 'text', $2, $3)
      `, [deathGroupId, deathSortOrder++, JSON.stringify({
        placeholder: 'e.g., 6 months',
        show_when: { field: 'incident_types', value: ['death_in_custody', 'death_during_operation', 'death_at_protest'] }
      })]);
      console.log('  Added death_custody_duration field');
    }
    
    // Fix existing death fields to tri_state
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'tri_state', name = 'Medical Neglect Alleged'
      WHERE record_type_id = 6 AND slug = 'death_medical_neglect'
    `);
    console.log('  Changed death_medical_neglect to tri_state');
    
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'tri_state', name = 'Autopsy Available'
      WHERE record_type_id = 6 AND slug = 'death_autopsy_available'
    `);
    console.log('  Changed death_autopsy_available to tri_state');
    
    // ============================================
    // 8. FIX ARREST FIELDS - tri-state dropdowns
    // ============================================
    console.log('\n=== 8. Fixing arrest fields to tri_state ===');
    
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Warrant Present' WHERE record_type_id = 6 AND slug = 'arrest_warrant'`);
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Selective Enforcement' WHERE record_type_id = 6 AND slug = 'arrest_selective'`);
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Timing Suspicious' WHERE record_type_id = 6 AND slug = 'arrest_timing_suspicious'`);
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Pretext Arrest' WHERE record_type_id = 6 AND slug = 'arrest_pretext'`);
    
    // Rename arrest fields to match original
    await pool.query(`UPDATE field_definitions SET name = 'Stated Reason' WHERE record_type_id = 6 AND slug = 'arrest_reason'`);
    await pool.query(`UPDATE field_definitions SET name = 'Charges' WHERE record_type_id = 6 AND slug = 'arrest_charges'`);
    await pool.query(`UPDATE field_definitions SET name = 'Context' WHERE record_type_id = 6 AND slug = 'arrest_context'`);
    console.log('  Fixed all arrest fields');
    
    // ============================================
    // 9. FIX FORCE/INJURY FIELDS - fix labels, add missing
    // ============================================
    console.log('\n=== 9. Fixing force/injury fields ===');
    
    // Get force group id
    const forceGroupRes = await pool.query(`
      SELECT id FROM field_groups WHERE record_type_id = 6 AND slug = 'force_details'
    `);
    const forceGroupId = forceGroupRes.rows[0]?.id;
    
    // Fix tri-state fields
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Victim Restrained' WHERE record_type_id = 6 AND slug = 'force_restrained'`);
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Victim Complying' WHERE record_type_id = 6 AND slug = 'force_complying'`);
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Video Evidence Exists' WHERE record_type_id = 6 AND slug = 'force_video'`);
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Hospitalization Required' WHERE record_type_id = 6 AND slug = 'force_hospitalization'`);
    
    // Rename force_weapon to "Weapon Used" (not "by Officer")
    await pool.query(`UPDATE field_definitions SET name = 'Weapon Used' WHERE record_type_id = 6 AND slug = 'force_weapon'`);
    
    // Rename force_injuries to "Injuries Sustained"
    await pool.query(`UPDATE field_definitions SET name = 'Injuries Sustained' WHERE record_type_id = 6 AND slug = 'force_injuries'`);
    
    // Rename force_injury_type to "Injury Type"
    await pool.query(`UPDATE field_definitions SET name = 'Injury Type' WHERE record_type_id = 6 AND slug = 'force_injury_type'`);
    
    // Rename force_context to "Cause/Context"
    await pool.query(`UPDATE field_definitions SET name = 'Cause/Context' WHERE record_type_id = 6 AND slug = 'force_context'`);
    
    console.log('  Fixed force/injury field names');
    
    // ============================================
    // 10. FIX MEDICAL NEGLECT FIELDS - tri-state dropdowns
    // ============================================
    console.log('\n=== 10. Fixing medical neglect fields ===');
    
    // Rename fields to match original
    await pool.query(`UPDATE field_definitions SET name = 'Medical Condition' WHERE record_type_id = 6 AND slug = 'neglect_condition'`);
    await pool.query(`UPDATE field_definitions SET name = 'Treatment Denied' WHERE record_type_id = 6 AND slug = 'neglect_treatment_denied'`);
    
    // Fix tri-state fields
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Requests Documented' WHERE record_type_id = 6 AND slug = 'neglect_requests_documented'`);
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Resulted in Death' WHERE record_type_id = 6 AND slug = 'neglect_resulted_death'`);
    console.log('  Fixed medical neglect fields');
    
    // ============================================
    // 11. FIX PROTEST FIELDS
    // ============================================
    console.log('\n=== 11. Fixing protest fields ===');
    
    // protest_size should be text (for "50-100" style input), not select
    await pool.query(`
      UPDATE field_definitions 
      SET field_type = 'text', name = 'Estimated Size',
          config = $1
      WHERE record_type_id = 6 AND slug = 'protest_size'
    `, [JSON.stringify({
      placeholder: 'e.g., 50-100',
      show_when: { field: 'incident_types', value: 'protest_suppression' }
    })]);
    
    // protest_permit should be tri-state
    await pool.query(`UPDATE field_definitions SET field_type = 'tri_state', name = 'Permitted' WHERE record_type_id = 6 AND slug = 'protest_permit'`);
    
    // protest_arrests should be renamed
    await pool.query(`UPDATE field_definitions SET name = 'Arrests Made' WHERE record_type_id = 6 AND slug = 'protest_arrests'`);
    
    console.log('  Fixed protest fields');
    
    // ============================================
    // 12. ADD CUSTOM FIELDS section
    // ============================================
    console.log('\n=== 12. Adding custom fields section ===');
    
    // Create custom fields group
    const customGroupExists = await pool.query(`
      SELECT id FROM field_groups WHERE record_type_id = 6 AND slug = 'custom_fields'
    `);
    
    let customGroupId;
    if (customGroupExists.rows.length === 0) {
      const res = await pool.query(`
        INSERT INTO field_groups (record_type_id, name, slug, sort_order)
        VALUES (6, 'Custom Fields', 'custom_fields', 100)
        RETURNING id
      `);
      customGroupId = res.rows[0].id;
      console.log('  Created custom_fields group');
    } else {
      customGroupId = customGroupExists.rows[0].id;
      console.log('  Custom fields group already exists');
    }
    
    // Add custom_data field (JSON field for arbitrary data)
    const customDataExists = await pool.query(`
      SELECT id FROM field_definitions WHERE record_type_id = 6 AND slug = 'custom_data'
    `);
    if (customDataExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, field_group_id, name, slug, field_type, sort_order, config)
        VALUES (6, $1, 'Custom Fields', 'custom_data', 'custom_fields', 200, $2)
      `, [customGroupId, JSON.stringify({
        description: 'Add custom fields via right-click menu or the button above'
      })]);
      console.log('  Added custom_data field');
    }
    
    // ============================================
    // 13. FIX VICTIM NAME - rename slug to 'name' for consistency with extension
    // ============================================
    console.log('\n=== 13. Fixing subject name field ===');
    
    await pool.query(`
      UPDATE field_definitions 
      SET name = 'Subject Name'
      WHERE record_type_id = 6 AND slug = 'victim_name'
    `);
    console.log('  Updated victim_name label to "Subject Name"');
    
    await pool.query('COMMIT');
    
    // ============================================
    // VERIFY FINAL STATE
    // ============================================
    console.log('\n=== VERIFICATION ===');
    const finalFields = await pool.query(`
      SELECT fd.slug, fd.name, fd.field_type, fg.name as group_name
      FROM field_definitions fd
      LEFT JOIN field_groups fg ON fd.field_group_id = fg.id
      WHERE fd.record_type_id = 6
      ORDER BY fd.sort_order
    `);
    
    console.log(`\nTotal fields: ${finalFields.rows.length}`);
    finalFields.rows.forEach((f, i) => {
      console.log(`${i + 1}. ${f.slug} (${f.field_type}) - "${f.name}" [${f.group_name || 'ungrouped'}]`);
    });
    
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
