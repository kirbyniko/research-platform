// Reset case 83 to pending status in PRODUCTION database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetCase83Production() {
  const client = await pool.connect();
  try {
    // First show current status
    console.log('\n=== PRODUCTION DATABASE - BEFORE RESET ===');
    let result = await client.query('SELECT id, subject_name, victim_name, verification_status, first_verified_at FROM incidents WHERE id = 83');
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
    
    console.log('\n=== PRODUCTION DATABASE - AFTER RESET ===');
    result = await client.query('SELECT id, subject_name, victim_name, verification_status, first_verified_at FROM incidents WHERE id = 83');
    console.log('✅ Case 83 reset to pending status IN PRODUCTION');
    console.log('New status:', result.rows[0]);
    console.log('\nYou can now review it again in the extension using production URL');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetCase83Production();
