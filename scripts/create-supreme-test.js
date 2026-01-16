/**
 * Create a comprehensive test case with ALL fields populated
 * so we can verify extension and website load everything correctly.
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createSupremeTestCase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create the main incident with ALL 14 incident types
    const incidentResult = await client.query(`
      INSERT INTO incidents (
        incident_id, incident_type, incident_types, incident_date, city, state, facility,
        subject_name, victim_name, subject_age, subject_gender, subject_nationality,
        subject_immigration_status, summary, verification_status, tags
      ) VALUES (
        'SUPREME-TEST-' || EXTRACT(EPOCH FROM NOW())::INT,
        'death_in_custody',
        ARRAY['death_in_custody', 'death_during_operation', 'death_at_protest', 'shooting', 
              'excessive_force', 'injury', 'arrest', 'deportation', 'workplace_raid', 
              'family_separation', 'rights_violation', 'protest_suppression', 'retaliation', 'medical_neglect'],
        '2026-01-15',
        'Minneapolis', 'MN', 'Hennepin County Jail',
        'Supreme Testcase',
        'Testcase, Supreme',
        35,
        'male',
        'Mexico',
        'asylum_seeker',
        'Comprehensive test case with ALL incident types and fields populated for testing data loading.',
        'pending_review',
        ARRAY['test', 'comprehensive', 'all-fields']
      ) RETURNING id
    `);
    
    const incidentId = incidentResult.rows[0].id;
    console.log('Created incident ID:', incidentId);
    
    // 2. Add ALL agencies
    const agencies = ['ice', 'ice_ere', 'cbp', 'border_patrol', 'local_police', 'state_police', 
                      'federal_marshals', 'national_guard', 'dhs', 'private_contractor', 'other', 'unknown'];
    for (const agency of agencies) {
      await client.query('INSERT INTO incident_agencies (incident_id, agency) VALUES ($1, $2)', [incidentId, agency]);
    }
    console.log(`Added ${agencies.length} agencies`);
    
    // 3. Add ALL violations
    const violations = ['4th_amendment', '5th_amendment_due_process', '8th_amendment', 
                       '14th_amendment_equal_protection', '1st_amendment', 'medical_neglect', 
                       'excessive_force', 'false_imprisonment', 'civil_rights_violation'];
    for (const violation of violations) {
      await client.query('INSERT INTO incident_violations (incident_id, violation_type) VALUES ($1, $2)', [incidentId, violation]);
    }
    console.log(`Added ${violations.length} violations`);
    
    // 4. Add type-specific details for EACH type
    const typeDetails = [
      // Shooting details
      {
        incident_type: 'shooting',
        details: {
          shooting_fatal: true,
          shots_fired: 7,
          weapon_type: 'handgun',
          victim_armed: false,
          warning_given: false,
          bodycam_available: true,
          shooting_context: 'During traffic stop, multiple shots fired without warning. Dashcam captured entire incident.'
        }
      },
      // Death details  
      {
        incident_type: 'death_in_custody',
        details: {
          cause_of_death: 'Multiple gunshot wounds',
          official_cause: 'Homicide - gunshot trauma',
          autopsy_available: true,
          medical_neglect_alleged: true,
          manner_of_death: 'homicide',
          custody_duration: '3 hours',
          circumstances: 'Detained during traffic stop, shot while in handcuffs. Witnesses report subject was compliant.'
        }
      },
      // Arrest details
      {
        incident_type: 'arrest',
        details: {
          arrest_reason: 'Expired registration',
          arrest_charges: 'None filed',
          warrant_present: false,
          selective_enforcement: true,
          timing_suspicious: true,
          pretext_arrest: true,
          arrest_context: 'Pulled over in predominantly immigrant neighborhood. ID check revealed asylum status.'
        }
      },
      // Excessive force details
      {
        incident_type: 'excessive_force',
        details: {
          force_types: ['physical', 'taser', 'firearm', 'chokehold'],
          injuries_sustained: 'Fatal gunshot wounds, taser marks, bruising consistent with chokehold',
          victim_restrained: true,
          victim_complying: true,
          video_evidence: true,
          hospitalization_required: false
        }
      },
      // Injury details
      {
        incident_type: 'injury',
        details: {
          injury_type: 'Gunshot wounds, taser burns, neck contusions',
          injury_severity: 'life_threatening',
          injury_weapon: 'Handgun, taser, hands',
          injury_cause: 'Use of lethal and less-lethal force during arrest'
        }
      },
      // Medical neglect details
      {
        incident_type: 'medical_neglect',
        details: {
          medical_condition: 'Gunshot wounds requiring immediate care',
          treatment_denied: 'EMTs not called for 15 minutes after shooting despite bystander requests',
          requests_documented: true,
          resulted_in_death: true
        }
      },
      // Protest suppression details
      {
        incident_type: 'protest_suppression',
        details: {
          protest_topic: 'Immigration enforcement in schools',
          protest_size: '50-100',
          permitted: true,
          dispersal_method: 'tear_gas',
          arrests_made: 12
        }
      }
    ];
    
    for (const td of typeDetails) {
      await client.query(
        'INSERT INTO incident_details (incident_id, detail_type, details) VALUES ($1, $2, $3)',
        [incidentId, td.incident_type, JSON.stringify(td.details)]
      );
    }
    console.log(`Added ${typeDetails.length} type-specific detail sections`);
    
    // 5. Add sources
    const sourceResult = await client.query(`
      INSERT INTO incident_sources (incident_id, url, title, publication, source_type)
      VALUES ($1, 'https://example.com/news/supreme-test', 'Comprehensive Test Article', 'Test News', 'news')
      RETURNING id
    `, [incidentId]);
    const sourceId = sourceResult.rows[0].id;
    console.log('Added source ID:', sourceId);
    
    // 6. Add quotes
    await client.query(`
      INSERT INTO incident_quotes (incident_id, quote_text, source_id, category)
      VALUES 
        ($1, 'The victim was in handcuffs when he was shot seven times.', $2, 'witness_statement'),
        ($1, 'We followed all department protocols.', $2, 'official_statement'),
        ($1, 'My husband did nothing wrong. He was coming home from work.', $2, 'family_statement')
    `, [incidentId, sourceId]);
    console.log('Added 3 quotes');
    
    // 7. Add timeline
    await client.query(`
      INSERT INTO incident_timeline (incident_id, event_date, description, sequence_order)
      VALUES 
        ($1, '2026-01-15 18:30:00', 'Traffic stop initiated', 1),
        ($1, '2026-01-15 18:32:00', 'Subject asked to step out of vehicle', 2),
        ($1, '2026-01-15 18:33:00', 'Subject placed in handcuffs', 3),
        ($1, '2026-01-15 18:35:00', 'Shots fired', 4),
        ($1, '2026-01-15 18:50:00', 'EMTs arrive on scene', 5),
        ($1, '2026-01-15 19:15:00', 'Subject pronounced dead at hospital', 6)
    `, [incidentId]);
    console.log('Added 6 timeline entries');
    
    await client.query('COMMIT');
    
    console.log('\n========================================');
    console.log('✅ SUPREME TEST CASE CREATED');
    console.log('========================================');
    console.log('Incident ID:', incidentId);
    console.log('\nTo test in extension:');
    console.log(`  1. Go to Review Queue tab`);
    console.log(`  2. Find case ID ${incidentId}`);
    console.log(`  3. Click to load it`);
    console.log('\nTo test in website:');
    console.log(`  http://localhost:3000/dashboard/review/${incidentId}`);
    console.log('\nExpected to see:');
    console.log('  - 14 incident types checked');
    console.log('  - 12 agencies checked');
    console.log('  - 9 violations checked');
    console.log('  - Shooting, Death, Arrest, Force, Injury, Medical, Protest sections visible');
    console.log('  - 3 quotes');
    console.log('  - 6 timeline entries');
    console.log('========================================\n');
    
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

createSupremeTestCase().catch(console.error);
