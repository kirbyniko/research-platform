// Create comprehensive test data: fields, records with quotes and sources
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Fields for Death/Incident Record type
const fields = [
  // Basic Information
  { name: 'Victim Name', slug: 'victim_name', type: 'text', required: true, requiresQuote: true, group: 'Basic Information' },
  { name: 'Age', slug: 'age', type: 'number', required: false, requiresQuote: true, group: 'Basic Information', config: { min: 0, max: 150 } },
  { name: 'Gender', slug: 'gender', type: 'select', required: false, requiresQuote: true, group: 'Basic Information', 
    config: { options: [{value: 'male', label: 'Male'}, {value: 'female', label: 'Female'}, {value: 'non_binary', label: 'Non-Binary'}, {value: 'unknown', label: 'Unknown'}] } },
  { name: 'Country of Origin', slug: 'country_of_origin', type: 'text', required: false, requiresQuote: true, group: 'Basic Information' },
  
  // Incident Details
  { name: 'Incident Type', slug: 'incident_type', type: 'select', required: true, requiresQuote: true, group: 'Incident Details',
    config: { options: [
      {value: 'death_in_custody', label: 'Death in Custody'},
      {value: 'death_post_deportation', label: 'Death Post-Deportation'},
      {value: 'death_during_arrest', label: 'Death During Arrest'},
      {value: 'death_during_transport', label: 'Death During Transport'},
      {value: 'suicide', label: 'Suicide'},
      {value: 'medical_neglect', label: 'Medical Neglect'},
      {value: 'use_of_force', label: 'Use of Force'}
    ]} },
  { name: 'Date of Death', slug: 'date_of_death', type: 'date', required: true, requiresQuote: true, group: 'Incident Details' },
  { name: 'Date of Death (Approximate)', slug: 'date_approximate', type: 'boolean', required: false, requiresQuote: false, group: 'Incident Details' },
  { name: 'Location (City)', slug: 'location_city', type: 'text', required: false, requiresQuote: true, group: 'Incident Details' },
  { name: 'Location (State)', slug: 'location_state', type: 'select', required: false, requiresQuote: true, group: 'Incident Details',
    config: { options: [
      {value: 'AL', label: 'Alabama'}, {value: 'AK', label: 'Alaska'}, {value: 'AZ', label: 'Arizona'}, 
      {value: 'CA', label: 'California'}, {value: 'FL', label: 'Florida'}, {value: 'GA', label: 'Georgia'},
      {value: 'IL', label: 'Illinois'}, {value: 'NY', label: 'New York'}, {value: 'TX', label: 'Texas'}
    ]} },
  { name: 'Facility Name', slug: 'facility_name', type: 'text', required: false, requiresQuote: true, group: 'Incident Details' },
  { name: 'Facility Type', slug: 'facility_type', type: 'select', required: false, requiresQuote: false, group: 'Incident Details',
    config: { options: [
      {value: 'ice_detention', label: 'ICE Detention Center'},
      {value: 'county_jail', label: 'County Jail'},
      {value: 'private_facility', label: 'Private Facility'},
      {value: 'hospital', label: 'Hospital'},
      {value: 'unknown', label: 'Unknown'}
    ]} },
  
  // Medical Information
  { name: 'Cause of Death', slug: 'cause_of_death', type: 'textarea', required: false, requiresQuote: true, group: 'Medical Information' },
  { name: 'Manner of Death', slug: 'manner_of_death', type: 'select', required: false, requiresQuote: true, group: 'Medical Information',
    config: { options: [
      {value: 'natural', label: 'Natural'},
      {value: 'accident', label: 'Accident'},
      {value: 'suicide', label: 'Suicide'},
      {value: 'homicide', label: 'Homicide'},
      {value: 'undetermined', label: 'Undetermined'},
      {value: 'pending', label: 'Pending Investigation'}
    ]} },
  { name: 'Pre-existing Medical Conditions', slug: 'medical_conditions', type: 'textarea', required: false, requiresQuote: true, group: 'Medical Information' },
  { name: 'Medical Requests Denied', slug: 'medical_requests_denied', type: 'boolean', required: false, requiresQuote: true, group: 'Medical Information' },
  { name: 'Medical Neglect Details', slug: 'medical_neglect_details', type: 'textarea', required: false, requiresQuote: true, group: 'Medical Information',
    config: { show_when: { field: 'medical_requests_denied', value: true } } },
  
  // Custody Information
  { name: 'Custody Duration', slug: 'custody_duration', type: 'text', required: false, requiresQuote: true, group: 'Custody Information' },
  { name: 'Reason for Detention', slug: 'detention_reason', type: 'textarea', required: false, requiresQuote: true, group: 'Custody Information' },
  { name: 'Immigration Status', slug: 'immigration_status', type: 'select', required: false, requiresQuote: false, group: 'Custody Information',
    config: { options: [
      {value: 'undocumented', label: 'Undocumented'},
      {value: 'asylum_seeker', label: 'Asylum Seeker'},
      {value: 'visa_overstay', label: 'Visa Overstay'},
      {value: 'green_card_holder', label: 'Green Card Holder'},
      {value: 'unknown', label: 'Unknown'}
    ]} },
  
  // Additional Details
  { name: 'Incident Description', slug: 'incident_description', type: 'rich_text', required: true, requiresQuote: false, group: 'Additional Details' },
  { name: 'Investigation Status', slug: 'investigation_status', type: 'select', required: false, requiresQuote: false, group: 'Additional Details',
    config: { options: [
      {value: 'ongoing', label: 'Ongoing'},
      {value: 'completed', label: 'Completed'},
      {value: 'no_investigation', label: 'No Investigation'},
      {value: 'unknown', label: 'Unknown'}
    ]} },
  { name: 'Family Notified', slug: 'family_notified', type: 'boolean', required: false, requiresQuote: true, group: 'Additional Details' },
  { name: 'Family Notification Delay', slug: 'family_notification_delay', type: 'text', required: false, requiresQuote: true, group: 'Additional Details',
    config: { show_when: { field: 'family_notified', value: true } } },
  { name: 'Media Coverage', slug: 'media_coverage', type: 'url', required: false, requiresQuote: false, group: 'Additional Details' },
  { name: 'Additional Notes', slug: 'additional_notes', type: 'textarea', required: false, requiresQuote: false, group: 'Additional Details' },
];

// Sample record data
const testRecord = {
  victim_name: 'Carlos Ernesto Escobar Mejia',
  age: 57,
  gender: 'male',
  country_of_origin: 'El Salvador',
  incident_type: 'death_in_custody',
  date_of_death: '2024-08-23',
  date_approximate: false,
  location_city: 'La Palma',
  location_state: 'CA',
  facility_name: 'Adelanto ICE Processing Center',
  facility_type: 'ice_detention',
  cause_of_death: 'Cardiac arrest following symptoms of chest pain and shortness of breath',
  manner_of_death: 'natural',
  medical_conditions: 'Hypertension, diabetes',
  medical_requests_denied: true,
  medical_neglect_details: 'Escobar Mejia complained of chest pain for 3 days before receiving medical attention. Staff reportedly told him to "drink water" and did not escalate his case.',
  custody_duration: '4 months',
  detention_reason: 'Unlawful entry',
  immigration_status: 'undocumented',
  incident_description: '<p>Carlos Ernesto Escobar Mejia, a 57-year-old El Salvadoran national, died on August 23, 2024, while detained at the Adelanto ICE Processing Center in California.</p><p>According to facility records, Escobar Mejia began complaining of chest pain approximately 72 hours before his death. Multiple detainees reported that facility staff dismissed his complaints and advised him to "drink more water."</p><p>On the morning of August 23, Escobar Mejia collapsed in his housing unit and was found unresponsive. Despite emergency response efforts, he was pronounced dead at 9:47 AM.</p>',
  investigation_status: 'ongoing',
  family_notified: true,
  family_notification_delay: '5 days',
  media_coverage: 'https://example.com/news/escobar-mejia-death',
  additional_notes: 'This case highlights serious concerns about medical screening and response protocols at ICE detention facilities.'
};

// Sample quotes for the record
const quotes = [
  {
    field: 'victim_name',
    text: 'ICE officials confirmed the death of Carlos Ernesto Escobar Mejia, 57, a native of El Salvador.',
    source: 'ICE Press Release',
    url: 'https://example.com/ice-press-release-082024',
    date: '2024-08-24',
    type: 'official_statement'
  },
  {
    field: 'victim_name',
    text: '"Mr. Escobar Mejia was a beloved father and husband who came to this country seeking a better life for his family."',
    source: 'Family Attorney Statement',
    url: 'https://example.com/family-attorney-statement',
    date: '2024-08-30',
    type: 'family_statement'
  },
  {
    field: 'date_of_death',
    text: 'The detainee was pronounced dead at approximately 9:47 a.m. on August 23, 2024.',
    source: 'ICE Press Release',
    url: 'https://example.com/ice-press-release-082024',
    date: '2024-08-24',
    type: 'official_statement'
  },
  {
    field: 'cause_of_death',
    text: 'Preliminary autopsy results indicate the cause of death was cardiac arrest.',
    source: 'San Bernardino County Coroner Report',
    url: 'https://example.com/coroner-report',
    date: '2024-09-05',
    type: 'medical_report'
  },
  {
    field: 'cause_of_death',
    text: 'The deceased exhibited symptoms of chest pain and shortness of breath in the days preceding his death.',
    source: 'Facility Medical Records',
    url: 'https://example.com/medical-records-foia',
    date: '2024-09-15',
    type: 'medical_report'
  },
  {
    field: 'facility_name',
    text: 'Mr. Escobar Mejia was detained at the Adelanto ICE Processing Center, operated by GEO Group.',
    source: 'ICE Detention Facility List',
    url: 'https://example.com/ice-facilities',
    date: '2024-08-01',
    type: 'official_statement'
  },
  {
    field: 'medical_requests_denied',
    text: '"He told me he went to sick call three times complaining of chest pain. Every time they just gave him Tylenol and told him to drink water."',
    source: 'Fellow Detainee Witness Statement',
    url: 'https://example.com/witness-statement-detainee-a',
    date: '2024-08-28',
    type: 'witness_statement'
  },
  {
    field: 'medical_neglect_details',
    text: 'Records show that Mr. Escobar Mejia submitted three sick call requests between August 20-22, all noting chest pain. Each request was marked as "assessed - no emergency treatment required."',
    source: 'Facility Medical Records (FOIA)',
    url: 'https://example.com/medical-records-foia',
    date: '2024-09-15',
    type: 'medical_report'
  },
  {
    field: 'medical_conditions',
    text: 'Intake screening documented pre-existing conditions including hypertension and Type 2 diabetes.',
    source: 'ICE Intake Medical Screening Form',
    url: 'https://example.com/intake-screening',
    date: '2024-04-15',
    type: 'medical_report'
  },
  {
    field: 'custody_duration',
    text: 'Mr. Escobar Mejia had been in ICE custody for approximately four months at the time of his death.',
    source: 'ICE Custody Records',
    url: 'https://example.com/custody-timeline',
    date: '2024-08-24',
    type: 'official_statement'
  },
  {
    field: 'family_notified',
    text: 'The family was not notified of Mr. Escobar Mejia\'s death until five days after the incident, despite ICE policy requiring notification within 24 hours.',
    source: 'Family Attorney Press Conference',
    url: 'https://example.com/family-attorney-presser',
    date: '2024-09-01',
    type: 'family_statement'
  },
  {
    field: 'family_notification_delay',
    text: '"We found out through a news article. Nobody from ICE contacted us directly for five days."',
    source: 'Statement from Victim\'s Daughter',
    url: 'https://example.com/daughter-statement',
    date: '2024-09-02',
    type: 'family_statement'
  }
];

// Sample sources
const sources = [
  {
    url: 'https://example.com/ice-press-release-082024',
    title: 'ICE Announces Death of Detainee at Adelanto Facility',
    type: 'official_statement',
    date: '2024-08-24',
    notes: 'Official ICE press release'
  },
  {
    url: 'https://example.com/coroner-report',
    title: 'San Bernardino County Coroner Report #2024-08-2341',
    type: 'medical_report',
    date: '2024-09-05',
    notes: 'Preliminary autopsy findings'
  },
  {
    url: 'https://example.com/medical-records-foia',
    title: 'Adelanto Facility Medical Records - FOIA Request #ICE-2024-003421',
    type: 'medical_report',
    date: '2024-09-15',
    notes: 'Released under Freedom of Information Act'
  },
  {
    url: 'https://example.com/family-attorney-statement',
    title: 'Statement from Escobar Mejia Family Legal Counsel',
    type: 'family_statement',
    date: '2024-08-30',
    notes: 'Attorney representing the family'
  }
];

async function createComprehensiveTestData() {
  try {
    console.log('🔍 Checking for existing record type...');
    
    // Check if test-form record type exists
    const rtCheck = await pool.query(
      'SELECT id FROM record_types WHERE slug = $1',
      ['test-form']
    );
    
    let recordTypeId;
    if (rtCheck.rows.length === 0) {
      console.log('❌ No test-form record type found. Please create one first at:');
      console.log('   https://research-platform-beige.vercel.app/projects/project-a/record-types/new');
      process.exit(1);
    }
    
    recordTypeId = rtCheck.rows[0].id;
    console.log(`✅ Found record type (ID: ${recordTypeId})`);
    
    // Get project ID
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1',
      ['project-a']
    );
    const projectId = projectResult.rows[0].id;
    
    // Delete existing fields
    await pool.query('DELETE FROM field_definitions WHERE record_type_id = $1', [recordTypeId]);
    console.log('🗑️  Cleared existing fields');
    
    // Create field groups
    console.log('\n📁 Creating field groups...');
    const groups = ['Basic Information', 'Incident Details', 'Medical Information', 'Custody Information', 'Additional Details'];
    const groupIds = {};
    
    for (const groupName of groups) {
      const result = await pool.query(
        `INSERT INTO field_groups (record_type_id, slug, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (record_type_id, slug) DO UPDATE 
         SET name = EXCLUDED.name
         RETURNING id`,
        [recordTypeId, groupName.toLowerCase().replace(/\s+/g, '_'), groupName, `${groupName} fields`]
      );
      groupIds[groupName] = result.rows[0].id;
      console.log(`   ✅ ${groupName} (ID: ${result.rows[0].id})`);
    }
    
    // Create fields
    console.log('\n📝 Creating fields...');
    let sortOrder = 0;
    for (const field of fields) {
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
    }
    
    console.log(`\n✅ Created ${fields.length} fields`);
    
    // Create test record
    console.log('\n📄 Creating test record...');
    const recordResult = await pool.query(
      `INSERT INTO records (
        record_type_id, project_id, data, status, is_guest_submission,
        guest_name, guest_email, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id`,
      [
        recordTypeId, projectId, JSON.stringify(testRecord), 
        'pending_review', true, 
        'Anonymous Researcher', 'researcher@example.com'
      ]
    );
    
    const recordId = recordResult.rows[0].id;
    console.log(`✅ Created record ID: ${recordId}`);
    
    // Create quotes
    console.log('\n💬 Creating quotes...');
    for (const quote of quotes) {
      await pool.query(
        `INSERT INTO record_quotes (
          record_id, project_id, quote_text, source, source_url, 
          source_date, source_type, linked_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          recordId, projectId, quote.text, quote.source, quote.url,
          quote.date, quote.type, [quote.field]
        ]
      );
    }
    console.log(`✅ Created ${quotes.length} quotes`);
    
    // Create sources
    console.log('\n🔗 Creating sources...');
    for (const source of sources) {
      await pool.query(
        `INSERT INTO record_sources (
          record_id, project_id, url, title, source_type, 
          accessed_date, notes, linked_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          recordId, projectId, source.url, source.title, source.type,
          source.date, source.notes, []
        ]
      );
    }
    console.log(`✅ Created ${sources.length} sources`);
    
    console.log('\n🎉 SUCCESS! Comprehensive test data created!');
    console.log('\n📋 Summary:');
    console.log(`   - ${fields.length} fields across ${groups.length} groups`);
    console.log(`   - 1 complete test record (ID: ${recordId})`);
    console.log(`   - ${quotes.length} quotes linked to specific fields`);
    console.log(`   - ${sources.length} source documents`);
    console.log('\n🔗 View the record at:');
    console.log(`   https://research-platform-beige.vercel.app/projects/project-a/records/${recordId}/review`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createComprehensiveTestData();
