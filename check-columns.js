const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incidents' 
      AND column_name IN ('verified', 'verification_status')
      ORDER BY column_name
    `);
    console.log('Columns in incidents table:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Also check incident 41
    const incident = await pool.query(`
      SELECT id, incident_id, subject_name, verified, verification_status 
      FROM incidents 
      WHERE id = 41
    `);
    console.log('\nIncident 41:');
    console.log(incident.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

check();
