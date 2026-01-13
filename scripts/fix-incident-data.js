// Fix incidents data
const { Pool } = require('pg');
const fs = require('fs');

async function fix() {
  const envContent = fs.readFileSync('.env.prod.temp', 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
  const dbUrl = match[1];
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Fix incidents 48 and 49 with their guest submission data
    console.log('Fixing incident 48 (Mike Bost shot a dog)...');
    await pool.query(`
      UPDATE incidents 
      SET 
        victim_name = 'Unknown',
        incident_date = '2026-01-13',
        city = 'Madison',
        state = 'Wisconsin',
        incident_type = 'rights_violation'
      WHERE id = 48
    `);
    console.log('✅ Fixed incident 48');
    
    console.log('Fixing incident 49 (test submission)...');
    await pool.query(`
      UPDATE incidents 
      SET 
        victim_name = 'Unknown',
        incident_type = 'death_in_custody'
      WHERE id = 49
    `);
    console.log('✅ Fixed incident 49');
    
    // Sync subject_name to victim_name for all incidents
    console.log('\nSyncing subject_name to victim_name where victim_name is NULL...');
    const syncResult = await pool.query(`
      UPDATE incidents 
      SET victim_name = subject_name 
      WHERE victim_name IS NULL AND subject_name IS NOT NULL
      RETURNING id, victim_name
    `);
    console.log(`✅ Synced ${syncResult.rowCount} incidents`);
    
    // Verify
    console.log('\n📊 Verification - checking incidents 48-49:');
    const verify = await pool.query(`
      SELECT id, victim_name, incident_date, city, state, summary, incident_type
      FROM incidents
      WHERE id IN (48, 49)
    `);
    console.log(verify.rows);
    
    console.log('\n✅ Fix complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fix();
