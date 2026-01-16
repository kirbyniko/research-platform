const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkRecent() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, incident_id, subject_name, incident_type, incident_date, city, state
      FROM incidents 
      WHERE id >= 61 
      ORDER BY id
    `);
    
    console.log(`\n=== Recently Added Incidents (ID >= 61) ===\n`);
    result.rows.forEach(row => {
      console.log(`ID ${row.id}: ${row.subject_name}`);
      console.log(`  Type: ${row.incident_type}`);
      console.log(`  Date: ${row.incident_date}`);
      console.log(`  Location: ${row.city}, ${row.state}`);
      console.log(`  incident_id: ${row.incident_id}\n`);
    });
    
    console.log(`Total new incidents: ${result.rows.length}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkRecent().catch(console.error);
