/**
 * SUPREME TEST CASE - PRODUCTION VERSION
 * 
 * Creates test case in PRODUCTION database (from PRODUCTION_DATABASE_URL env var)
 * 
 * Usage:
 * 1. Get your production DATABASE_URL from Vercel:
 *    - Go to https://vercel.com/nikow/ice-deaths/settings/environment-variables
 *    - Copy the DATABASE_URL value
 * 2. Run: PRODUCTION_DATABASE_URL="your-url-here" node scripts/create-supreme-test-case-production.js
 * 
 * Or add PRODUCTION_DATABASE_URL to your .env.local file
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Use PRODUCTION_DATABASE_URL if provided, otherwise fail
const dbUrl = process.env.PRODUCTION_DATABASE_URL || process.env.VERCEL_DATABASE_URL;

if (!dbUrl) {
  console.error('\n❌ ERROR: No production database URL provided!');
  console.error('\nPlease set PRODUCTION_DATABASE_URL environment variable:');
  console.error('  1. Get DATABASE_URL from https://vercel.com/settings/environment-variables');
  console.error('  2. Run: $env:PRODUCTION_DATABASE_URL="your-url"; node scripts/create-supreme-test-case-production.js');
  console.error('\nOr add PRODUCTION_DATABASE_URL to your .env.local file\n');
  process.exit(1);
}

console.log('📡 Connecting to PRODUCTION database...\n');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function createSupremeTestCase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating SUPREME TEST CASE in PRODUCTION...\n');
    
    // First, get all available columns in the incidents table
    const columnsResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incidents' ORDER BY ordinal_position
    `);
    const availableColumns = columnsResult.rows.map(r => r.column_name);
    console.log('Available columns:', availableColumns.join(', '));
    console.log('');
    
    // Check if incident_types column exists
    const hasIncidentTypes = availableColumns.includes('incident_types');
    console.log(`Database has incident_types column: ${hasIncidentTypes}`);
    
    // Check incident_sources columns
    const sourcesColumnsResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incident_sources' ORDER BY ordinal_position
    `);
    const sourcesColumns = sourcesColumnsResult.rows.map(r => r.column_name);
    const hasSourcePriority = sourcesColumns.includes('source_priority');
    console.log(`Database has source_priority column: ${hasSourcePriority}`);
    console.log('');
    
    // Delete any existing supreme test case first
    const deleteResult = await client.query(`
      DELETE FROM incidents WHERE incident_id LIKE '%supreme-test%'
    `);
    if (deleteResult.rowCount > 0) {
      console.log(`✓ Deleted ${deleteResult.rowCount} existing supreme test case(s)`);
    }
    
    // =============================================
    // 1. CREATE THE MAIN INCIDENT
    // Uses ALL incident types for maximum testing
    // =============================================
    
    const baseColumns = [
      'incident_id', 'incident_type', 'incident_date', 'date_precision',
      'incident_date_end', 'victim_name', 'subject_name', 'subject_age',
      'subject_gender', 'subject_nationality', 'subject_occupation',
      'subject_immigration_status', 'city', 'state', 'facility', 'summary',
      'verified', 'verification_status', 'verification_notes', 'tags',
      'created_by'
    ];
    
    const baseValues = [
      '2026-01-16-supreme-test',                                    // incident_id
      'death_in_custody',                                           // incident_type (primary)
      '2026-01-15',                                                 // incident_date
      'exact',                                                      // date_precision
      '2026-01-16',                                                 // incident_date_end
      'Testcase, Supreme',                                          // victim_name
      'Supreme Testcase',                                           // subject_name
      35,                                                           // subject_age
      'male',                                                       // subject_gender
      'Honduras',                                                   // subject_nationality
      'Agricultural worker, community organizer',                    // subject_occupation
      'Asylum seeker with pending case',                            // subject_immigration_status
      'Phoenix',                                                    // city
      'Arizona',                                                    // state
      'La Palma Correctional Center',                               // facility
      'Supreme test case covering all fields: Subject died in ICE custody following a shooting incident during an excessive force event, with documented medical neglect and multiple rights violations. This case tests every field in the system for symmetry verification between extension and website.', // summary
      false,                                                        // verified
      'pending',                                                    // verification_status
      'Supreme test case - DO NOT PUBLISH. Used for testing all fields.', // verification_notes
      ['Test Case', 'Medical Neglect', 'Excessive Force', 'Death in Custody', 'Shooting', 'Rights Violation', 'Asylum Seeker', 'Multiple Agencies'], // tags
      1                                                             // created_by
    ];
    
    // Add incident_types if column exists - ADD ALL 14 TYPES
    let columns = [...baseColumns];
    let values = [...baseValues];
    
    if (hasIncidentTypes) {
      columns.splice(2, 0, 'incident_types'); // Insert after incident_type
      // ALL 14 incident types for comprehensive testing
      values.splice(2, 0, [
        'death_in_custody', 
        'death_during_operation', 
        'death_at_protest',
        'shooting', 
        'excessive_force', 
        'injury',
        'arrest', 
        'deportation', 
        'workplace_raid',
        'family_separation',
        'rights_violation', 
        'protest_suppression',
        'retaliation',
        'medical_neglect'
      ]);
    }
    
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const incidentResult = await client.query(
      `INSERT INTO incidents (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    
    const incidentId = incidentResult.rows[0].id;
    console.log(`✓ Created incident with ID: ${incidentId}`);
    
    // =============================================
    // 2. ADD ALL AGENCIES (every type)
    // =============================================
    
    const agencies = [
      'ice', 'ice_ere', 'ice_hsi', 'cbp', 'border_patrol', 
      'local_police', 'state_police', 'federal_marshals', 
      'dhs', 'fbi', 'private_contractor', 'national_guard', 'other', 'unknown'
    ];
    
    const agencyRoles = {
      'ice': 'Lead agency - initiated arrest and detention',
      'ice_ere': 'Enforcement and Removal Operations - conducted arrest',
      'ice_hsi': 'Homeland Security Investigations - workplace raid coordination',
      'cbp': 'Customs and Border Protection - joint operation support',
      'border_patrol': 'Border Patrol - initial apprehension assistance',
      'local_police': 'Phoenix Police Department - assisted with crowd control',
      'state_police': 'Arizona DPS - highway interdiction support',
      'federal_marshals': 'US Marshals Service - fugitive operations support',
      'dhs': 'Department of Homeland Security - oversight and coordination',
      'fbi': 'Federal Bureau of Investigation - civil rights investigation',
      'private_contractor': 'CoreCivic - La Palma Correctional Center operations',
      'national_guard': 'Arizona National Guard - border operation support',
      'other': 'Federal Protective Service - courthouse security',
      'unknown': 'Unidentified officers in plainclothes observed at scene'
    };

    for (const agency of agencies) {
      await client.query(`
        INSERT INTO incident_agencies (incident_id, agency, role)
        VALUES ($1, $2, $3)
      `, [incidentId, agency, agencyRoles[agency]]);
    }
    console.log(`✓ Added ${agencies.length} agencies (ALL TYPES)`);
    
    // =============================================
    // 3. ADD ALL VIOLATION TYPES
    // =============================================
    
    const violations = [
      { type: '4th_amendment', desc: 'Unreasonable search and seizure during arrest' },
      { type: '5th_amendment_due_process', desc: 'Denial of due process rights' },
      { type: '8th_amendment', desc: 'Cruel and unusual punishment in detention' },
      { type: '14th_amendment_equal_protection', desc: 'Discriminatory treatment based on national origin' },
      { type: '1st_amendment', desc: 'Retaliation for speaking to press' },
      { type: 'medical_neglect', desc: 'Denial of necessary medical care for 72+ hours' },
      { type: 'excessive_force', desc: 'Use of taser, baton, and firearm while restrained' }
    ];
    
    for (const v of violations) {
      await client.query(`
        INSERT INTO incident_violations (incident_id, violation_type, description, constitutional_basis)
        VALUES ($1, $2, $3, $4)
      `, [incidentId, v.type, v.desc, `Constitutional basis for ${v.type}`]);
    }
    console.log(`✓ Added ${violations.length} violations`);
    
    // =============================================
    // 4. ADD COMPREHENSIVE SOURCES (all types)
    // =============================================
    
    const sources = [
      { url: 'https://example.com/news/supreme-test-case', title: 'Test: ICE Custody Death Raises Questions', publication: 'Test News Network', type: 'news_article', priority: 'primary' },
      { url: 'https://example.com/court/case-12345', title: 'Testcase v. United States - Court Filing', publication: 'Federal Court Records', type: 'court_document', priority: 'primary' },
      { url: 'https://example.com/dhs/report-2026', title: 'DHS Internal Review Report', publication: 'Department of Homeland Security', type: 'government_report', priority: 'secondary' },
      { url: 'https://example.com/ice/statement', title: 'ICE Official Statement on Incident', publication: 'ICE Public Affairs', type: 'official_statement', priority: 'secondary' },
      { url: 'https://twitter.com/test/status/123', title: 'Witness Video - Twitter', publication: 'Social Media', type: 'social_media', priority: 'tertiary' },
      { url: 'https://example.com/aclu/press-release', title: 'ACLU Statement on Civil Rights Violations', publication: 'ACLU', type: 'press_release', priority: 'secondary' },
      { url: 'https://example.com/academic/immigration-deaths', title: 'Academic Study: Deaths in Immigration Detention', publication: 'Journal of Immigration Studies', type: 'academic_paper', priority: 'tertiary' },
      { url: 'https://youtube.com/watch?v=test123', title: 'Video Evidence - Facility Footage', publication: 'YouTube', type: 'video', priority: 'primary' }
    ];
    
    const sourceIds = [];
    for (const s of sources) {
      const sourceColumns = ['incident_id', 'url', 'title', 'publication', 'source_type'];
      const sourceValues = [incidentId, s.url, s.title, s.publication, s.type];
      
      if (hasSourcePriority) {
        sourceColumns.push('source_priority');
        sourceValues.push(s.priority);
      }
      
      const sourcePlaceholders = sourceColumns.map((_, i) => `$${i + 1}`).join(', ');
      const result = await client.query(
        `INSERT INTO incident_sources (${sourceColumns.join(', ')}) VALUES (${sourcePlaceholders}) RETURNING id`,
        sourceValues
      );
      sourceIds.push({ id: result.rows[0].id, ...s });
    }
    console.log(`✓ Added ${sources.length} sources`);
    
    // =============================================
    // 5. ADD COMPREHENSIVE QUOTES (all categories)
    // =============================================
    
    const quotes = [
      { text: 'The detainee was found unresponsive in his cell at approximately 3:47 AM on January 16, 2026.', category: 'timeline', sourceIdx: 0 },
      { text: 'ICE maintains that all protocols were followed and the death is under investigation.', category: 'official', sourceIdx: 3 },
      { text: 'The subject had requested medical attention multiple times over a 72-hour period before his death.', category: 'medical', sourceIdx: 0 },
      { text: 'The family is pursuing a wrongful death lawsuit citing multiple constitutional violations.', category: 'legal', sourceIdx: 1 },
      { text: 'Mr. Testcase had been a community organizer and agricultural worker for 15 years before his detention.', category: 'context', sourceIdx: 0 },
      { text: 'I saw them use the taser on him three times while he was already in handcuffs.', category: 'witness', sourceIdx: 4 },
      { text: 'He kept asking for a doctor. He said his chest hurt and he could not breathe properly.', category: 'victim', sourceIdx: 0 },
      { text: 'My brother called me the day before he died. He said he was scared they would not help him.', category: 'family', sourceIdx: 0 },
      { text: 'This case represents one of the clearest examples of systemic failures in immigration detention we have seen.', category: 'lawyer', sourceIdx: 5 },
      { text: 'ICE takes all deaths in custody seriously and has initiated an internal review.', category: 'agency', sourceIdx: 3 },
      { text: 'The court finds sufficient evidence to proceed with claims under the 4th, 5th, 8th, and 14th amendments.', category: 'court', sourceIdx: 1 },
      { text: 'ICE Policy Directive 11065.1 requires immediate medical evaluation when a detainee reports chest pain.', category: 'policy', sourceIdx: 2 }
    ];
    
    const quoteIds = [];
    for (const q of quotes) {
      const result = await client.query(`
        INSERT INTO incident_quotes (incident_id, quote_text, category, source_id, verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [incidentId, q.text, q.category, sourceIds[q.sourceIdx].id, false]);
      quoteIds.push({ id: result.rows[0].id, ...q });
    }
    console.log(`✓ Added ${quotes.length} quotes (all categories)`);
    
    // =============================================
    // 6. LINK QUOTES TO FIELDS
    // =============================================
    
    const quoteFieldLinks = [
      { quoteIdx: 0, field: 'incident_date' },
      { quoteIdx: 0, field: 'incident_type_death_in_custody' },
      { quoteIdx: 2, field: 'incident_type_medical_neglect' },
      { quoteIdx: 5, field: 'incident_type_excessive_force' },
      { quoteIdx: 4, field: 'victim_name' },
      { quoteIdx: 4, field: 'subject_occupation' },
      { quoteIdx: 2, field: 'death_cause' },
      { quoteIdx: 1, field: 'agency_ice' },
      { quoteIdx: 10, field: 'violation_4th_amendment' },
      { quoteIdx: 10, field: 'violation_5th_amendment_due_process' },
      { quoteIdx: 10, field: 'violation_8th_amendment' }
    ];
    
    for (const link of quoteFieldLinks) {
      await client.query(`
        INSERT INTO quote_field_links (incident_id, quote_id, field_name)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [incidentId, quoteIds[link.quoteIdx].id, link.field]);
    }
    console.log(`✓ Linked quotes to ${quoteFieldLinks.length} fields`);
    
    // =============================================
    // 7. ADD ALL TYPE-SPECIFIC DETAILS
    // =============================================
    
    // Death Details - ALL FIELDS FILLED
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'death', $2)
    `, [incidentId, JSON.stringify({
      // Primary cause
      cause_of_death: 'Cardiac arrest following prolonged medical distress',
      cause_source: 'autopsy',
      manner_of_death: 'undetermined',
      death_context: 'in_custody',
      
      // Official cause (if different)
      official_cause: 'Natural causes - cardiac event',
      official_cause_source: 'ICE statement',
      
      // Custody info
      custody_duration: '6 months, 12 days',
      facility_type: 'Private detention center',
      
      // Medical neglect indicators
      medical_requests_denied: true,
      medical_neglect_alleged: true,
      medical_care_timeline: 'Requested care at 8:00 AM Jan 14, received aspirin at 2:00 PM Jan 14, no further care until death on Jan 16',
      medical_requests_documented: true,
      
      // Autopsy
      autopsy_performed: true,
      autopsy_available: true,
      autopsy_independent: true,
      autopsy_findings: 'Cardiac arrest with contributing factors of untreated hypertension and diabetes',
      
      // Circumstances - detailed
      circumstances: 'Subject had complained of chest pain and difficulty breathing for 72+ hours before death. Multiple requests for medical attention were documented but denied or delayed. Witnesses report subject was found unresponsive in cell at approximately 3:47 AM. Medical staff arrived 15 minutes later. Subject was pronounced dead at the scene.',
      
      // Additional context
      time_of_death: '3:47 AM',
      location_in_facility: 'Cell Block C, Cell 47',
      witnesses_present: true,
      witness_count: 2,
      
      // Pre-existing conditions
      preexisting_conditions: ['Hypertension', 'Type 2 Diabetes', 'Anxiety disorder'],
      conditions_known_to_facility: true,
      medications_needed: ['Lisinopril', 'Metformin', 'Alprazolam'],
      medications_provided: false
    })]);
    console.log('✓ Added death details (ALL FIELDS)');
    
    // Shooting Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'shooting', $2)
    `, [incidentId, JSON.stringify({
      fatal: false,
      shots_fired: 3,
      shots_hit: 1,
      weapon_type: 'handgun',
      weapon_model: 'Glock 19 9mm',
      shooter_agency: 'ice_ere',
      shooter_identified: true,
      shooter_name: 'Officer Redacted (per court order)',
      shooter_badge_number: 'Withheld',
      victim_armed: false,
      victim_weapon: null,
      victim_perceived_weapon: 'Cell phone mistaken for weapon',
      bodycam_available: true,
      bodycam_released: false,
      bodycam_footage_requested: true,
      witness_count: 4,
      distance: 'Approximately 10 feet',
      warning_given: false,
      verbal_commands_given: true,
      context: 'arrest',
      lighting_conditions: 'Pre-dawn, residential area, limited street lighting',
      location: 'Subject\'s front yard',
      shooter_position: 'Standing',
      victim_position: 'Kneeling, hands raised',
      other_officers_present: 5,
      other_officers_fired: false,
      medical_response_time: '12 minutes',
      hospital_transport_time: '18 minutes'
    })]);
    console.log('✓ Added shooting details (ALL FIELDS)');
    
    // Excessive Force Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'excessive_force', $2)
    `, [incidentId, JSON.stringify({
      // Force types - ALL checked
      force_type: ['physical', 'taser', 'pepper_spray', 'baton', 'rubber_bullets', 'firearm', 'chokehold', 'knee_on_neck'],
      
      // Duration and context
      duration: 'Approximately 12 minutes',
      duration_breakdown: 'Initial physical restraint: 3 min, Taser deployment: 2 min, Pepper spray: 1 min, Continued restraint: 6 min',
      
      // Injuries
      injuries_caused: ['Taser burns on chest and back', 'Contusions from baton strikes', 'Abrasions from ground restraint', 'Temporary blindness from pepper spray', 'Petechial hemorrhaging from chokehold', 'Knee contusion'],
      injuries_sustained: 'Multiple contusions, taser burn marks, chemical burns to eyes, compression injuries to neck',
      
      // Restraint details
      restraint_type: 'handcuffs behind back, then hogtied',
      restraint_position: 'prone',
      restraint_duration: '8 minutes in prone position',
      
      // Victim state
      victim_restrained_when_force_used: true,
      victim_restrained: true,
      victim_complying: true,
      victim_verbal_compliance: 'Subject repeatedly stated "I\'m not resisting, please stop"',
      
      // Evidence
      video_evidence: true,
      video_evidence_type: ['bystander video', 'security camera', 'bodycam'],
      audio_evidence: true,
      
      // Medical aftermath
      hospitalization_required: true,
      hospital_name: 'Banner University Medical Center Phoenix',
      hospital_duration: '4 days',
      
      // Officers involved
      officers_involved: 6,
      officers_identified: 3,
      witness_count: 4,
      bystanders_present: true
    })]);
    console.log('✓ Added excessive force details (ALL FIELDS)');
    
    // Injury Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'injury', $2)
    `, [incidentId, JSON.stringify({
      injury_type: 'Multiple - gunshot wound, taser burns, contusions, chemical burns, compression injuries',
      injury_description: 'Gunshot wound to left shoulder (non-fatal), multiple taser deployment burns on torso, contusions consistent with baton strikes on arms and legs, chemical burns to eyes from pepper spray, petechial hemorrhaging indicating neck compression',
      severity: 'severe',
      severity_scale: '8/10',
      cause: 'Force used during arrest and detention',
      cause_context: 'During pre-dawn arrest at residence',
      
      // Medical treatment
      medical_treatment: 'Emergency surgery for gunshot wound, burn treatment, pain management, eye irrigation, CT scan for head trauma',
      treatment_facility: 'Banner University Medical Center Phoenix',
      treating_physician: 'Dr. Sarah Martinez (emergency), Dr. James Chen (surgery)',
      
      // Hospitalization
      hospitalized: true,
      hospitalization_duration: '4 days initial, 2 additional days after custody transfer',
      icu_required: true,
      icu_duration: '24 hours',
      
      // Lasting effects
      permanent_damage: true,
      permanent_damage_description: 'Partial loss of mobility in left shoulder, chronic pain, PTSD',
      ongoing_treatment: true,
      ongoing_treatment_type: 'Physical therapy, psychological counseling',
      
      // Weapons involved
      weapon_used: 'Handgun, taser (X26), baton, pepper spray (OC)',
      
      // Documentation
      medical_records_available: true,
      photos_documented: true
    })]);
    console.log('✓ Added injury details (ALL FIELDS)');
    
    // Arrest Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'arrest', $2)
    `, [incidentId, JSON.stringify({
      // Stated reason vs actual context
      stated_reason: 'Civil immigration violation - overstayed visa',
      actual_context: 'Arrest occurred day after subject spoke at press conference criticizing ICE',
      
      // Charges
      charges: ['Immigration violation', 'Resisting arrest (later dropped)', 'Assault on officer (later dropped)'],
      charges_dropped: true,
      charges_dropped_reason: 'Video evidence showed no resistance or assault',
      charges_dropped_date: '2026-01-25',
      
      // Warrant details
      warrant_type: 'administrative',
      warrant_present: true,
      warrant_number: 'ICE-ADM-2026-01157',
      warrant_issued_by: 'ICE Field Office Director',
      warrant_scope: 'Arrest of named individual only',
      
      // Bail/bond
      bail_amount: 'No bail - immigration hold',
      bond_hearing_date: 'None scheduled - expedited removal proceedings initiated',
      
      // Detention
      detention_location: 'La Palma Correctional Center',
      detention_duration: '6 months, 12 days',
      detention_conditions: 'General population, later moved to medical isolation',
      release_date: null,
      
      // Suspicious indicators - ALL checked
      timing_suspicious: true,
      timing_details: 'Arrested at 6:00 AM, 14 hours after press conference ended',
      pretext_arrest: true,
      pretext_evidence: 'Subject had overstayed visa for 3 months with no prior enforcement action; neighbors with similar status not arrested',
      selective_enforcement: true,
      selective_enforcement_details: 'At least 12 others in same neighborhood with similar immigration status not targeted',
      retaliation_indicators: ['Arrest day after media appearance', 'Targeted despite having pending asylum case', 'Similar violations in neighborhood not enforced'],
      
      // Attorney access
      attorney_requested: true,
      attorney_provided: false,
      attorney_delay: '48 hours before first attorney contact',
      
      // Family notification
      family_notified: true,
      family_notification_delay: '6 hours after arrest'
    })]);
    console.log('✓ Added arrest details (ALL FIELDS)');
    
    // Rights Violation Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'violation', $2)
    `, [incidentId, JSON.stringify({
      // Violation types - ALL checked
      violation_types: ['1st_amendment', '4th_amendment', '5th_amendment_due_process', '8th_amendment', '14th_amendment_equal_protection'],
      
      // Constitutional basis
      constitutional_basis: 'Tennessee v. Garner (1985), Graham v. Connor (1989), Estelle v. Gamble (1976), Mathews v. Eldridge (1976)',
      legal_precedent: 'Multiple circuit court decisions on excessive force and medical neglect in detention',
      
      // Speech/Expression related - ALL checked
      journalism_related: true,
      journalism_details: 'Subject spoke to press about detention conditions',
      speech_content: 'Subject had spoken at press conference describing conditions in detention facilities, interviewed by local TV station',
      protest_related: true,
      protest_details: 'Subject had organized and participated in immigration rights protests',
      activism_related: true,
      activism_details: 'Subject was community organizer for immigrant rights for 15 years',
      
      // Legal proceedings
      charges_filed: ['Civil rights lawsuit under 42 USC 1983', 'Bivens action', 'FTCA claim'],
      charges_dropped: false,
      lawsuit_filed: true,
      lawsuit_filing_date: '2026-01-18',
      lawsuit_case_number: '2:26-cv-00147-DJH',
      lawsuit_court: 'U.S. District Court for the District of Arizona',
      lawsuit_outcome: 'Pending',
      lawsuit_status: 'Discovery phase',
      
      // Court rulings
      court_ruling: 'Motion to dismiss denied - case proceeding to discovery',
      court_ruling_date: '2026-02-15',
      court_ruling_judge: 'Hon. Diane J. Humetewa',
      injunction_issued: false,
      injunction_requested: true,
      
      // Damages sought
      damages_sought: 'Compensatory and punitive damages, injunctive relief, attorneys fees',
      damages_amount: '$10,000,000'
    })]);
    console.log('✓ Added rights violation details (ALL FIELDS)');
    
    // Protest Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'protest', $2)
    `, [incidentId, JSON.stringify({
      protest_topic: 'Immigration detention conditions',
      protest_name: 'Justice for Detained Families Rally',
      protest_organizer: 'Coalition for Immigrant Rights Arizona',
      protest_size: 'Approximately 200 people',
      protest_size_estimate: 200,
      protest_type: 'rally',
      protest_date: '2026-01-14',
      protest_location: 'Phoenix Federal Courthouse',
      
      // Permit status
      permitted: true,
      permit_number: 'PHX-2026-0114-001',
      permit_conditions: 'Sidewalk only, no blocking entrances, 10am-4pm',
      
      // Counter-protesters
      counter_protesters: false,
      counter_protesters_count: 0,
      
      // Police response
      police_present: true,
      police_count: 25,
      police_agencies: ['Phoenix PD', 'Federal Protective Service', 'DHS'],
      
      // Dispersal
      dispersal_ordered: true,
      dispersal_time: '3:30 PM',
      dispersal_reason: 'Alleged permit violation - blocking sidewalk',
      dispersal_method: 'Pepper spray, flash bangs, mounted officers',
      dispersal_warnings: 2,
      dispersal_warning_method: 'Bullhorn announcements',
      
      // Arrests
      arrests_made: 15,
      arrests_charges: ['Failure to disperse', 'Disorderly conduct', 'Resisting arrest'],
      
      // Injuries
      injuries_reported: 8,
      injuries_type: ['Pepper spray exposure', 'Trampling', 'Baton strikes'],
      
      // Media coverage
      media_present: true,
      media_outlets: ['Local TV (3 stations)', 'AP', 'Local newspapers'],
      journalists_affected: 2,
      journalist_arrests: 1
    })]);
    console.log('✓ Added protest details (ALL FIELDS)');
    
    // Deportation Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'deportation', $2)
    `, [incidentId, JSON.stringify({
      deportation_type: 'expedited',
      deportation_order_date: '2026-01-20',
      destination_country: 'Honduras',
      destination_city: 'Tegucigalpa',
      
      // Deportation status
      deportation_attempted: true,
      deportation_attempt_date: '2026-01-22',
      deportation_completed: false,
      deportation_stayed: true,
      stay_date: '2026-01-21',
      stay_reason: 'Pending asylum case, emergency injunction',
      stay_issued_by: 'U.S. District Court for the District of Arizona',
      
      // Asylum claim
      had_asylum_claim: true,
      asylum_status: 'pending',
      asylum_filing_date: '2025-10-15',
      asylum_grounds: 'Political persecution, gang violence',
      credible_fear_interview: true,
      credible_fear_passed: true,
      
      // Family in US
      had_children_in_us: true,
      children_affected: 2,
      children_ages: [8, 12],
      children_citizenship: 'US citizens',
      children_status: 'With relatives in Phoenix',
      spouse_in_us: false,
      other_family_in_us: true,
      family_details: 'Sister (US citizen), parents (lawful permanent residents)',
      
      // Time in US
      years_in_us: 15,
      community_ties: 'Homeowner, employed, active in community organizations, children in local schools',
      
      // Legal representation
      legal_representation: true,
      attorney_name: 'Maria Rodriguez, Esq.',
      legal_organization: 'Arizona Immigrant Legal Services'
    })]);
    console.log('✓ Added deportation details (ALL FIELDS)');
    
    // Family Separation Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'family_separation', $2)
    `, [incidentId, JSON.stringify({
      // Children details
      children_affected: 2,
      children_ages: [8, 12],
      children_names: 'Names withheld for privacy',
      children_gender: ['female', 'male'],
      children_citizenship: 'US citizens',
      children_schools: 'Phoenix Unified School District',
      
      // Separation details
      separation_date: '2026-01-15',
      separation_location: 'Family home during arrest',
      separation_duration: '6 months, 12 days',
      separation_circumstances: 'Children witnessed father\'s violent arrest, were left alone until neighbor called aunt',
      
      // Child welfare
      children_placement: 'With maternal aunt in Phoenix',
      placement_type: 'family',
      cps_involvement: true,
      cps_case_number: 'AZ-DCS-2026-00891',
      foster_care_involved: false,
      
      // Reunification
      reunification_status: 'Not applicable - subject deceased',
      reunification_date: null,
      reunification_barriers: 'Subject died in custody before reunification possible',
      
      // Parent status
      parent_status: 'Deceased in custody',
      other_parent_status: 'Deceased (2023)',
      guardianship_established: true,
      guardian_name: 'Maternal aunt - Name withheld',
      
      // Legal
      legal_representation: true,
      family_attorney: 'Children\'s Law Center of Arizona',
      immigration_court_case: true,
      
      // Psychological impact
      trauma_documented: true,
      counseling_provided: true,
      counseling_provider: 'Phoenix Children\'s Behavioral Health',
      
      // Communication during separation
      visitation_allowed: false,
      phone_calls_allowed: true,
      phone_call_frequency: 'Weekly, monitored'
    })]);
    console.log('✓ Added family separation details (ALL FIELDS)');
    
    // Workplace Raid Details - ALL FIELDS
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'workplace_raid', $2)
    `, [incidentId, JSON.stringify({
      // Business info
      business_name: 'Arizona Agricultural Supply Co.',
      business_type: 'Agricultural processing',
      business_address: '1234 Industrial Blvd, Phoenix, AZ',
      business_size: 'Medium (150 employees)',
      
      // Raid details
      raid_date: '2026-01-10',
      raid_time: '6:30 AM',
      raid_duration: '4 hours',
      raid_agencies: ['ICE HSI', 'ICE ERO', 'Phoenix PD'],
      
      // Workers affected
      workers_detained: 47,
      workers_released: 12,
      workers_arrested: 35,
      workers_charged: 0,
      workers_processed: 47,
      
      // Children impact
      children_stranded: 8,
      children_notification: 'Schools notified by community organizations',
      children_pickup_delay: '3-6 hours',
      
      // Legal basis
      i9_audit: true,
      i9_audit_date: '2025-12-15',
      warrant_type: 'administrative',
      warrant_scope: 'Named individuals only (exceeded in practice)',
      
      // Notice
      advance_notice: false,
      notice_to_employer: false,
      
      // Media and community
      media_present: false,
      media_blocked: true,
      community_impact: 'Significant disruption to local agricultural operations and immigrant community',
      community_response: 'Rapid response network activated, legal observers deployed',
      
      // Employer cooperation
      employer_cooperation: 'Compelled under warrant',
      employer_charged: false,
      
      // Humanitarian concerns
      medical_emergencies: 1,
      medical_emergency_details: 'One worker had diabetic episode, delayed medical attention',
      nursing_mothers: 2,
      pregnant_workers: 1,
      
      // Legal aftermath
      lawsuits_filed: true,
      lawsuit_details: 'Class action for 4th Amendment violations'
    })]);
    console.log('✓ Added workplace raid details (ALL FIELDS)');
    
    // Medical Neglect Details - NEW SECTION
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'medical_neglect', $2)
    `, [incidentId, JSON.stringify({
      // Medical condition
      medical_condition: 'Hypertension, Type 2 Diabetes, chest pain symptoms',
      condition_severity: 'Serious - required immediate attention',
      condition_known_to_facility: true,
      condition_documented: true,
      
      // Treatment denied/delayed
      treatment_denied: 'Cardiac evaluation, blood pressure monitoring, diabetes management, pain medication',
      treatment_delay_hours: 72,
      treatment_delay_documented: true,
      
      // Requests for care
      requests_made: true,
      requests_documented: true,
      request_dates: ['2026-01-14 08:00', '2026-01-14 14:00', '2026-01-15 06:00', '2026-01-15 20:00', '2026-01-16 08:00'],
      request_count: 5,
      request_format: 'Verbal to guards, written sick call requests',
      
      // Facility response
      facility_response: 'Aspirin provided once, no further evaluation',
      response_delay: '6 hours for first response',
      medical_staff_evaluation: false,
      medical_staff_on_site: true,
      
      // Outcome
      resulted_in_death: true,
      resulted_in_permanent_injury: true,
      injury_details: 'Cardiac arrest, death',
      
      // Policy violations
      policy_violated: true,
      policies_violated: ['ICE PBNDS 4.3 Medical Care', 'NCCHC Standards', 'Facility Medical Protocol'],
      
      // Previous medical issues
      prior_medical_incidents: true,
      prior_incidents_details: 'Subject had been seen for hypertension in first month of detention, medication discontinued without explanation',
      
      // Expert opinions
      medical_expert_opinion: 'Death was preventable with timely intervention - Dr. Elena Vasquez, Independent Medical Examiner'
    })]);
    console.log('✓ Added medical neglect details (ALL FIELDS)');
    
    // Retaliation Details - NEW SECTION
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'retaliation', $2)
    `, [incidentId, JSON.stringify({
      // Protected activity
      protected_activity: 'Public speech criticizing ICE detention conditions',
      activity_date: '2026-01-14',
      activity_description: 'Press conference at Phoenix Federal Courthouse, interviewed by 3 TV stations',
      
      // Retaliation timeline
      retaliation_date: '2026-01-15',
      time_between: '14 hours',
      
      // Evidence of retaliation
      evidence_timing: true,
      evidence_statements: true,
      statements_details: 'Arresting officer reportedly said "You should have kept your mouth shut"',
      evidence_pattern: true,
      pattern_details: 'Others with same immigration status in area not targeted',
      evidence_documents: true,
      document_details: 'ICE internal emails discussing subject\'s media appearance obtained through FOIA',
      
      // Decision makers
      decision_makers_identified: true,
      decision_maker_details: 'Field Office Director approved expedited arrest order',
      
      // Retaliatory actions
      retaliatory_actions: ['Arrest', 'Expedited removal proceedings', 'Denial of bond', 'Transfer to remote facility', 'Restricted communication'],
      
      // Legal claims
      retaliation_lawsuit: true,
      first_amendment_claim: true,
      bivens_claim: true
    })]);
    console.log('✓ Added retaliation details (ALL FIELDS)');
    
    // Protest Suppression Details - NEW SECTION
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'protest_suppression', $2)
    `, [incidentId, JSON.stringify({
      // Protest info
      protest_type: 'Immigration rights rally',
      protest_date: '2026-01-14',
      protest_location: 'Phoenix Federal Courthouse',
      estimated_participants: 200,
      
      // Suppression tactics
      tactics_used: ['Pepper spray', 'Flash bangs', 'Mounted police charges', 'Mass arrests', 'Kettling'],
      tactics_justification: 'Alleged permit violation',
      excessive_response: true,
      
      // Targeting
      organizers_targeted: true,
      organizer_arrests: 3,
      journalists_targeted: true,
      journalist_arrests: 1,
      legal_observers_targeted: true,
      legal_observer_interference: 'Blocked from documenting arrests',
      
      // Equipment seizure
      equipment_seized: true,
      equipment_details: 'Cell phones, cameras, signs, megaphone',
      equipment_returned: false,
      
      // Communication interference
      communication_jammed: false,
      social_media_monitored: true,
      
      // Legal aftermath
      charges_filed: 15,
      charges_dropped: 12,
      charges_dismissed_reason: 'Lack of evidence, First Amendment concerns',
      civil_suits_filed: 5
    })]);
    console.log('✓ Added protest suppression details (ALL FIELDS)');
    
    // =============================================
    // 8. ADD COMPREHENSIVE TIMELINE
    // =============================================
    
    const timelineEntries = [
      { date: '2025-07-01', desc: 'Subject enters the United States on tourist visa', order: 1 },
      { date: '2025-10-01', desc: 'Visa expires; subject files asylum application', order: 2 },
      { date: '2026-01-14', desc: 'Subject speaks at press conference about detention conditions', order: 3 },
      { date: '2026-01-15', desc: '6:00 AM - ICE arrives at subject residence with administrative warrant', order: 4 },
      { date: '2026-01-15', desc: '6:15 AM - Subject arrested; force used including taser and baton', order: 5 },
      { date: '2026-01-15', desc: '6:20 AM - Officer discharges firearm, striking subject in shoulder', order: 6 },
      { date: '2026-01-15', desc: '7:30 AM - Subject transported to hospital for gunshot wound', order: 7 },
      { date: '2026-01-15', desc: '2:00 PM - Subject transferred to La Palma Correctional Center', order: 8 },
      { date: '2026-01-15', desc: '8:00 PM - Subject first reports chest pain to guards', order: 9 },
      { date: '2026-01-16', desc: '8:00 AM - Subject requests medical attention (documented)', order: 10 },
      { date: '2026-01-16', desc: '2:00 PM - Subject given aspirin, no further evaluation', order: 11 },
      { date: '2026-01-16', desc: '10:00 PM - Subject found unresponsive in cell', order: 12 },
      { date: '2026-01-16', desc: '10:47 PM - Subject pronounced dead', order: 13 },
      { date: '2026-01-18', desc: 'Family files wrongful death lawsuit', order: 14 },
      { date: '2026-01-20', desc: 'Independent autopsy commissioned by family', order: 15 }
    ];
    
    for (const t of timelineEntries) {
      await client.query(`
        INSERT INTO incident_timeline (incident_id, event_date, description, sequence_order, source_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [incidentId, t.date, t.desc, t.order, sourceIds[0].id]);
    }
    console.log(`✓ Added ${timelineEntries.length} timeline entries`);
    
    // =============================================
    // 9. ADD MEDIA
    // =============================================
    
    // Check incident_media columns
    const mediaColumnsResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incident_media'
    `);
    const mediaColumns = mediaColumnsResult.rows.map(r => r.column_name);
    const hasVerifiedColumn = mediaColumns.includes('verified');
    
    if (hasVerifiedColumn) {
      await client.query(`
        INSERT INTO incident_media (incident_id, url, media_type, description, verified)
        VALUES 
          ($1, 'https://example.com/images/test-case-1.jpg', 'image', 'Booking photo (with consent)', false),
          ($1, 'https://example.com/images/test-case-2.jpg', 'image', 'Facility exterior', false),
          ($1, 'https://example.com/images/test-case-3.jpg', 'image', 'Protest rally before arrest', false),
          ($1, 'https://youtube.com/watch?v=test123', 'video', 'Witness video of arrest', false),
          ($1, 'https://example.com/video/press-conference.mp4', 'video', 'Press conference footage', false)
      `, [incidentId]);
    } else {
      await client.query(`
        INSERT INTO incident_media (incident_id, url, media_type, description)
        VALUES 
          ($1, 'https://example.com/images/test-case-1.jpg', 'image', 'Booking photo (with consent)'),
          ($1, 'https://example.com/images/test-case-2.jpg', 'image', 'Facility exterior'),
          ($1, 'https://example.com/images/test-case-3.jpg', 'image', 'Protest rally before arrest'),
          ($1, 'https://youtube.com/watch?v=test123', 'video', 'Witness video of arrest'),
          ($1, 'https://example.com/video/press-conference.mp4', 'video', 'Press conference footage')
      `, [incidentId]);
    }
    console.log('✓ Added 5 media items (3 images, 2 videos)');
    
    await client.query('COMMIT');
    
    console.log('\n========================================');
    console.log('✅ SUPREME TEST CASE CREATED IN PRODUCTION');
    console.log('========================================');
    console.log(`\nIncident ID: ${incidentId}`);
    console.log('Incident Reference: 2026-01-16-supreme-test');
    console.log('\nThis case includes:');
    console.log('  • ALL 14 incident types checked');
    console.log('  • ALL 14 agencies (every type)');
    console.log('  • 7 constitutional violations with details');
    console.log('  • 8 sources (all source types)');
    console.log('  • 12 quotes (all quote categories)');
    console.log('  • Quote-field links for verification testing');
    console.log('  • 12 type-specific detail sections (ALL FIELDS POPULATED):');
    console.log('      - Death details (with official cause, autopsy, medical neglect)');
    console.log('      - Shooting details');
    console.log('      - Excessive force (ALL force types checked)');
    console.log('      - Injury details');
    console.log('      - Arrest details (all checkboxes)');
    console.log('      - Rights violation (all types checked)');
    console.log('      - Protest details');
    console.log('      - Deportation details');
    console.log('      - Family separation details');
    console.log('      - Workplace raid details');
    console.log('      - Medical neglect details (NEW)');
    console.log('      - Retaliation details (NEW)');
    console.log('      - Protest suppression details (NEW)');
    console.log('  • 15 timeline entries');
    console.log('  • 5 media items');
    console.log('  • All basic fields populated');
    console.log('\n📡 Test this case at:');
    console.log(`  • https://ice-deaths.vercel.app/dashboard/review/${incidentId}`);
    console.log(`  • Extension: Load case ID ${incidentId}`);
    console.log('\n✨ Case is now visible in production dashboard!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating test case:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSupremeTestCase();
