// Database Cleanup Script
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function cleanup() {
  const client = await pool.connect();
  
  try {
    console.log('=== DATABASE CLEANUP ===\n');
    
    // STEP 1: Identify clearly test/garbage data
    console.log('STEP 1: Identifying test/garbage data...\n');
    
    const garbageIncidents = await client.query(`
      SELECT id, incident_id, subject_name, summary, incident_type
      FROM incidents
      WHERE 
        -- Clearly gibberish/test names
        subject_name ILIKE '%asdasd%'
        OR subject_name ILIKE '%test%'
        OR subject_name ILIKE '%qwerty%'
        OR subject_name ILIKE '%abc123%'
        -- Gibberish summaries
        OR summary ILIKE '%asdasd%'
        OR summary ILIKE '%qwerty%'
        -- Test incident IDs
        OR incident_id ILIKE '%test%'
        -- Obviously fake entries
        OR summary ILIKE '%shot a dog%'
        OR summary ILIKE '%Mike Bost%'
      ORDER BY id
    `);
    
    console.log(`Found ${garbageIncidents.rows.length} garbage/test incidents to remove:`);
    garbageIncidents.rows.forEach(i => {
      console.log(`  - ID ${i.id}: "${i.subject_name}" - ${(i.summary || '').substring(0, 50)}...`);
    });
    
    if (garbageIncidents.rows.length > 0) {
      const idsToDelete = garbageIncidents.rows.map(r => r.id);
      
      // Delete related data first (foreign key constraints)
      console.log('\nDeleting related data...');
      
      // Delete quotes for these incidents
      const deletedQuotes = await client.query(`
        DELETE FROM incident_quotes WHERE incident_id = ANY($1) RETURNING id
      `, [idsToDelete]);
      console.log(`  Deleted ${deletedQuotes.rowCount} quotes`);
      
      // Delete sources for these incidents
      const deletedSources = await client.query(`
        DELETE FROM incident_sources WHERE incident_id = ANY($1) RETURNING id
      `, [idsToDelete]);
      console.log(`  Deleted ${deletedSources.rowCount} sources`);
      
      // Delete timeline entries
      try {
        const deletedTimeline = await client.query(`
          DELETE FROM incident_timeline WHERE incident_id = ANY($1) RETURNING id
        `, [idsToDelete]);
        console.log(`  Deleted ${deletedTimeline.rowCount} timeline entries`);
      } catch (e) { /* table may not exist */ }
      
      // Delete media
      try {
        const deletedMedia = await client.query(`
          DELETE FROM incident_media WHERE incident_id = ANY($1) RETURNING id
        `, [idsToDelete]);
        console.log(`  Deleted ${deletedMedia.rowCount} media entries`);
      } catch (e) { /* table may not exist */ }
      
      // Delete violations
      try {
        const deletedViolations = await client.query(`
          DELETE FROM incident_violations WHERE incident_id = ANY($1) RETURNING id
        `, [idsToDelete]);
        console.log(`  Deleted ${deletedViolations.rowCount} violation entries`);
      } catch (e) { /* table may not exist */ }
      
      // Delete agencies
      try {
        const deletedAgencies = await client.query(`
          DELETE FROM incident_agencies WHERE incident_id = ANY($1) RETURNING id
        `, [idsToDelete]);
        console.log(`  Deleted ${deletedAgencies.rowCount} agency entries`);
      } catch (e) { /* table may not exist */ }
      
      // Delete the incidents themselves
      const deletedIncidents = await client.query(`
        DELETE FROM incidents WHERE id = ANY($1) RETURNING id
      `, [idsToDelete]);
      console.log(`\n✓ Deleted ${deletedIncidents.rowCount} garbage incidents`);
    }
    
    // STEP 2: Clean up guest submissions
    console.log('\n\nSTEP 2: Checking guest submissions...');
    const guestSubs = await client.query(`
      SELECT id, submission_data, status, created_at
      FROM guest_submissions
      ORDER BY created_at
    `);
    
    console.log(`Found ${guestSubs.rows.length} guest submissions`);
    
    // Delete test guest submissions
    const testGuestIds = [];
    guestSubs.rows.forEach(gs => {
      const data = gs.submission_data;
      const name = data?.subject_name || data?.name || '';
      const summary = data?.summary || '';
      
      if (name.toLowerCase().includes('test') ||
          name.toLowerCase().includes('asdasd') ||
          summary.toLowerCase().includes('asdasd') ||
          summary.toLowerCase().includes('test entry')) {
        testGuestIds.push(gs.id);
        console.log(`  - Test submission ID ${gs.id}: "${name}"`);
      }
    });
    
    if (testGuestIds.length > 0) {
      const deletedGuest = await client.query(`
        DELETE FROM guest_submissions WHERE id = ANY($1) RETURNING id
      `, [testGuestIds]);
      console.log(`✓ Deleted ${deletedGuest.rowCount} test guest submissions`);
    }
    
    // STEP 3: Data quality fixes
    console.log('\n\nSTEP 3: Fixing data quality issues...');
    
    // Fix incidents with victim_name but no subject_name (standardize)
    const nameFixes = await client.query(`
      UPDATE incidents 
      SET subject_name = victim_name 
      WHERE (subject_name IS NULL OR subject_name = '') 
        AND victim_name IS NOT NULL AND victim_name != ''
      RETURNING id, subject_name
    `);
    if (nameFixes.rowCount > 0) {
      console.log(`✓ Standardized ${nameFixes.rowCount} name fields`);
    }
    
    // Fix missing cities from incident data
    const cityFixes = await client.query(`
      UPDATE incidents
      SET city = 'Minneapolis'
      WHERE id = 10 AND (city IS NULL OR city = '')
      RETURNING id
    `);
    if (cityFixes.rowCount > 0) {
      console.log('✓ Fixed Minneapolis shooting city field');
    }
    
    // Fix missing incident types
    const typeFixes = await client.query(`
      UPDATE incidents
      SET incident_type = 'death_in_custody'
      WHERE incident_type IS NULL OR incident_type = ''
      RETURNING id
    `);
    if (typeFixes.rowCount > 0) {
      console.log(`✓ Fixed ${typeFixes.rowCount} missing incident types`);
    }
    
    // STEP 4: Report final state
    console.log('\n\n=== FINAL DATABASE STATE ===\n');
    
    const finalCount = await client.query('SELECT COUNT(*) FROM incidents');
    console.log('Total incidents:', finalCount.rows[0].count);
    
    const finalStatus = await client.query(`
      SELECT verification_status, COUNT(*) as count 
      FROM incidents 
      GROUP BY verification_status 
      ORDER BY count DESC
    `);
    console.log('\nBy status:');
    finalStatus.rows.forEach(r => console.log(`  ${r.verification_status || 'null'}: ${r.count}`));
    
    const finalTypes = await client.query(`
      SELECT incident_type, COUNT(*) as count 
      FROM incidents 
      GROUP BY incident_type 
      ORDER BY count DESC
    `);
    console.log('\nBy type:');
    finalTypes.rows.forEach(r => console.log(`  ${r.incident_type || 'null'}: ${r.count}`));
    
    console.log('\n✅ Cleanup complete!');
    
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch(console.error);
