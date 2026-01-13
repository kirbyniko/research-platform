// Fix the one backward incident
const { Pool } = require('pg');
const fs = require('fs');

async function fixBackward() {
  const envFile = fs.readFileSync('.env.prod.temp', 'utf8');
  const dbUrlMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
  const DATABASE_URL = dbUrlMatch[1].trim();
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    console.log('🔧 Fixing backward incident...\n');
    
    // Find it first
    const find = await client.query(`
      SELECT id, incident_id, subject_name, verified, verification_status
      FROM incidents
      WHERE (verified = false OR verified IS NULL) AND verification_status = 'verified'
    `);
    
    console.log('Found incident:');
    console.table(find.rows);
    
    // This incident should be set to pending since verified=false
    const result = await client.query(`
      UPDATE incidents 
      SET verification_status = 'pending'
      WHERE (verified = false OR verified IS NULL) AND verification_status = 'verified'
      RETURNING id, incident_id, subject_name, verified, verification_status
    `);
    
    console.log('\n✅ Fixed:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixBackward();
