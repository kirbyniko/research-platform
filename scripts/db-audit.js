// Database Audit Script
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function audit() {
  const client = await pool.connect();
  
  try {
    console.log('=== DATABASE AUDIT ===\n');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tables in database:');
    tablesResult.rows.forEach(r => console.log('  -', r.table_name));
    
    // Count incidents
    const incidentCount = await client.query('SELECT COUNT(*) FROM incidents');
    console.log('\n=== INCIDENTS SUMMARY ===');
    console.log('Total incidents:', incidentCount.rows[0].count);
    
    // Get incident status breakdown
    const statusBreakdown = await client.query(`
      SELECT verification_status, COUNT(*) as count 
      FROM incidents 
      GROUP BY verification_status 
      ORDER BY count DESC
    `);
    console.log('\nBy verification status:');
    statusBreakdown.rows.forEach(r => console.log(`  ${r.verification_status || 'null'}: ${r.count}`));
    
    // Get incident type breakdown
    const typeBreakdown = await client.query(`
      SELECT incident_type, COUNT(*) as count 
      FROM incidents 
      GROUP BY incident_type 
      ORDER BY count DESC
    `);
    console.log('\nBy incident type:');
    typeBreakdown.rows.forEach(r => console.log(`  ${r.incident_type || 'null'}: ${r.count}`));
    
    // List all incidents with key fields
    console.log('\n=== ALL INCIDENTS ===');
    const incidents = await client.query(`
      SELECT id, incident_id, subject_name, victim_name, incident_date, 
             city, state, facility, incident_type, verification_status,
             summary, created_at
      FROM incidents 
      ORDER BY id
    `);
    
    incidents.rows.forEach(i => {
      console.log(`\n--- ID: ${i.id} (${i.incident_id || 'no-incident-id'}) ---`);
      console.log(`  Name: ${i.subject_name || i.victim_name || 'MISSING'}`);
      console.log(`  Date: ${i.incident_date || 'MISSING'}`);
      console.log(`  Location: ${i.city || '?'}, ${i.state || '?'}`);
      console.log(`  Facility: ${i.facility || 'N/A'}`);
      console.log(`  Type: ${i.incident_type || 'MISSING'}`);
      console.log(`  Status: ${i.verification_status || 'pending'}`);
      console.log(`  Summary: ${(i.summary || '').substring(0, 100)}${(i.summary || '').length > 100 ? '...' : ''}`);
      console.log(`  Created: ${i.created_at}`);
    });
    
    // Check for sources
    const sourceCount = await client.query('SELECT COUNT(*) FROM incident_sources');
    console.log('\n=== SOURCES ===');
    console.log('Total sources:', sourceCount.rows[0].count);
    
    // Check for quotes
    const quoteCount = await client.query('SELECT COUNT(*) FROM incident_quotes');
    console.log('\n=== QUOTES ===');
    console.log('Total quotes:', quoteCount.rows[0].count);
    
    // Check for users
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log('\n=== USERS ===');
    console.log('Total users:', userCount.rows[0].count);
    
    // Check guest submissions
    try {
      const guestCount = await client.query('SELECT COUNT(*) FROM guest_submissions');
      console.log('\n=== GUEST SUBMISSIONS ===');
      console.log('Total guest submissions:', guestCount.rows[0].count);
    } catch (e) {
      console.log('\nNo guest_submissions table');
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

audit().catch(console.error);
