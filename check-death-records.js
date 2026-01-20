const { Pool } = require('pg');

async function checkDeathRecords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Find all death/death_in_custody records
    const result = await pool.query(`
      SELECT incident_id, detail_type, details
      FROM incident_details
      WHERE detail_type IN ('death', 'death_in_custody')
    `);
    
    console.log(`\nFound ${result.rows.length} death-related records:\n`);
    
    for (const row of result.rows) {
      console.log(`Incident ${row.incident_id}, Type: ${row.detail_type}`);
      console.log('Fields:', Object.keys(row.details).join(', '));
      console.log('---');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkDeathRecords();
