const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
  connectionString: process.env.PRODUCTION_DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function check() {
  try {
    // First, check what columns exist
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incidents' 
      ORDER BY ordinal_position
    `);
    console.log('=== INCIDENTS TABLE COLUMNS ===');
    console.log(columns.rows.map(r => r.column_name).join(', '));
    
    // Get the supreme test case
    const result = await pool.query(`
      SELECT id, incident_id, incident_type, incident_types, victim_name, subject_name
      FROM incidents 
      WHERE incident_id LIKE '%supreme%'
    `);
    
    console.log('=== INCIDENT DATA ===');
    console.log(JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length > 0) {
      const incidentId = result.rows[0].id;
      
      // Get agencies
      const agencies = await pool.query(`
        SELECT * FROM incident_agencies WHERE incident_id = $1
      `, [incidentId]);
      console.log('\n=== AGENCIES ===');
      console.log(JSON.stringify(agencies.rows, null, 2));
      
      // Get violations
      const violations = await pool.query(`
        SELECT * FROM incident_violations WHERE incident_id = $1
      `, [incidentId]);
      console.log('\n=== VIOLATIONS ===');
      console.log(JSON.stringify(violations.rows, null, 2));
      
      // Get details
      const details = await pool.query(`
        SELECT detail_type, details FROM incident_details WHERE incident_id = $1
      `, [incidentId]);
      console.log('\n=== INCIDENT DETAILS (type-specific) ===');
      details.rows.forEach(row => {
        console.log(`\n--- ${row.detail_type} ---`);
        console.log(JSON.stringify(row.details, null, 2));
      });
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

check();
