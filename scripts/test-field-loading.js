/**
 * Test script to verify field loading for the supreme test case
 * Run with: node scripts/test-field-loading.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function testFieldLoading() {
  const client = await pool.connect();
  
  try {
    const incidentId = 82; // Supreme test case
    
    console.log('\\n=== TESTING FIELD LOADING FOR SUPREME TEST CASE (ID 82) ===\\n');
    
    // 1. Fetch from incidents table
    const incidentResult = await client.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
    const incident = incidentResult.rows[0];
    
    if (!incident) {
      console.log('❌ Supreme test case (ID 82) not found!');
      return;
    }
    
    console.log('✓ Incident found:', incident.subject_name);
    console.log('  incident_types:', incident.incident_types);
    
    // 2. Fetch type-specific details
    const detailsResult = await client.query('SELECT * FROM incident_details WHERE incident_id = $1', [incidentId]);
    const details = detailsResult.rows;
    
    console.log('\\n--- Type-Specific Details ---');
    console.log(`Found ${details.length} detail rows`);
    
    // Combine all details into one object (like the API does)
    const combinedDetails = {};
    for (const row of details) {
      Object.assign(combinedDetails, row.details);
    }
    
    // 3. Check for each type section's fields
    const typeSections = [
      {
        title: 'Shooting',
        fields: ['shooting_fatal', 'fatal', 'shots_fired', 'weapon_type', 'victim_armed', 'warning_given', 'bodycam_available', 'shooting_context', 'context']
      },
      {
        title: 'Death',
        fields: ['cause_of_death', 'official_cause', 'autopsy_available', 'autopsy_performed', 'medical_neglect_alleged', 'manner_of_death', 'custody_duration', 'circumstances', 'death_circumstances']
      },
      {
        title: 'Arrest',
        fields: ['arrest_reason', 'stated_reason', 'arrest_charges', 'charges', 'warrant_present', 'selective_enforcement', 'timing_suspicious', 'pretext_arrest', 'arrest_context', 'actual_context']
      },
      {
        title: 'Excessive Force',
        fields: ['force_types', 'force_type', 'injuries_sustained', 'victim_restrained', 'victim_complying', 'video_evidence', 'hospitalization_required']
      },
      {
        title: 'Injury',
        fields: ['injury_type', 'injury_severity', 'severity', 'injury_weapon', 'weapon_used', 'injury_cause', 'cause']
      },
      {
        title: 'Medical Neglect',
        fields: ['medical_condition', 'treatment_denied', 'requests_documented', 'resulted_in_death']
      },
      {
        title: 'Protest',
        fields: ['protest_topic', 'protest_size', 'permitted', 'protest_permitted', 'dispersal_method', 'arrests_made']
      }
    ];
    
    console.log('\\n--- Field Value Check ---');
    
    for (const section of typeSections) {
      console.log(`\\n${section.title}:`);
      const foundFields = [];
      const missingFields = [];
      
      for (const field of section.fields) {
        const value = combinedDetails[field];
        if (value !== undefined && value !== null && value !== '') {
          foundFields.push(`  ✓ ${field}: ${JSON.stringify(value).substring(0, 50)}`);
        } else {
          missingFields.push(`  ○ ${field}: (not set)`);
        }
      }
      
      // Show found fields first
      foundFields.forEach(f => console.log(f));
      // Show missing (some are expected - alternate names)
      if (missingFields.length > 0 && foundFields.length === 0) {
        console.log('  ⚠️ No fields found for this section!');
      }
    }
    
    // 4. Fetch agencies
    const agenciesResult = await client.query('SELECT agency FROM incident_agencies WHERE incident_id = $1', [incidentId]);
    console.log(`\\n--- Agencies (${agenciesResult.rows.length}) ---`);
    agenciesResult.rows.forEach(a => console.log(`  ✓ ${a.agency}`));
    
    // 5. Fetch violations
    const violationsResult = await client.query('SELECT violation_type FROM incident_violations WHERE incident_id = $1', [incidentId]);
    console.log(`\\n--- Violations (${violationsResult.rows.length}) ---`);
    violationsResult.rows.forEach(v => console.log(`  ✓ ${v.violation_type}`));
    
    console.log('\\n=== TEST COMPLETE ===\\n');
    
  } finally {
    client.release();
    await pool.end();
  }
}

testFieldLoading().catch(console.error);
