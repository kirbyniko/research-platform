const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

async function addVerifiedColumns() {
  const client = await pool.connect();
  
  try {
    // Check if verified column exists in cases
    const checkCases = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'verified'
    `);
    
    if (checkCases.rows.length === 0) {
      console.log('Adding verified column to cases...');
      await client.query(`ALTER TABLE cases ADD COLUMN verified BOOLEAN DEFAULT false`);
    } else {
      console.log('Verified column already exists in cases');
    }
    
    // Check if verified column exists in timeline_events
    const checkTimeline = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'timeline_events' AND column_name = 'verified'
    `);
    
    if (checkTimeline.rows.length === 0) {
      console.log('Adding verified column to timeline_events...');
      await client.query(`ALTER TABLE timeline_events ADD COLUMN verified BOOLEAN DEFAULT false`);
    } else {
      console.log('Verified column already exists in timeline_events');
    }
    
    // Check if verified column exists in sources
    const checkSources = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'sources' AND column_name = 'verified'
    `);
    
    if (checkSources.rows.length === 0) {
      console.log('Adding verified column to sources...');
      await client.query(`ALTER TABLE sources ADD COLUMN verified BOOLEAN DEFAULT false`);
    } else {
      console.log('Verified column already exists in sources');
    }
    
    // Check if verified column exists in discrepancies
    const checkDiscrepancies = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'discrepancies' AND column_name = 'verified'
    `);
    
    if (checkDiscrepancies.rows.length === 0) {
      console.log('Adding verified column to discrepancies...');
      await client.query(`ALTER TABLE discrepancies ADD COLUMN verified BOOLEAN DEFAULT false`);
    } else {
      console.log('Verified column already exists in discrepancies');
    }
    
    // Reset all to unverified so human can verify
    console.log('\nSetting all items to unverified...');
    await client.query(`UPDATE cases SET verified = false, verified_by = NULL, verified_at = NULL`);
    await client.query(`UPDATE timeline_events SET verified = false`);
    await client.query(`UPDATE sources SET verified = false`);
    await client.query(`UPDATE discrepancies SET verified = false`);
    
    // Get counts
    const casesCount = await client.query(`SELECT COUNT(*) FROM cases`);
    const timelineCount = await client.query(`SELECT COUNT(*) FROM timeline_events`);
    const sourcesCount = await client.query(`SELECT COUNT(*) FROM sources`);
    const discrepanciesCount = await client.query(`SELECT COUNT(*) FROM discrepancies`);
    
    console.log('\nAll items set to unverified:');
    console.log(`- Cases: ${casesCount.rows[0].count}`);
    console.log(`- Timeline Events: ${timelineCount.rows[0].count}`);
    console.log(`- Sources: ${sourcesCount.rows[0].count}`);
    console.log(`- Discrepancies: ${discrepanciesCount.rows[0].count}`);
    
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

addVerifiedColumns();
