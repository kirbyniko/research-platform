const { Pool } = require('pg');

const pool = new Pool({
  user: 'ice_admin',
  password: 'localdev',
  host: 'localhost',
  database: 'ice_incidents_db',
  port: 5432
});

async function checkSubmissions() {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        status, 
        created_at, 
        email,
        submission_data->>'victimName' as victim_name,
        submission_data->>'description' as description
      FROM guest_submissions 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`Total guest submissions: ${result.rowCount}`);
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSubmissions();
