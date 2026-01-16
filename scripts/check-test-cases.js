const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function checkCases() {
  const total = await pool.query('SELECT COUNT(*) as total FROM incidents');
  console.log('Total incidents:', total.rows[0].total);
  
  const statusCounts = await pool.query(`SELECT verification_status, COUNT(*) as count FROM incidents GROUP BY verification_status ORDER BY count DESC`);
  console.log('\nIncidents by status:');
  statusCounts.rows.forEach(row => {
    console.log(`  ${row.verification_status}: ${row.count}`);
  });
  
  const testCases = await pool.query(`SELECT COUNT(*) as test_count FROM incidents WHERE subject_name LIKE 'TEST -%'`);
  console.log('\nTEST cases:', testCases.rows[0].test_count);
  
  const testList = await pool.query(`SELECT id, incident_id, subject_name, verification_status FROM incidents WHERE subject_name LIKE 'TEST -%' ORDER BY created_at DESC`);
  console.log('\nTest cases list:');
  testList.rows.forEach(row => {
    console.log(`- ${row.subject_name} (${row.incident_id}) - Status: ${row.verification_status}`);
  });
  
  await pool.end();
}

checkCases();
