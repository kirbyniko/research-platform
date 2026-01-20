const { Pool } = require('pg');

async function checkCase83Types() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT incident_id, incident_types
      FROM incidents
      WHERE id = 83
    `);
    
    if (result.rows.length > 0) {
      console.log('\nCase 83 incident types:', result.rows[0].incident_types);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkCase83Types();
