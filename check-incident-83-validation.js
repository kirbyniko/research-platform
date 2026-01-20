require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkIncident83() {
  try {
    // Get incident data
    const incident = await pool.query('SELECT * FROM incidents WHERE id = 83');
    console.log('\n=== INCIDENT 83 ===');
    console.log('Name:', incident.rows[0].victim_name);
    console.log('Types:', incident.rows[0].incident_types);
    
    // Get details
    const details = await pool.query('SELECT * FROM incident_details WHERE incident_id = 83');
    console.log('\n=== INCIDENT DETAILS ===');
    console.log('Count:', details.rows.length);
    details.rows.forEach(d => {
      console.log(`\nType: ${d.detail_type}`);
      console.log('Details:', JSON.stringify(d.details, null, 2));
    });
    
    // Get quotes
    const quotes = await pool.query('SELECT id, quote_text FROM incident_quotes WHERE incident_id = 83');
    console.log('\n=== QUOTES ===');
    console.log('Count:', quotes.rows.length);
    
    // Get timeline
    const timeline = await pool.query('SELECT id, description FROM incident_timeline WHERE incident_id = 83');
    console.log('\n=== TIMELINE ===');
    console.log('Count:', timeline.rows.length);
    
    // Get sources
    const sources = await pool.query('SELECT id, title FROM incident_sources WHERE incident_id = 83');
    console.log('\n=== SOURCES ===');
    console.log('Count:', sources.rows.length);
    
    // Get media
    const media = await pool.query('SELECT id, media_type FROM incident_media WHERE incident_id = 83');
    console.log('\n=== MEDIA ===');
    console.log('Count:', media.rows.length);
    
    // Get agencies
    const agencies = await pool.query('SELECT id, agency FROM incident_agencies WHERE incident_id = 83');
    console.log('\n=== AGENCIES ===');
    console.log('Count:', agencies.rows.length);
    
    // Get violations
    const violations = await pool.query('SELECT id, violation_type FROM incident_violations WHERE incident_id = 83');
    console.log('\n=== VIOLATIONS ===');
    console.log('Count:', violations.rows.length);
    
    // Calculate total validation items
    let totalItems = 0;
    
    // Count non-empty fields in incident
    const fieldKeys = [
      'incident_type', 'incident_date', 'city', 'state', 'country', 'facility',
      'victim_name', 'subject_age', 'subject_gender', 'subject_nationality',
      'subject_immigration_status', 'summary'
    ];
    
    fieldKeys.forEach(key => {
      const value = incident.rows[0][key];
      if (value !== null && value !== undefined && value !== '') {
        totalItems++;
      }
    });
    
    console.log('\n=== TOTAL VALIDATION ITEMS ===');
    console.log('Fields:', totalItems);
    console.log('Detail fields:', details.rows.reduce((sum, d) => {
      return sum + Object.keys(d.details || {}).filter(k => {
        const v = d.details[k];
        return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
      }).length;
    }, 0));
    console.log('Quotes:', quotes.rows.length);
    console.log('Timeline:', timeline.rows.length);
    console.log('Sources:', sources.rows.length);
    console.log('Media:', media.rows.length);
    console.log('Agencies:', agencies.rows.length);
    console.log('Violations:', violations.rows.length);
    
    const grandTotal = totalItems + 
      details.rows.reduce((sum, d) => sum + Object.keys(d.details || {}).filter(k => {
        const v = d.details[k];
        return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
      }).length, 0) +
      quotes.rows.length + 
      timeline.rows.length + 
      sources.rows.length + 
      media.rows.length + 
      agencies.rows.length + 
      violations.rows.length;
    
    console.log('GRAND TOTAL:', grandTotal);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkIncident83();
