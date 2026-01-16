
const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.production.local', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    // Find the protest suppression test case
    const tc = await pool.query("SELECT id, incident_id, subject_name, incident_type FROM incidents WHERE subject_name LIKE '%Protest Suppression%' LIMIT 1");
    
    if (tc.rows.length === 0) {
      console.log('Protest case not found');
      return;
    }
    
    const caseId = tc.rows[0].id;
    console.log('Found case:', tc.rows[0]);
    
    // Get incident_details
    const details = await pool.query('SELECT * FROM incident_details WHERE incident_id = $1', [caseId]);
    console.log('\nincident_details rows:', details.rows.length);
    details.rows.forEach(row => {
      console.log('  detail_type:', row.detail_type);
      console.log('  details:', JSON.stringify(row.details, null, 2));
    });
    
  } finally {
    await pool.end();
  }
}
main();
