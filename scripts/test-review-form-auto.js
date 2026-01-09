/**
 * Automated Review Form Test
 * 
 * Tests all database operations used by the review form.
 * Run with: node scripts/test-review-form-auto.js
 * 
 * This bypasses HTTP/auth and tests the DB layer directly.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;
const errors = [];

function test(name, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${details ? ': ' + details : ''}`);
    errors.push({ name, details });
  }
}

async function run() {
  console.log('\n🧪 AUTOMATED REVIEW FORM TESTS\n');
  console.log('=' .repeat(50));
  
  const client = await pool.connect();
  
  try {
    // Use a test incident - create one if needed
    let testIncidentId;
    
    // Check for existing test incident or create new
    const existing = await client.query(
      "SELECT id FROM incidents WHERE incident_id = 'TEST-AUTO-001'"
    );
    
    if (existing.rows.length > 0) {
      testIncidentId = existing.rows[0].id;
      console.log(`Using existing test incident: ${testIncidentId}`);
    } else {
      const created = await client.query(`
        INSERT INTO incidents (incident_id, victim_name, incident_type, verification_status)
        VALUES ('TEST-AUTO-001', 'Test Victim', 'shooting', 'pending')
        RETURNING id
      `);
      testIncidentId = created.rows[0].id;
      console.log(`Created test incident: ${testIncidentId}`);
    }
    
    console.log('\n--- 1. BASIC INCIDENT FIELDS ---\n');
    
    // Test updating basic fields
    await client.query(`
      UPDATE incidents SET 
        victim_name = 'Updated Test Name',
        city = 'Test City',
        state = 'TX',
        facility = 'Test Facility',
        subject_age = 35,
        summary = 'Test summary with special chars: O''Brien & Co.'
      WHERE id = $1
    `, [testIncidentId]);
    
    const basicCheck = await client.query('SELECT * FROM incidents WHERE id = $1', [testIncidentId]);
    const inc = basicCheck.rows[0];
    
    test('victim_name saves', inc.victim_name === 'Updated Test Name');
    test('city saves', inc.city === 'Test City');
    test('state saves', inc.state === 'TX');
    test('facility saves', inc.facility === 'Test Facility');
    test('subject_age saves as number', inc.subject_age === 35);
    test('summary with special chars', inc.summary.includes("O'Brien"));
    
    // Test incident type changes
    const types = ['shooting', 'death_in_custody', 'arrest', 'excessive_force', 'medical_neglect', 'protest_suppression'];
    for (const type of types) {
      await client.query('UPDATE incidents SET incident_type = $1 WHERE id = $2', [type, testIncidentId]);
      const check = await client.query('SELECT incident_type FROM incidents WHERE id = $1', [testIncidentId]);
      test(`incident_type: ${type}`, check.rows[0].incident_type === type);
    }
    
    console.log('\n--- 2. TYPE-SPECIFIC DETAILS ---\n');
    
    // Test shooting details
    await client.query('UPDATE incidents SET incident_type = $1 WHERE id = $2', ['shooting', testIncidentId]);
    await client.query('DELETE FROM incident_details WHERE incident_id = $1', [testIncidentId]);
    
    const shootingDetails = {
      shooting_fatal: true,
      shots_fired: 5,
      weapon_type: 'handgun',
      victim_armed: false,
      warning_given: true,
      bodycam_available: true,
      shooting_context: 'Test context'
    };
    
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'shooting', $2::jsonb)
      ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $2::jsonb
    `, [testIncidentId, JSON.stringify(shootingDetails)]);
    
    const shootingCheck = await client.query(
      'SELECT details FROM incident_details WHERE incident_id = $1 AND detail_type = $2',
      [testIncidentId, 'shooting']
    );
    const sd = shootingCheck.rows[0]?.details || {};
    
    test('shooting_fatal (boolean)', sd.shooting_fatal === true);
    test('shots_fired (number)', sd.shots_fired === 5);
    test('weapon_type (string)', sd.weapon_type === 'handgun');
    test('victim_armed (boolean false)', sd.victim_armed === false);
    test('warning_given (boolean)', sd.warning_given === true);
    test('bodycam_available (boolean)', sd.bodycam_available === true);
    test('shooting_context (text)', sd.shooting_context === 'Test context');
    
    // Test death details
    await client.query('UPDATE incidents SET incident_type = $1 WHERE id = $2', ['death_in_custody', testIncidentId]);
    
    const deathDetails = {
      cause_of_death: 'Test cause',
      official_cause: 'Official test cause',
      autopsy_available: true,
      medical_neglect_alleged: true,
      death_circumstances: 'Test circumstances'
    };
    
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'death', $2::jsonb)
      ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $2::jsonb
    `, [testIncidentId, JSON.stringify(deathDetails)]);
    
    const deathCheck = await client.query(
      'SELECT details FROM incident_details WHERE incident_id = $1 AND detail_type = $2',
      [testIncidentId, 'death']
    );
    const dd = deathCheck.rows[0]?.details || {};
    
    test('cause_of_death saves', dd.cause_of_death === 'Test cause');
    test('official_cause saves', dd.official_cause === 'Official test cause');
    test('autopsy_available saves', dd.autopsy_available === true);
    test('medical_neglect_alleged saves', dd.medical_neglect_alleged === true);
    test('death_circumstances saves', dd.death_circumstances === 'Test circumstances');
    
    // Test force details with array
    await client.query('UPDATE incidents SET incident_type = $1 WHERE id = $2', ['excessive_force', testIncidentId]);
    
    const forceDetails = {
      force_types: ['physical', 'taser', 'pepper_spray'],
      injuries_sustained: 'Bruises',
      victim_restrained: true,
      victim_complying: true,
      video_evidence: true,
      hospitalization_required: false
    };
    
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'force', $2::jsonb)
      ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $2::jsonb
    `, [testIncidentId, JSON.stringify(forceDetails)]);
    
    const forceCheck = await client.query(
      'SELECT details FROM incident_details WHERE incident_id = $1 AND detail_type = $2',
      [testIncidentId, 'force']
    );
    const fd = forceCheck.rows[0]?.details || {};
    
    test('force_types array saves', Array.isArray(fd.force_types) && fd.force_types.length === 3);
    test('force_types contains taser', fd.force_types?.includes('taser'));
    test('injuries_sustained saves', fd.injuries_sustained === 'Bruises');
    test('hospitalization_required (false)', fd.hospitalization_required === false);
    
    // Test arrest details
    const arrestDetails = {
      arrest_reason: 'Test reason',
      arrest_charges: 'Test charges',
      warrant_present: false,
      selective_enforcement: true,
      arrest_context: 'Test arrest context'
    };
    
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'arrest', $2::jsonb)
      ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $2::jsonb
    `, [testIncidentId, JSON.stringify(arrestDetails)]);
    
    const arrestCheck = await client.query(
      'SELECT details FROM incident_details WHERE incident_id = $1 AND detail_type = $2',
      [testIncidentId, 'arrest']
    );
    test('arrest details save', arrestCheck.rows[0]?.details?.arrest_reason === 'Test reason');
    
    // Test medical neglect details
    const medicalDetails = {
      medical_condition: 'Test condition',
      treatment_denied: 'Test treatment',
      requests_documented: true,
      resulted_in_death: false
    };
    
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'medical', $2::jsonb)
      ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $2::jsonb
    `, [testIncidentId, JSON.stringify(medicalDetails)]);
    
    const medicalCheck = await client.query(
      'SELECT details FROM incident_details WHERE incident_id = $1 AND detail_type = $2',
      [testIncidentId, 'medical']
    );
    test('medical neglect details save', medicalCheck.rows[0]?.details?.medical_condition === 'Test condition');
    
    // Test protest details
    const protestDetails = {
      protest_topic: 'Immigration rights',
      protest_size: '100-200',
      permitted: true,
      dispersal_method: 'tear_gas',
      arrests_made: 15
    };
    
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, 'protest', $2::jsonb)
      ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $2::jsonb
    `, [testIncidentId, JSON.stringify(protestDetails)]);
    
    const protestCheck = await client.query(
      'SELECT details FROM incident_details WHERE incident_id = $1 AND detail_type = $2',
      [testIncidentId, 'protest']
    );
    test('protest details save', protestCheck.rows[0]?.details?.protest_topic === 'Immigration rights');
    test('protest arrests_made (number)', protestCheck.rows[0]?.details?.arrests_made === 15);
    
    console.log('\n--- 3. AGENCIES ---\n');
    
    // Clean up first
    await client.query('DELETE FROM incident_agencies WHERE incident_id = $1', [testIncidentId]);
    
    const agencies = ['ice', 'ice_ere', 'cbp', 'border_patrol', 'local_police'];
    for (const agency of agencies) {
      await client.query(
        'INSERT INTO incident_agencies (incident_id, agency) VALUES ($1, $2)',
        [testIncidentId, agency]
      );
    }
    
    const agencyCheck = await client.query(
      'SELECT agency FROM incident_agencies WHERE incident_id = $1',
      [testIncidentId]
    );
    test('agencies save (count)', agencyCheck.rows.length === 5);
    test('agencies contain ice_ere', agencyCheck.rows.some(r => r.agency === 'ice_ere'));
    
    // Test delete
    await client.query(
      'DELETE FROM incident_agencies WHERE incident_id = $1 AND agency = $2',
      [testIncidentId, 'cbp']
    );
    const afterDelete = await client.query(
      'SELECT agency FROM incident_agencies WHERE incident_id = $1',
      [testIncidentId]
    );
    test('agency delete works', afterDelete.rows.length === 4);
    test('cbp was deleted', !afterDelete.rows.some(r => r.agency === 'cbp'));
    
    console.log('\n--- 4. VIOLATIONS ---\n');
    
    // Clean up first
    await client.query('DELETE FROM incident_violations WHERE incident_id = $1', [testIncidentId]);
    
    // Add violations
    const violationId = (await client.query(`
      INSERT INTO incident_violations (incident_id, violation_type, description, constitutional_basis)
      VALUES ($1, '4th_amendment', 'Test description', 'Graham v. Connor')
      RETURNING id
    `, [testIncidentId])).rows[0].id;
    
    const violationCheck = await client.query(
      'SELECT * FROM incident_violations WHERE id = $1',
      [violationId]
    );
    const v = violationCheck.rows[0];
    
    test('violation type saves', v.violation_type === '4th_amendment');
    test('violation description saves', v.description === 'Test description');
    test('violation case law saves', v.constitutional_basis === 'Graham v. Connor');
    
    // Test update
    await client.query(`
      UPDATE incident_violations SET description = 'Updated description', constitutional_basis = 'Tennessee v. Garner'
      WHERE id = $1
    `, [violationId]);
    
    const updatedV = await client.query('SELECT * FROM incident_violations WHERE id = $1', [violationId]);
    test('violation description updates', updatedV.rows[0].description === 'Updated description');
    test('violation case law updates', updatedV.rows[0].constitutional_basis === 'Tennessee v. Garner');
    
    // Add multiple violation types
    const violationTypes = ['5th_amendment_due_process', '8th_amendment', '14th_amendment_equal_protection'];
    for (const vt of violationTypes) {
      await client.query(
        'INSERT INTO incident_violations (incident_id, violation_type) VALUES ($1, $2)',
        [testIncidentId, vt]
      );
    }
    const allViolations = await client.query(
      'SELECT violation_type FROM incident_violations WHERE incident_id = $1',
      [testIncidentId]
    );
    test('multiple violations save', allViolations.rows.length === 4);
    
    console.log('\n--- 5. SOURCES ---\n');
    
    // Clean up
    await client.query('DELETE FROM incident_sources WHERE incident_id = $1', [testIncidentId]);
    
    const sourceId = (await client.query(`
      INSERT INTO incident_sources (incident_id, url, title, publication, source_type)
      VALUES ($1, 'https://test.com/article', 'Test Article', 'Test Publication', 'news_article')
      RETURNING id
    `, [testIncidentId])).rows[0].id;
    
    const sourceCheck = await client.query('SELECT * FROM incident_sources WHERE id = $1', [sourceId]);
    const s = sourceCheck.rows[0];
    
    test('source url saves', s.url === 'https://test.com/article');
    test('source title saves', s.title === 'Test Article');
    test('source publication saves', s.publication === 'Test Publication');
    test('source type saves', s.source_type === 'news_article');
    
    // Test different source types
    const sourceTypes = ['court_document', 'government_report', 'academic_paper', 'video'];
    for (const st of sourceTypes) {
      await client.query(
        'INSERT INTO incident_sources (incident_id, url, source_type) VALUES ($1, $2, $3)',
        [testIncidentId, `https://test.com/${st}`, st]
      );
    }
    const allSources = await client.query(
      'SELECT source_type FROM incident_sources WHERE incident_id = $1',
      [testIncidentId]
    );
    test('multiple source types save', allSources.rows.length === 5);
    
    console.log('\n--- 6. QUOTES ---\n');
    
    // Clean up
    await client.query('DELETE FROM quote_field_links WHERE incident_id = $1', [testIncidentId]);
    await client.query('DELETE FROM incident_quotes WHERE incident_id = $1', [testIncidentId]);
    
    const quoteId = (await client.query(`
      INSERT INTO incident_quotes (incident_id, quote_text, category, source_id, verified)
      VALUES ($1, 'Test quote text for verification', 'witness_statement', $2, false)
      RETURNING id
    `, [testIncidentId, sourceId])).rows[0].id;
    
    const quoteCheck = await client.query('SELECT * FROM incident_quotes WHERE id = $1', [quoteId]);
    const q = quoteCheck.rows[0];
    
    test('quote text saves', q.quote_text === 'Test quote text for verification');
    test('quote category saves', q.category === 'witness_statement');
    test('quote source_id saves', q.source_id === sourceId);
    test('quote verified default false', q.verified === false);
    
    // Test quote verification
    await client.query('UPDATE incident_quotes SET verified = true WHERE id = $1', [quoteId]);
    const verifiedCheck = await client.query('SELECT verified FROM incident_quotes WHERE id = $1', [quoteId]);
    test('quote verification updates', verifiedCheck.rows[0].verified === true);
    
    // Test quote field links
    await client.query(`
      INSERT INTO quote_field_links (incident_id, quote_id, field_name)
      VALUES ($1, $2, 'victim_name'), ($1, $2, 'city'), ($1, $2, 'summary')
    `, [testIncidentId, quoteId]);
    
    const linksCheck = await client.query(
      'SELECT field_name FROM quote_field_links WHERE quote_id = $1',
      [quoteId]
    );
    test('quote field links save', linksCheck.rows.length === 3);
    test('quote linked to victim_name', linksCheck.rows.some(r => r.field_name === 'victim_name'));
    
    // Test unlinking
    await client.query(
      'DELETE FROM quote_field_links WHERE quote_id = $1 AND field_name = $2',
      [quoteId, 'city']
    );
    const afterUnlink = await client.query(
      'SELECT field_name FROM quote_field_links WHERE quote_id = $1',
      [quoteId]
    );
    test('quote unlink works', afterUnlink.rows.length === 2);
    test('city was unlinked', !afterUnlink.rows.some(r => r.field_name === 'city'));
    
    console.log('\n--- 7. TIMELINE ---\n');
    
    // Clean up
    await client.query('DELETE FROM incident_timeline WHERE incident_id = $1', [testIncidentId]);
    
    const timelineId = (await client.query(`
      INSERT INTO incident_timeline (incident_id, event_date, description, sequence_order, source_id)
      VALUES ($1, '2024-03-15', 'Test timeline event', 1, $2)
      RETURNING id
    `, [testIncidentId, sourceId])).rows[0].id;
    
    const timelineCheck = await client.query('SELECT * FROM incident_timeline WHERE id = $1', [timelineId]);
    const t = timelineCheck.rows[0];
    
    test('timeline date saves', t.event_date.toISOString().startsWith('2024-03-15'));
    test('timeline description saves', t.description === 'Test timeline event');
    test('timeline sequence_order saves', t.sequence_order === 1);
    test('timeline source_id saves', t.source_id === sourceId);
    
    // Add multiple timeline entries
    await client.query(`
      INSERT INTO incident_timeline (incident_id, description, sequence_order)
      VALUES ($1, 'Event 2', 2), ($1, 'Event 3', 3)
    `, [testIncidentId]);
    
    const allTimeline = await client.query(
      'SELECT * FROM incident_timeline WHERE incident_id = $1 ORDER BY sequence_order',
      [testIncidentId]
    );
    test('multiple timeline entries save', allTimeline.rows.length === 3);
    test('timeline ordering works', allTimeline.rows[2].description === 'Event 3');
    
    console.log('\n--- 8. CLEANUP ---\n');
    
    // Clean up test data
    await client.query('DELETE FROM quote_field_links WHERE incident_id = $1', [testIncidentId]);
    await client.query('DELETE FROM incident_quotes WHERE incident_id = $1', [testIncidentId]);
    await client.query('DELETE FROM incident_timeline WHERE incident_id = $1', [testIncidentId]);
    await client.query('DELETE FROM incident_sources WHERE incident_id = $1', [testIncidentId]);
    await client.query('DELETE FROM incident_violations WHERE incident_id = $1', [testIncidentId]);
    await client.query('DELETE FROM incident_agencies WHERE incident_id = $1', [testIncidentId]);
    await client.query('DELETE FROM incident_details WHERE incident_id = $1', [testIncidentId]);
    await client.query("DELETE FROM incidents WHERE incident_id = 'TEST-AUTO-001'");
    
    test('cleanup complete', true);
    
  } catch (err) {
    console.error('\n💥 ERROR:', err.message);
    failed++;
  } finally {
    client.release();
    await pool.end();
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  console.log(`\n  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log(`  Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('Failed tests:');
    errors.forEach(e => console.log(`  - ${e.name}: ${e.details}`));
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  }
}

run();
