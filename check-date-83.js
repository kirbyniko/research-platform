// Check the date for incident 83 in production
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDate() {
  const client = await pool.connect();
  try {
    console.log('\n=== CHECKING DATE FOR CASE 83 ===');
    const result = await client.query(`
      SELECT 
        id, 
        subject_name,
        incident_date,
        incident_date AT TIME ZONE 'UTC' as incident_date_utc,
        incident_date AT TIME ZONE 'America/New_York' as incident_date_et,
        verification_status,
        created_at,
        updated_at
      FROM incidents 
      WHERE id = 83
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('\nIncident 83 details:');
      console.log('  Name:', row.subject_name);
      console.log('  incident_date (raw):', row.incident_date);
      console.log('  incident_date (UTC):', row.incident_date_utc);
      console.log('  incident_date (ET):', row.incident_date_et);
      console.log('  Status:', row.verification_status);
      console.log('  Created:', row.created_at);
      console.log('  Updated:', row.updated_at);
      
      // Show what this looks like in different formats
      if (row.incident_date) {
        const date = new Date(row.incident_date);
        console.log('\n  JavaScript interpretations:');
        console.log('    toISOString():', date.toISOString());
        console.log('    toLocaleDateString():', date.toLocaleDateString());
        console.log('    toLocaleDateString(en-US):', date.toLocaleDateString('en-US'));
        console.log('    getDate():', date.getDate());
        console.log('    getUTCDate():', date.getUTCDate());
      }
    } else {
      console.log('Case 83 not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDate();
