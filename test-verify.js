const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    console.log('Before update:');
    let result = await pool.query(`
      SELECT id, incident_id, subject_name, verified, verification_status 
      FROM incidents 
      WHERE id = 41
    `);
    console.log(result.rows[0]);
    
    console.log('\nUpdating to verified = true...');
    await pool.query(`
      UPDATE incidents 
      SET verified = $1, verification_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [true, 'verified', 41]);
    
    console.log('\nAfter update:');
    result = await pool.query(`
      SELECT id, incident_id, subject_name, verified, verification_status 
      FROM incidents 
      WHERE id = 41
    `);
    console.log(result.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
