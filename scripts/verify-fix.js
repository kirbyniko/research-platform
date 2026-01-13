// Verify the security fix was applied correctly
const { Pool } = require('pg');
const fs = require('fs');

async function verifyFix() {
  const envFile = fs.readFileSync('.env.prod.temp', 'utf8');
  const dbUrlMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
  const DATABASE_URL = dbUrlMatch[1].trim();
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    console.log('🔍 Verifying fix...\n');
    
    // Check the current state
    const result = await client.query(`
      SELECT 
        verification_status,
        verified,
        COUNT(*) as count
      FROM incidents 
      GROUP BY verification_status, verified
      ORDER BY verification_status, verified
    `);
    
    console.log('Current state of incidents:');
    console.table(result.rows);
    
    // Check if any verified=true incidents have wrong verification_status
    const badData = await client.query(`
      SELECT COUNT(*) as count
      FROM incidents
      WHERE verified = true AND verification_status != 'verified'
    `);
    
    if (badData.rows[0].count > 0) {
      console.log(`\n❌ WARNING: ${badData.rows[0].count} incidents still have verified=true but verification_status!='verified'`);
    } else {
      console.log('\n✅ All verified incidents have correct verification_status!');
    }
    
    // Check if any unverified incidents are marked as verified
    const inverse = await client.query(`
      SELECT COUNT(*) as count
      FROM incidents
      WHERE (verified = false OR verified IS NULL) AND verification_status = 'verified'
    `);
    
    if (inverse.rows[0].count > 0) {
      console.log(`\n❌ WARNING: ${inverse.rows[0].count} incidents have verified=false but verification_status='verified'`);
    } else {
      console.log('✅ No unverified incidents marked as verified!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyFix();
