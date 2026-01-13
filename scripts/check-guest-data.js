// Check and restore guest submission data
const { Pool } = require('pg');
const fs = require('fs');

async function restore() {
  const envContent = fs.readFileSync('.env.prod.temp', 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
  const dbUrl = match[1];
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get full guest submissions data
    console.log('\n📊 Full guest submissions data:');
    const subs = await pool.query(`
      SELECT id, status, created_at, reviewed_at, submission_data, email
      FROM guest_submissions
      ORDER BY id DESC
    `);
    
    for (const row of subs.rows) {
      console.log(`\n=== Submission ID ${row.id} (${row.status}) ===`);
      console.log('Created:', row.created_at);
      console.log('Reviewed:', row.reviewed_at);
      console.log('Email:', row.email);
      console.log('Data:', JSON.stringify(row.submission_data, null, 2));
    }
    
    // Check incidents with NULL victim_name
    console.log('\n\n📊 Incidents with NULL victim_name (recent):');
    const nullIncidents = await pool.query(`
      SELECT id, victim_name, subject_name, incident_date, summary, verification_status, created_at
      FROM incidents
      WHERE victim_name IS NULL
      ORDER BY id DESC
      LIMIT 10
    `);
    
    for (const row of nullIncidents.rows) {
      console.log(`\n=== Incident ID ${row.id} ===`);
      console.log('victim_name:', row.victim_name);
      console.log('subject_name:', row.subject_name);
      console.log('incident_date:', row.incident_date);
      console.log('summary:', row.summary?.substring(0, 100));
      console.log('verification_status:', row.verification_status);
      console.log('created_at:', row.created_at);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

restore();
