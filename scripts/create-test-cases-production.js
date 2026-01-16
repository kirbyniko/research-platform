// Create test cases for all incident types in PRODUCTION
// Run with: node scripts/create-test-cases-production.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const testCases = [
  {
    incident_type: 'death_in_custody',
    subject_name: 'TEST - Death In Custody Case',
    incident_date: '2026-01-10',
    city: 'Phoenix',
    state: 'AZ',
    facility: 'Test Detention Center',
    subject_age: 35,
    subject_gender: 'male',
    subject_nationality: 'Mexico',
    subject_immigration_status: 'undocumented',
    summary: 'TEST CASE: Death in custody test for form validation',
    cause_of_death: 'Cardiac arrest',
    official_cause: 'Natural causes',
    manner_of_death: 'natural',
    custody_duration: '6 months',
    autopsy_available: true,
    medical_neglect_alleged: true,
    death_circumstances: 'Subject complained of chest pain for 3 days before death'
  },
  {
    incident_type: 'shooting',
    subject_name: 'TEST - Shooting Case',
    incident_date: '2026-01-11',
    city: 'Houston',
    state: 'TX',
    subject_age: 28,
    subject_gender: 'male',
    subject_nationality: 'Guatemala',
    subject_immigration_status: 'asylum_seeker',
    summary: 'TEST CASE: Shooting incident test for form validation',
    shooting_fatal: true,
    shots_fired: 5,
    weapon_type: 'handgun',
    victim_armed: false,
    warning_given: false,
    bodycam_available: true,
    shooting_context: 'During traffic stop, agent discharged weapon'
  },
  {
    incident_type: 'excessive_force',
    subject_name: 'TEST - Excessive Force Case',
    incident_date: '2026-01-12',
    city: 'Los Angeles',
    state: 'CA',
    subject_age: 42,
    subject_gender: 'female',
    subject_nationality: 'El Salvador',
    subject_immigration_status: 'visa_overstay',
    summary: 'TEST CASE: Excessive force test for form validation',
    force_types: ['taser', 'baton', 'chokehold'],
    injuries_sustained: 'Broken ribs, contusions, lacerations',
    victim_restrained: true,
    victim_complying: true,
    video_evidence: true,
    hospitalization_required: true
  },
  {
    incident_type: 'injury',
    subject_name: 'TEST - Injury Case',
    incident_date: '2026-01-13',
    city: 'Miami',
    state: 'FL',
    subject_age: 31,
    subject_gender: 'male',
    subject_nationality: 'Haiti',
    subject_immigration_status: 'asylum_seeker',
    summary: 'TEST CASE: Injury incident test for form validation',
    injury_type: 'fracture',
    injury_severity: 'severe',
    injury_weapon: 'blunt_object',
    injury_cause: 'During arrest, subject pushed down stairs'
  },
  {
    incident_type: 'arrest',
    subject_name: 'TEST - Arrest Case',
    incident_date: '2026-01-14',
    city: 'Seattle',
    state: 'WA',
    subject_age: 26,
    subject_gender: 'female',
    subject_nationality: 'Honduras',
    subject_immigration_status: 'visa_overstay',
    summary: 'TEST CASE: Arrest test for form validation',
    arrest_reason: 'Traffic stop escalation',
    arrest_charges: 'Obstruction of justice, resisting arrest',
    arrest_context: 'Routine traffic stop for broken taillight',
    warrant_present: false,
    selective_enforcement: true,
    timing_suspicious: true,
    pretext_arrest: true
  },
  {
    incident_type: 'medical_neglect',
    subject_name: 'TEST - Medical Neglect Case',
    incident_date: '2026-01-15',
    city: 'Denver',
    state: 'CO',
    facility: 'Test ICE Detention Facility',
    subject_age: 52,
    subject_gender: 'male',
    subject_nationality: 'Mexico',
    subject_immigration_status: 'undocumented',
    summary: 'TEST CASE: Medical neglect test for form validation',
    medical_condition: 'Diabetes, hypertension',
    treatment_denied: 'Insulin withheld for 72 hours',
    requests_documented: true,
    resulted_in_death: false
  },
  {
    incident_type: 'protest_suppression',
    subject_name: 'TEST - Protest Suppression Case',
    incident_date: '2026-01-16',
    city: 'Portland',
    state: 'OR',
    subject_age: 29,
    subject_gender: 'non_binary',
    subject_nationality: 'USA',
    subject_immigration_status: 'citizen',
    summary: 'TEST CASE: Protest suppression test for form validation',
    protest_topic: 'ICE detention conditions protest',
    protest_size: '150',
    permitted: true,
    dispersal_method: 'tear_gas',
    arrests_made: 12
  }
];

async function createTestCases() {
  console.log('Creating test cases in PRODUCTION database...\n');
  
  for (const testCase of testCases) {
    try {
      // Extract type-specific fields
      const {
        cause_of_death, official_cause, manner_of_death, custody_duration, autopsy_available, medical_neglect_alleged, death_circumstances,
        shooting_fatal, shots_fired, weapon_type, victim_armed, warning_given, bodycam_available, shooting_context,
        force_types, injuries_sustained, victim_restrained, victim_complying, video_evidence, hospitalization_required,
        injury_type, injury_severity, injury_weapon, injury_cause,
        arrest_reason, arrest_charges, arrest_context, warrant_present, selective_enforcement, timing_suspicious, pretext_arrest,
        medical_condition, treatment_denied, requests_documented, resulted_in_death,
        protest_topic, protest_size, permitted, dispersal_method, arrests_made,
        ...baseFields
      } = testCase;
      
      // Build type-specific details JSON
      let typeDetails = {};
      
      switch (testCase.incident_type) {
        case 'death_in_custody':
          typeDetails = { cause_of_death, official_cause, manner_of_death, custody_duration, autopsy_available, medical_neglect_alleged, death_circumstances };
          break;
        case 'shooting':
          typeDetails = { shooting_fatal, shots_fired, weapon_type, victim_armed, warning_given, bodycam_available, shooting_context };
          break;
        case 'excessive_force':
          typeDetails = { force_types, injuries_sustained, victim_restrained, victim_complying, video_evidence, hospitalization_required };
          break;
        case 'injury':
          typeDetails = { injury_type, injury_severity, injury_weapon, injury_cause };
          break;
        case 'arrest':
          typeDetails = { arrest_reason, arrest_charges, arrest_context, warrant_present, selective_enforcement, timing_suspicious, pretext_arrest };
          break;
        case 'medical_neglect':
          typeDetails = { medical_condition, treatment_denied, requests_documented, resulted_in_death };
          break;
        case 'protest_suppression':
          typeDetails = { protest_topic, protest_size, permitted, dispersal_method, arrests_made };
          break;
      }
      
      // Generate unique incident_id
      const incident_id = `INC-${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Insert the incident (base fields only)
      const result = await pool.query(`
        INSERT INTO incidents (
          incident_id,
          incident_type,
          subject_name,
          incident_date,
          city,
          state,
          facility,
          subject_age,
          subject_gender,
          subject_nationality,
          subject_immigration_status,
          summary,
          verification_status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', NOW())
        RETURNING id, incident_id, incident_type, subject_name
      `, [
        incident_id,
        baseFields.incident_type,
        baseFields.subject_name,
        baseFields.incident_date,
        baseFields.city,
        baseFields.state,
        baseFields.facility || null,
        baseFields.subject_age,
        baseFields.subject_gender,
        baseFields.subject_nationality,
        baseFields.subject_immigration_status,
        baseFields.summary
      ]);
      
      const row = result.rows[0];
      
      // Insert type-specific details into incident_details table
      await pool.query(`
        INSERT INTO incident_details (incident_id, detail_type, details)
        VALUES ($1, $2, $3)
        ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $3
      `, [row.id, testCase.incident_type, JSON.stringify(typeDetails)]);
      
      console.log(`✓ Created: ${row.subject_name} (Incident ID: ${row.incident_id}, Type: ${row.incident_type})`);
      
      // Add small delay to ensure unique incident_ids
      await new Promise(resolve => setTimeout(resolve, 10));
      
    } catch (error) {
      console.error(`✗ Failed to create ${testCase.subject_name}: ${error.message}`);
    }
  }
  
  console.log('\n--- Test Cases Summary ---');
  console.log('Created test cases in PRODUCTION for:');
  console.log('1. death_in_custody - Tests death details fields');
  console.log('2. shooting - Tests shooting details fields');
  console.log('3. excessive_force - Tests force types, injuries, checkboxes');
  console.log('4. injury - Tests injury-specific fields (type, severity, weapon, cause)');
  console.log('5. arrest - Tests arrest details and checkboxes');
  console.log('6. medical_neglect - Tests medical neglect section');
  console.log('7. protest_suppression - Tests protest details fields');
  console.log('\nAll cases start with "TEST -" prefix for easy identification.');
  console.log('All cases are in "pending" status for review testing.');
}

createTestCases()
  .then(async () => {
    console.log('\nDone!');
    await pool.end();
    process.exit(0);
  })
  .catch(async err => {
    console.error('Fatal error:', err);
    await pool.end();
    process.exit(1);
  });
