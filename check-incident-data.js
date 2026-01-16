const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkIncident(incidentId) {
  console.log(`\n=== Checking Incident ${incidentId} ===\n`);
  
  try {
    // Get main incident data
    const incident = await pool.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
    if (incident.rows.length === 0) {
      console.log('❌ Incident not found');
      return;
    }
    
    console.log('✓ Incident found:');
    console.log('  - Type:', incident.rows[0].incident_type);
    console.log('  - Name:', incident.rows[0].victim_name || incident.rows[0].subject_name);
    console.log('  - Status:', incident.rows[0].verification_status);
    console.log('');
    
    // Check sources
    const sources = await pool.query('SELECT * FROM incident_sources WHERE incident_id = $1', [incidentId]);
    console.log(`✓ Sources: ${sources.rows.length}`);
    sources.rows.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.title || 'Untitled'} - ${s.url}`);
    });
    console.log('');
    
    // Check quotes
    const quotes = await pool.query(`
      SELECT q.*, s.title as source_title 
      FROM incident_quotes q 
      LEFT JOIN incident_sources s ON q.source_id = s.id 
      WHERE q.incident_id = $1
    `, [incidentId]);
    console.log(`✓ Quotes: ${quotes.rows.length}`);
    quotes.rows.forEach((q, i) => {
      console.log(`  ${i+1}. "${q.quote_text.substring(0, 50)}..." [Source: ${q.source_title || 'None'}]`);
    });
    console.log('');
    
    // Check quote-field links
    const links = await pool.query(`
      SELECT qfl.*, q.quote_text, s.title as source_title
      FROM quote_field_links qfl
      LEFT JOIN incident_quotes q ON qfl.quote_id = q.id
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE qfl.incident_id = $1
    `, [incidentId]);
    console.log(`✓ Quote-Field Links: ${links.rows.length}`);
    if (links.rows.length === 0) {
      console.log('  ⚠️ No quote-field links found! Quotes are not linked to fields.');
    } else {
      links.rows.forEach((l, i) => {
        console.log(`  ${i+1}. ${l.field_name} ← "${l.quote_text?.substring(0, 40)}..." [${l.source_title || 'No source'}]`);
      });
    }
    console.log('');
    
    // Check agencies
    const agencies = await pool.query('SELECT * FROM incident_agencies WHERE incident_id = $1', [incidentId]);
    console.log(`✓ Agencies: ${agencies.rows.length}`);
    agencies.rows.forEach((a, i) => {
      console.log(`  ${i+1}. ${a.agency}`);
    });
    console.log('');
    
    // Check violations
    const violations = await pool.query('SELECT * FROM incident_violations WHERE incident_id = $1', [incidentId]);
    console.log(`✓ Violations: ${violations.rows.length}`);
    violations.rows.forEach((v, i) => {
      console.log(`  ${i+1}. ${v.violation_type}`);
    });
    console.log('');
    
    // Check incident_details (for case law)
    const details = await pool.query('SELECT * FROM incident_details WHERE incident_id = $1', [incidentId]);
    console.log(`✓ Incident Details Records: ${details.rows.length}`);
    details.rows.forEach((d, i) => {
      console.log(`  ${i+1}. Type: ${d.detail_type}`);
      if (d.detail_type === 'violation_legal_basis') {
        console.log(`      Case law data: ${JSON.stringify(d.details).substring(0, 100)}...`);
      }
    });
    console.log('');
    
    // Check timeline
    const timeline = await pool.query('SELECT * FROM incident_timeline WHERE incident_id = $1', [incidentId]);
    console.log(`✓ Timeline: ${timeline.rows.length}`);
    timeline.rows.forEach((t, i) => {
      console.log(`  ${i+1}. ${t.event_date || 'No date'}: ${t.description?.substring(0, 50) || 'No description'}...`);
    });
    console.log('');
    
    // Check media
    const media = await pool.query('SELECT * FROM incident_media WHERE incident_id = $1', [incidentId]);
    console.log(`✓ Media: ${media.rows.length}`);
    console.log('');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Get incident ID from command line
const incidentId = parseInt(process.argv[2]);
if (!incidentId) {
  console.log('Usage: node check-incident-data.js <incident_id>');
  console.log('Example: node check-incident-data.js 22');
  process.exit(1);
}

checkIncident(incidentId);
