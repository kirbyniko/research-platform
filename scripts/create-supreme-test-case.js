/**
 * SUPREME TEST CASE
 * 
 * This script creates a comprehensive test incident that uses EVERY field
 * in the system. Use this for testing symmetry between extension and website,
 * and for maximum coverage testing.
 * 
 * Run with: node scripts/create-supreme-test-case.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

async function createSupremeTestCase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating SUPREME TEST CASE...\n');
    
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
    
    // Add incident_types if column exists
    let columns = [...baseColumns];
    let values = [...baseValues];
    
    if (hasIncidentTypes) {
      columns.splice(2, 0, 'incident_types'); // Insert after incident_type
      values.splice(2, 0, ['death_in_custody', 'excessive_force', 'medical_neglect', 'shooting', 'rights_violation']);
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
      'dhs', 'fbi', 'private_contractor'
    ];
    
    for (const agency of agencies) {
      await client.query(`
        INSERT INTO incident_agencies (incident_id, agency, role)
        VALUES ($1, $2, $3)
      `, [incidentId, agency, `Involved in ${agency.toUpperCase()} capacity`]);
    }
    console.log(`✓ Added ${agencies.length} agencies`);
    
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
      const result = await client.query(`
        INSERT INTO incident_sources (incident_id, url, title, publication, source_type, source_priority)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [incidentId, s.url, s.title, s.publication, s.type, s.priority]);
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
    
    // Death Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'death', $2)
    `, [incidentId, JSON.stringify({
      cause_of_death: 'Cardiac arrest following prolonged medical distress',
      cause_source: 'autopsy',
      manner_of_death: 'undetermined',
      death_context: 'in_custody',
      custody_duration: '6 months, 12 days',
      medical_requests_denied: true,
      medical_care_timeline: 'Requested care at 8:00 AM Jan 14, received aspirin at 2:00 PM Jan 14, no further care until death on Jan 16',
      autopsy_performed: true,
      autopsy_independent: true,
      circumstances: 'Subject had complained of chest pain and difficulty breathing for 72+ hours before death. Multiple requests for medical attention were documented but denied or delayed.'
    })]);
    console.log('✓ Added death details');
    
    // Shooting Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'shooting', $2)
    `, [incidentId, JSON.stringify({
      fatal: false,
      shots_fired: 3,
      shots_hit: 1,
      weapon_type: 'handgun',
      shooter_agency: 'ice_ere',
      shooter_identified: true,
      shooter_name: 'Officer Redacted (per court order)',
      victim_armed: false,
      victim_weapon: null,
      bodycam_available: true,
      bodycam_released: false,
      witness_count: 4,
      distance: 'Approximately 10 feet',
      warning_given: false,
      context: 'arrest'
    })]);
    console.log('✓ Added shooting details');
    
    // Excessive Force Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'excessive_force', $2)
    `, [incidentId, JSON.stringify({
      force_type: ['taser', 'baton', 'physical', 'pepper_spray', 'chokehold'],
      duration: 'Approximately 12 minutes',
      injuries_caused: ['Taser burns on chest and back', 'Contusions from baton strikes', 'Abrasions from ground restraint', 'Temporary blindness from pepper spray'],
      restraint_type: 'handcuffs behind back, then hogtied',
      victim_restrained_when_force_used: true,
      victim_complying: true,
      video_evidence: true,
      witness_count: 4,
      hospitalization_required: true
    })]);
    console.log('✓ Added excessive force details');
    
    // Injury Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'injury', $2)
    `, [incidentId, JSON.stringify({
      injury_type: 'Multiple - gunshot wound, taser burns, contusions',
      injury_description: 'Gunshot wound to left shoulder (non-fatal), multiple taser deployment burns on torso, contusions consistent with baton strikes on arms and legs',
      severity: 'severe',
      cause: 'Force used during arrest and detention',
      medical_treatment: 'Emergency surgery for gunshot wound, burn treatment, pain management',
      hospitalized: true,
      permanent_damage: true,
      weapon_used: 'Handgun, taser, baton, pepper spray'
    })]);
    console.log('✓ Added injury details');
    
    // Arrest Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'arrest', $2)
    `, [incidentId, JSON.stringify({
      stated_reason: 'Civil immigration violation - overstayed visa',
      actual_context: 'Arrest occurred day after subject spoke at press conference criticizing ICE',
      charges: ['Immigration violation', 'Resisting arrest (later dropped)', 'Assault on officer (later dropped)'],
      charges_dropped: true,
      charges_dropped_reason: 'Video evidence showed no resistance or assault',
      bail_amount: 'No bail - immigration hold',
      detention_location: 'La Palma Correctional Center',
      detention_duration: '6 months, 12 days',
      release_date: null,
      warrant_type: 'administrative',
      timing_suspicious: true,
      pretext_arrest: true,
      selective_enforcement: true,
      retaliation_indicators: ['Arrest day after media appearance', 'Targeted despite having pending asylum case', 'Similar violations in neighborhood not enforced']
    })]);
    console.log('✓ Added arrest details');
    
    // Rights Violation Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'violation', $2)
    `, [incidentId, JSON.stringify({
      violation_types: ['4th_amendment', '5th_amendment', '8th_amendment', '14th_amendment', '1st_amendment'],
      constitutional_basis: 'Tennessee v. Garner (1985), Graham v. Connor (1989), Estelle v. Gamble (1976)',
      legal_precedent: 'Multiple circuit court decisions on excessive force and medical neglect in detention',
      journalism_related: true,
      speech_content: 'Subject had spoken at press conference describing conditions in detention facilities',
      protest_related: true,
      activism_related: true,
      charges_filed: ['Civil rights lawsuit under 42 USC 1983'],
      charges_dropped: false,
      lawsuit_filed: true,
      lawsuit_outcome: 'Pending',
      court_ruling: 'Motion to dismiss denied - case proceeding to discovery',
      injunction_issued: false
    })]);
    console.log('✓ Added rights violation details');
    
    // Protest Details (for death_at_protest overlap)
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'protest', $2)
    `, [incidentId, JSON.stringify({
      protest_topic: 'Immigration detention conditions',
      protest_size: 'Approximately 200 people',
      protest_type: 'rally',
      permitted: true,
      counter_protesters: false,
      dispersal_ordered: true,
      dispersal_method: 'Pepper spray, flash bangs, mounted officers',
      arrests_made: 15,
      injuries_reported: 8
    })]);
    console.log('✓ Added protest details');
    
    // Deportation Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'deportation', $2)
    `, [incidentId, JSON.stringify({
      deportation_type: 'expedited',
      destination_country: 'Honduras',
      deportation_attempted: true,
      deportation_completed: false,
      deportation_stayed: true,
      stay_reason: 'Pending asylum case, emergency injunction',
      had_asylum_claim: true,
      asylum_status: 'pending',
      had_children_in_us: true,
      children_affected: 2,
      children_status: 'With relatives in Phoenix'
    })]);
    console.log('✓ Added deportation details');
    
    // Family Separation Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'family_separation', $2)
    `, [incidentId, JSON.stringify({
      children_affected: 2,
      children_ages: [8, 12],
      separation_duration: '6 months, 12 days',
      reunification_status: 'Not applicable - subject deceased',
      children_placement: 'With maternal aunt in Phoenix',
      parent_status: 'Deceased in custody',
      legal_representation: true
    })]);
    console.log('✓ Added family separation details');
    
    // Workplace Raid Details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'workplace_raid', $2)
    `, [incidentId, JSON.stringify({
      business_name: 'Arizona Agricultural Supply Co.',
      business_type: 'Agricultural processing',
      workers_detained: 47,
      workers_released: 12,
      children_stranded: 8,
      i9_audit: true,
      warrant_type: 'administrative',
      advance_notice: false,
      media_present: false,
      community_impact: 'Significant disruption to local agricultural operations and immigrant community'
    })]);
    console.log('✓ Added workplace raid details');
    
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
    
    await client.query(`
      INSERT INTO incident_media (incident_id, url, media_type, description, verified)
      VALUES 
        ($1, 'https://example.com/images/test-case-1.jpg', 'image', 'Booking photo (with consent)', false),
        ($1, 'https://example.com/images/test-case-2.jpg', 'image', 'Facility exterior', false),
        ($1, 'https://example.com/images/test-case-3.jpg', 'image', 'Protest rally before arrest', false),
        ($1, 'https://youtube.com/watch?v=test123', 'video', 'Witness video of arrest', false),
        ($1, 'https://example.com/video/press-conference.mp4', 'video', 'Press conference footage', false)
    `, [incidentId]);
    console.log('✓ Added 5 media items (3 images, 2 videos)');
    
    await client.query('COMMIT');
    
    console.log('\n========================================');
    console.log('SUPREME TEST CASE CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log(`\nIncident ID: ${incidentId}`);
    console.log('Incident Reference: 2026-01-16-supreme-test');
    console.log('\nThis case includes:');
    console.log('  • 5 incident types (death_in_custody, excessive_force, medical_neglect, shooting, rights_violation)');
    console.log('  • 11 agencies (all types)');
    console.log('  • 7 violations (all constitutional amendments + specific violations)');
    console.log('  • 8 sources (all source types)');
    console.log('  • 12 quotes (all quote categories)');
    console.log('  • Quote-field links for verification testing');
    console.log('  • 9 type-specific detail sections');
    console.log('  • 15 timeline entries');
    console.log('  • 5 media items');
    console.log('  • All basic fields populated');
    console.log('\nTest this case in:');
    console.log(`  • Website: /dashboard/review/${incidentId}`);
    console.log(`  • Extension: Load case ID ${incidentId}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating test case:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSupremeTestCase();
