// Delete duplicate Renee Good entry with numeric ID
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function deleteDuplicate() {
  const client = await pool.connect();
  
  try {
    // Delete the duplicate with ID 1001 (numeric)
    const result = await client.query(`
      DELETE FROM incidents WHERE id = 62 RETURNING *
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Deleted duplicate Renee Good entry (ID: 62, incident_id: 1001)');
    } else {
      console.log('⚠️ No duplicate found to delete');
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

deleteDuplicate().catch(console.error);
