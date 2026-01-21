/**
 * Create maxed-out test incident with all fields populated
 * Similar structure to create-maxed-out-test-record.js but for incidents
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL
});

async function createMaxedOutIncident() {
  const client = await pool.connect();
  
  try {
    console.log('Creating comprehensive test incident...\n');
    
    // Generate unique incident_id
    const incidentId = `2025-03-15-test-maxed-incident-${Date.now()}`;
    
    // 1. Create main incident record with ALL fields populated
    const incidentResult = await client.query(`
      INSERT INTO incidents (
        incident_id,
        incident_type,
        incident_date,
        date_precision,
        city,
        state,
        country,
        facility,
        address,
        latitude,
        longitude,
        subject_name,
        subject_name_public,
        subject_age,
        subject_gender,
        subject_nationality,
        subject_immigration_status,
        subject_occupation,
        summary,
        outcome_status,
        legal_action,
        settlement,
        policy_change,
        verified,
        verification_notes,
        verification_status,
        submitted_by_user_id,
        is_guest_submission,
        guest_name,
        guest_email
      ) VALUES (
        $1, 'death', '2025-03-15', 'exact',
        'Los Angeles', 'California', 'USA',
        'Metropolitan Detention Center',
        '535 N Alameda St, Los Angeles, CA 90012',
        34.05894, -118.23693,
        'Test Subject MaxField', true,
        42, 'Male', 'Honduran', 'Asylum Seeker',
        'Construction Worker',
        'This is a comprehensive test incident with all fields populated to verify the review and validation workflow. Subject experienced medical emergency while in ICE custody at Metropolitan Detention Center. Despite repeated requests for medical attention over a 48-hour period, adequate care was not provided until the subject collapsed.',
        'pending_investigation',
        'Family filed wrongful death lawsuit seeking $15 million in damages. ACLU representing family pro bono. Case pending in Central District of California.',
        'Facility agreed to improve medical screening protocols and hire additional nursing staff as part of settlement discussions.',
        'ICE issued new directive requiring medical evaluations within 4 hours of intake and mandatory wellness checks every 6 hours for detainees with chronic conditions.',
        false,
        'Pending review by medical examiner. Family statements verified. ICE incident report obtained through FOIA.',
        'pending',
        1,
        false,
        NULL,
        NULL
      ) RETURNING id
    `, [incidentId]);
    
    const dbIncidentId = incidentResult.rows[0].id;
    console.log(`✅ Created incident #${dbIncidentId}: ${incidentId}`);
    
    // 2. Add agencies involved
    const agencies = [
      { agency: 'ICE (Immigration and Customs Enforcement)', role: 'Primary custody agency' },
      { agency: 'CoreCivic (Private Contractor)', role: 'Facility operator' },
      { agency: 'Los Angeles County Medical Examiner', role: 'Death investigation' }
    ];
    
    for (const ag of agencies) {
      await client.query(`
        INSERT INTO incident_agencies (incident_id, agency, role)
        VALUES ($1, $2, $3)
      `, [dbIncidentId, ag.agency, ag.role]);
    }
    console.log(`✅ Added ${agencies.length} agencies`);
    
    // 3. Add violations
    const violations = [
      { 
        type: 'medical_neglect', 
        description: 'Failure to provide timely medical care despite clear symptoms and repeated requests',
        basis: 'Eighth Amendment - Cruel and Unusual Punishment; Estelle v. Gamble (1976)' 
      },
      { 
        type: 'inadequate_screening', 
        description: 'Failed to identify pre-existing medical condition during intake screening',
        basis: 'ICE Performance-Based National Detention Standards §4.3' 
      },
      { 
        type: 'delayed_emergency_response', 
        description: 'Staff waited 25 minutes before calling emergency services after subject collapsed',
        basis: 'ICE Health Service Corps Medical Standards of Care' 
      }
    ];
    
    for (const violation of violations) {
      await client.query(`
        INSERT INTO incident_violations (incident_id, violation_type, description, constitutional_basis)
        VALUES ($1, $2, $3, $4)
      `, [dbIncidentId, violation.type, violation.description, violation.basis]);
    }
    console.log(`✅ Added ${violations.length} violations`);
    
    // 4. Add death-specific details
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'death', $2)
    `, [dbIncidentId, JSON.stringify({
      cause_of_death: 'Cardiac arrest secondary to untreated diabetic ketoacidosis',
      cause_source: 'autopsy',
      manner_of_death: 'undetermined',
      custody_duration: '8 days',
      medical_care_timeline: 'Day 1: Complained of nausea and dizziness during intake. Day 3: Requested sick call, placed on waiting list. Day 6: Symptoms worsened, began vomiting. Day 8: Collapsed in common area, died during transport to hospital.',
      pre_existing_conditions: 'Type 2 Diabetes Mellitus, Hypertension',
      medications_at_intake: 'Metformin 1000mg BID, Lisinopril 10mg daily',
      medications_provided: 'None - pharmacy order delayed',
      last_medical_eval: '8 days before incident during initial intake screening',
      family_notified_when: '6 hours after death',
      autopsy_performed: true,
      autopsy_findings: 'Severe dehydration, elevated blood glucose >600 mg/dL, evidence of ketoacidosis. No evidence of trauma or foul play.'
    })]);
    console.log(`✅ Added death-specific details`);
    
    // 5. Add comprehensive sources
    const sources = [
      {
        url: 'https://example.com/la-times-ice-death-investigation',
        title: 'Man Dies in ICE Custody After Alleged Medical Neglect',
        publication: 'Los Angeles Times',
        author: 'Maria Rodriguez',
        published_date: '2025-03-18',
        source_type: 'news',
        archived_url: 'https://web.archive.org/web/20250318/example.com/article'
      },
      {
        url: 'https://example.com/foia-incident-report.pdf',
        title: 'ICE Incident Report #2025-03-MDC-0089',
        publication: 'ICE Freedom of Information Act Response',
        author: 'ICE Office of Detention Oversight',
        published_date: '2025-04-02',
        source_type: 'official',
        archived_url: 'https://documentcloud.org/example-foia-report'
      },
      {
        url: 'https://example.com/autopsy-report',
        title: 'Autopsy Report Case #2025-00542',
        publication: 'LA County Medical Examiner-Coroner',
        author: 'Dr. James Chen, Deputy Medical Examiner',
        published_date: '2025-03-22',
        source_type: 'official',
        archived_url: 'https://documentcloud.org/example-autopsy'
      },
      {
        url: 'https://example.com/aclu-statement',
        title: 'ACLU Statement on Death in ICE Custody',
        publication: 'ACLU of Southern California',
        author: 'Hector Villagra, Executive Director',
        published_date: '2025-03-20',
        source_type: 'advocacy',
        archived_url: 'https://web.archive.org/web/20250320/aclu.org/statement'
      }
    ];
    
    const sourceIds = [];
    for (const source of sources) {
      const result = await client.query(`
        INSERT INTO incident_sources (
          incident_id, url, title, publication, author, 
          published_date, source_type, archived_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        dbIncidentId, source.url, source.title, source.publication,
        source.author, source.published_date, source.source_type, source.archived_url
      ]);
      sourceIds.push(result.rows[0].id);
    }
    console.log(`✅ Added ${sources.length} sources`);
    
    // 6. Add quotes linked to sources
    const quotes = [
      {
        text: 'The deceased complained multiple times about feeling unwell but was told to wait for the next sick call. By the time medical staff evaluated him, it was too late.',
        category: 'timeline',
        source_id: sourceIds[1], // FOIA report
        page_number: 12,
        confidence: 0.95,
        verified: true
      },
      {
        text: 'This death was entirely preventable. Basic medical screening would have identified his diabetes, and timely treatment could have saved his life.',
        category: 'medical',
        source_id: sourceIds[2], // Autopsy report
        page_number: 8,
        confidence: 0.98,
        verified: true
      },
      {
        text: 'My brother begged them for help. He told them he was diabetic. They ignored him until he collapsed.',
        category: 'family',
        source_id: sourceIds[0], // News article
        page_number: null,
        confidence: 0.90,
        verified: true
      },
      {
        text: 'ICE is committed to the health and welfare of all individuals in our custody. We take these allegations seriously and are conducting a thorough review.',
        category: 'official',
        source_id: sourceIds[3], // ACLU statement quoting ICE
        page_number: null,
        confidence: 0.99,
        verified: true
      },
      {
        text: 'Records show the subject\'s diabetes medication was ordered on Day 2 but never dispensed due to a pharmacy processing delay.',
        category: 'legal',
        source_id: sourceIds[1], // FOIA report
        page_number: 15,
        confidence: 0.97,
        verified: true
      }
    ];
    
    for (const quote of quotes) {
      await client.query(`
        INSERT INTO incident_quotes (
          incident_id, quote_text, category, source_id, 
          page_number, confidence, verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        dbIncidentId, quote.text, quote.category, quote.source_id,
        quote.page_number, quote.confidence, quote.verified
      ]);
    }
    console.log(`✅ Added ${quotes.length} quotes`);
    
    // 7. Add timeline events
    const timeline = [
      { date: '2025-03-07', event_type: 'intake', description: 'Subject taken into ICE custody at Metropolitan Detention Center. Initial health screening conducted. Subject disclosed diabetes and hypertension.' },
      { date: '2025-03-08', event_type: 'medical', description: 'Pharmacy order placed for subject\'s diabetes medication (Metformin) and blood pressure medication (Lisinopril).' },
      { date: '2025-03-09', event_type: 'complaint', description: 'Subject complained to correctional officer about feeling nauseous and dizzy. Told to submit sick call request.' },
      { date: '2025-03-10', event_type: 'medical', description: 'Subject placed on sick call waiting list. Estimated wait time: 3-5 days.' },
      { date: '2025-03-12', event_type: 'complaint', description: 'Subject\'s condition worsening. Cellmates report he was unable to keep food down. Requested to see nurse immediately.' },
      { date: '2025-03-13', event_type: 'medical', description: 'Subject seen briefly by LPN during medication rounds. Advised to "drink more water" and wait for doctor appointment.' },
      { date: '2025-03-14', event_type: 'complaint', description: 'Subject found vomiting in cell. Correctional officer documented incident but did not call medical staff.' },
      { date: '2025-03-15', event_type: 'emergency', description: '0845 hours: Subject collapsed in common area during breakfast. 0910 hours: Emergency services called. 0935 hours: Paramedics arrived. 1012 hours: Subject pronounced dead at St. Vincent Medical Center.' }
    ];
    
    for (const event of timeline) {
      await client.query(`
        INSERT INTO incident_timeline (incident_id, event_date, event_type, description)
        VALUES ($1, $2, $3, $4)
      `, [dbIncidentId, event.date, event.event_type, event.description]);
    }
    console.log(`✅ Added ${timeline.length} timeline events`);
    
    // 8. Add media attachments
    const media = [
      {
        media_type: 'document',
        url: 'https://storage.example.com/foia-response-full.pdf',
        title: 'Complete FOIA Response Package',
        description: '142-page document including incident reports, medical logs, and internal communications'
      },
      {
        media_type: 'document',
        url: 'https://storage.example.com/autopsy-full-report.pdf',
        title: 'Complete Autopsy Report with Toxicology',
        description: 'Official autopsy report from LA County Medical Examiner including photos and lab results'
      },
      {
        media_type: 'image',
        url: 'https://storage.example.com/facility-exterior.jpg',
        title: 'Metropolitan Detention Center Exterior',
        description: 'Photo of facility where death occurred'
      }
    ];
    
    for (const item of media) {
      await client.query(`
        INSERT INTO incident_media (incident_id, media_type, url, title, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [dbIncidentId, item.media_type, item.url, item.title, item.description]);
    }
    console.log(`✅ Added ${media.length} media items`);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ COMPLETE: Maxed-out test incident created`);
    console.log(`${'='.repeat(60)}`);
    console.log(`ID: ${dbIncidentId}`);
    console.log(`Incident ID: ${incidentId}`);
    console.log(`\nSummary:`);
    console.log(`  - 3 agencies involved`);
    console.log(`  - 3 violations documented`);
    console.log(`  - Death-specific details with autopsy findings`);
    console.log(`  - 4 sources from news, FOIA, medical examiner, advocacy`);
    console.log(`  - 5 quotes categorized and linked to sources`);
    console.log(`  - 8 timeline events documenting progression`);
    console.log(`  - 3 media attachments (documents and images)`);
    console.log(`\nView at: https://research-platform-beige.vercel.app/incidents/${dbIncidentId}/review`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Error creating incident:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createMaxedOutIncident();
