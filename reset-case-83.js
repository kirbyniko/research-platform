// Reset case 83 to pending status for testing
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

async function resetCase83() {
  const client = await pool.connect();
  try {
    // First show current status
    console.log('\n=== BEFORE RESET ===');
    let result = await client.query('SELECT id, subject_name, victim_name, verification_status, created_at FROM incidents WHERE id = 83');
    console.log('Current status:', result.rows[0]);
    
    // Reset verification status to pending
    await client.query(`
      UPDATE incidents 
      SET 
        verification_status = 'pending',
        first_verified_by = NULL,
        first_verified_at = NULL,
        second_verified_by = NULL,
        second_verified_at = NULL
      WHERE id = 83
    `);
    
    console.log('\n=== AFTER RESET ===');
    result = await client.query('SELECT id, subject_name, victim_name, verification_status, created_at FROM incidents WHERE id = 83');
    console.log('✅ Case 83 reset to pending status');
    console.log('New status:', result.rows[0]);
    console.log('\nYou can now review it again in the extension');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetCase83();
