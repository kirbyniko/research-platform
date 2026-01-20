const { Pool } = require('pg');

async function checkCase83() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT id, detail_type, details
      FROM incident_details
      WHERE incident_id = 83
      ORDER BY detail_type
    `);
    
    console.log(`\nFound ${result.rows.length} detail records for case 83:\n`);
    
    for (const row of result.rows) {
      console.log(`ID: ${row.id}, Type: ${row.detail_type}`);
      console.log('Fields:', Object.keys(row.details).join(', '));
      console.log('---');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkCase83();
