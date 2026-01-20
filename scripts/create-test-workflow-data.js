/**
 * CREATE TEST RECORDS WITH FULL WORKFLOW
 * 
 * Creates sample records showing:
 * 1. Guest submissions (pending_review)
 * 2. Reviewed records (pending_validation)
 * 3. Validated records (verified)
 * 4. Records with quotes and sources
 */

require('dotenv').config({ path: '.env.production', override: true });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestData() {
  try {
    console.log('\n=== CREATING TEST WORKFLOW DATA ===\n');

    // Get project and record types
    const project = await pool.query(`SELECT id FROM projects WHERE slug = 'project-a'`);
    const projectId = project.rows[0].id;

    const recordTypes = await pool.query(`
      SELECT id, slug FROM record_types WHERE project_id = $1
    `, [projectId]);

    const incidentTypeId = recordTypes.rows.find(rt => rt.slug === 'incident').id;
    const statementTypeId = recordTypes.rows.find(rt => rt.slug === 'statement').id;

    // Get a user for created_by
    const user = await pool.query(`SELECT id FROM users LIMIT 1`);
    const userId = user.rows[0].id;

    console.log('📝 Creating test records...\n');

    // ===== GUEST SUBMISSION (pending_review) =====
    console.log('1️⃣ Creating GUEST SUBMISSION (pending_review)...');
    const guestRecord = await pool.query(`
      INSERT INTO records (
        project_id, record_type_id, data, status, 
        submitted_by, is_guest_submission, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      projectId,
      incidentTypeId,
      JSON.stringify({
        subject_name: 'John Doe',
        incident_date: '2024-01-15',
        incident_types: ['excessive_force', 'injury'],
        city: 'Minneapolis',
        state: 'MN',
        age: 42,
        narrative: 'Guest submitted: Officers used excessive force during arrest, resulting in injuries requiring hospitalization.'
      }),
      'pending_review', // status
      null, // submitted_by (guest, so null)
      true // is_guest_submission
    ]);
    console.log(`   ✅ Created guest record #${guestRecord.rows[0].id}`);

    // ===== REVIEWED RECORD (pending_validation) =====
    console.log('\n2️⃣ Creating REVIEWED RECORD (pending_validation)...');
    const reviewedRecord = await pool.query(`
      INSERT INTO records (
        project_id, record_type_id, data, status,
        submitted_by, reviewed_by, reviewed_at, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() - INTERVAL '1 day')
      RETURNING id
    `, [
      projectId,
      incidentTypeId,
      JSON.stringify({
        subject_name: 'Jane Smith',
        incident_date: '2024-02-20',
        incident_types: ['shooting', 'death_during_operation'],
        city: 'Los Angeles',
        state: 'CA',
        age: 28,
        narrative: 'Fatal shooting during ICE raid. Officers claim subject was armed, but witnesses dispute this.',
        weapon_type: 'handgun',
        shots_fired: 4,
        victim_armed: true,
        bodycam_available: true,
        cause_of_death: 'Gunshot wounds to torso',
        official_cause: 'Homicide',
        autopsy_available: true
      }),
      'pending_validation',
      userId,
      userId
    ]);
    const reviewedId = reviewedRecord.rows[0].id;
    console.log(`   ✅ Created reviewed record #${reviewedId}`);

    // Add source to reviewed record
    const source1 = await pool.query(`
      INSERT INTO record_sources (
        record_id, project_id, url, title, source_type, accessed_date
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [
      reviewedId,
      projectId,
      'https://example.com/news/ice-shooting-la',
      'Fatal Shooting During ICE Raid in LA - LA Times',
      'news_article'
    ]);
    console.log(`   ✅ Added source #${source1.rows[0].id}`);

    // Add quote to reviewed record
    const quote1 = await pool.query(`
      INSERT INTO record_quotes (
        record_id, project_id, quote_text, source, source_url, source_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      reviewedId,
      projectId,
      'Officers fired four shots during the confrontation, striking the subject multiple times in the torso.',
      'LA Times',
      'https://example.com/news/ice-shooting-la',
      'news_article'
    ]);
    console.log(`   ✅ Added quote #${quote1.rows[0].id}`);

    // ===== VALIDATED RECORD (verified) =====
    console.log('\n3️⃣ Creating VALIDATED RECORD (verified)...');
    const verifiedRecord = await pool.query(`
      INSERT INTO records (
        project_id, record_type_id, data, status,
        submitted_by, reviewed_by, reviewed_at,
        validated_by, validated_at, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '2 days', $7, NOW(), NOW() - INTERVAL '3 days')
      RETURNING id
    `, [
      projectId,
      incidentTypeId,
      JSON.stringify({
        subject_name: 'Miguel Rodriguez',
        incident_date: '2023-12-10',
        incident_types: ['death_in_custody', 'medical_neglect'],
        city: 'Houston',
        state: 'TX',
        age: 55,
        narrative: 'Died in ICE custody after repeated denied medical requests. Had documented heart condition.',
        medical_condition: 'Heart disease - documented by family physician',
        treatment_denied: 'Requested medical attention for chest pain 3 times over 2 days. Told to "stop complaining"',
        requests_documented: true,
        resulted_in_death: true,
        cause_of_death: 'Cardiac arrest',
        official_cause: 'Natural',
        manner_of_death: 'undetermined',
        custody_duration: '8 months',
        medical_neglect_alleged: true,
        medical_requests_denied: true
      }),
      'verified',
      userId,
      userId,
      userId
    ]);
    const verifiedId = verifiedRecord.rows[0].id;
    console.log(`   ✅ Created verified record #${verifiedId}`);

    // Add multiple sources
    const source2 = await pool.query(`
      INSERT INTO record_sources (
        record_id, project_id, url, title, source_type, accessed_date
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [
      verifiedId,
      projectId,
      'https://example.com/news/ice-death-houston',
      'Man Dies in ICE Custody - Houston Chronicle',
      'news_article'
    ]);

    const source3 = await pool.query(`
      INSERT INTO record_sources (
        record_id, project_id, url, title, source_type, accessed_date
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [
      verifiedId,
      projectId,
      'https://example.com/docs/autopsy-rodriguez.pdf',
      'Autopsy Report - Miguel Rodriguez',
      'medical_report'
    ]);

    // Add multiple quotes
    await pool.query(`
      INSERT INTO record_quotes (
        record_id, project_id, quote_text, source, source_url, source_type
      ) VALUES 
        ($1, $2, $3, $4, $5, $6),
        ($1, $2, $7, $8, $9, $10),
        ($1, $2, $11, $12, $13, $14)
    `, [
      verifiedId,
      projectId,
      'Rodriguez complained of chest pain at least three times over a 48-hour period before his death.',
      'Houston Chronicle',
      'https://example.com/news/ice-death-houston',
      'news_article',
      'Family members say Rodriguez had a documented heart condition and regularly took medication.',
      'Houston Chronicle',
      'https://example.com/news/ice-death-houston',
      'news_article',
      'Cause of death: Cardiac arrest. Contributing factors: Lack of timely medical intervention.',
      'Medical Examiner Report',
      'https://example.com/docs/autopsy-rodriguez.pdf',
      'medical_report'
    ]);
    console.log(`   ✅ Added 2 sources and 3 quotes`);

    // ===== STATEMENT RECORD =====
    console.log('\n4️⃣ Creating STATEMENT RECORD...');
    const statementRecord = await pool.query(`
      INSERT INTO records (
        project_id, record_type_id, data, status,
        submitted_by, reviewed_by, reviewed_at, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() - INTERVAL '1 day')
      RETURNING id
    `, [
      projectId,
      statementTypeId,
      JSON.stringify({
        speaker_name: 'Rep. Alexandria Ocasio-Cortez',
        speaker_type: 'elected_official',
        political_affiliation: 'democratic',
        statement_date: '2024-03-01',
        statement_text: 'We cannot continue to ignore the deaths occurring in ICE custody. Every life lost demands accountability and immediate reform.',
        statement_type: 'denunciation',
        impact_level: 'high',
        context: 'Response to recent deaths in detention facilities'
      }),
      'pending_validation',
      userId,
      userId
    ]);
    console.log(`   ✅ Created statement record #${statementRecord.rows[0].id}`);

    // ===== ANOTHER GUEST SUBMISSION =====
    console.log('\n5️⃣ Creating another GUEST SUBMISSION...');
    await pool.query(`
      INSERT INTO records (
        project_id, record_type_id, data, status,
        is_guest_submission, guest_email, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      projectId,
      incidentTypeId,
      JSON.stringify({
        subject_name: 'Unknown',
        incident_date: '2024-03-05',
        incident_types: ['protest_suppression'],
        city: 'Portland',
        state: 'OR',
        narrative: 'Heard about pepper spray being used on protesters opposing ICE facility. Need more details.'
      }),
      'pending_review',
      true,
      'anonymous@example.com'
    ]);
    console.log(`   ✅ Created incomplete guest submission`);

    console.log('\n✅ Test data created successfully!\n');
    console.log('Summary:');
    console.log('  - 1 guest submission (pending_review)');
    console.log('  - 1 reviewed incident with source and quote (pending_validation)');
    console.log('  - 1 verified incident with multiple sources and quotes (verified)');
    console.log('  - 1 statement (pending_validation)');
    console.log('  - 1 incomplete guest submission (pending_review)');
    console.log('\nTotal: 5 records created\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

createTestData();
