// Deep Data Verification Script
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function verify() {
  const client = await pool.connect();
  
  try {
    console.log('=== DEEP DATA VERIFICATION ===\n');
    
    // Get all incidents with their sources and quotes
    const incidents = await client.query(`
      SELECT 
        i.id, i.incident_id, i.subject_name, i.victim_name, 
        i.incident_date, i.city, i.state, i.facility,
        i.incident_type, i.verification_status, i.summary,
        i.subject_age, i.subject_nationality, i.subject_gender,
        i.created_at,
        (SELECT COUNT(*) FROM incident_sources WHERE incident_id = i.id) as source_count,
        (SELECT COUNT(*) FROM incident_quotes WHERE incident_id = i.id) as quote_count
      FROM incidents i
      ORDER BY i.incident_date DESC NULLS LAST, i.id
    `);
    
    console.log(`Total incidents: ${incidents.rows.length}\n`);
    
    // Categorize by data quality
    const complete = [];
    const needsWork = [];
    const suspicious = [];
    
    for (const inc of incidents.rows) {
      const issues = [];
      
      // Check required fields
      if (!inc.subject_name && !inc.victim_name) issues.push('Missing name');
      if (!inc.incident_date) issues.push('Missing date');
      if (!inc.city && !inc.state) issues.push('Missing location');
      if (!inc.summary || inc.summary.length < 20) issues.push('Missing/short summary');
      
      // Check sources
      if (inc.source_count == 0) issues.push('No sources');
      
      // Check for suspicious patterns
      if ((inc.subject_name || '').length < 3) issues.push('Name too short');
      if ((inc.summary || '').includes('test')) issues.push('Contains "test"');
      
      // Get sources for this incident
      const sources = await client.query(`
        SELECT url, title, publication FROM incident_sources WHERE incident_id = $1
      `, [inc.id]);
      
      // Categorize
      if (issues.length === 0 && inc.source_count > 0) {
        complete.push({ ...inc, sources: sources.rows });
      } else if (issues.length <= 2 && !issues.includes('Missing name')) {
        needsWork.push({ ...inc, issues, sources: sources.rows });
      } else {
        suspicious.push({ ...inc, issues, sources: sources.rows });
      }
    }
    
    // Report complete cases
    console.log('=== VERIFIED QUALITY DATA ===');
    console.log(`${complete.length} incidents are complete with sources:\n`);
    complete.slice(0, 10).forEach(inc => {
      const name = inc.subject_name || inc.victim_name;
      const date = inc.incident_date ? new Date(inc.incident_date).toISOString().split('T')[0] : 'N/A';
      console.log(`✓ ${name} (${date})`);
      console.log(`  Location: ${inc.city || '?'}, ${inc.state || '?'}`);
      console.log(`  Sources: ${inc.source_count}`);
      inc.sources.forEach(s => console.log(`    - ${s.title || s.url}`));
      console.log();
    });
    if (complete.length > 10) {
      console.log(`... and ${complete.length - 10} more complete records\n`);
    }
    
    // Report cases needing work
    console.log('\n=== NEEDS MINOR FIXES ===');
    console.log(`${needsWork.length} incidents need minor work:\n`);
    needsWork.forEach(inc => {
      const name = inc.subject_name || inc.victim_name || 'Unknown';
      console.log(`⚠ ${name} (ID: ${inc.id})`);
      console.log(`  Issues: ${inc.issues.join(', ')}`);
      console.log();
    });
    
    // Report suspicious cases
    console.log('\n=== POTENTIALLY PROBLEMATIC ===');
    console.log(`${suspicious.length} incidents may need review:\n`);
    suspicious.forEach(inc => {
      const name = inc.subject_name || inc.victim_name || 'Unknown';
      console.log(`❌ ${name} (ID: ${inc.id})`);
      console.log(`  Issues: ${inc.issues.join(', ')}`);
      console.log(`  Summary: ${(inc.summary || '').substring(0, 80)}...`);
      console.log();
    });
    
    // Summary stats
    console.log('\n=== SUMMARY ===');
    console.log(`Complete/verified quality: ${complete.length}`);
    console.log(`Minor fixes needed: ${needsWork.length}`);
    console.log(`Needs review: ${suspicious.length}`);
    
    // Check for known real cases that might be missing
    console.log('\n\n=== KNOWN CASE VERIFICATION ===');
    console.log('Checking for key documented ICE deaths...\n');
    
    const knownNames = [
      { name: 'Serawit', desc: 'Ethiopian woman, Eloy, Jan 2025' },
      { name: 'Dejene', desc: 'Ethiopian woman, Eloy, Jan 2025' },
      { name: 'Francisco Gaspar', desc: 'Fort Bliss, Dec 2025' },
      { name: 'Marie Ange Blaise', desc: 'Haitian woman, April 2025' },
      { name: 'Isidro Pérez', desc: 'Cuban man, June 2025' },
    ];
    
    for (const known of knownNames) {
      const found = await client.query(`
        SELECT id, subject_name, victim_name, incident_date 
        FROM incidents 
        WHERE subject_name ILIKE $1 OR victim_name ILIKE $1
      `, [`%${known.name}%`]);
      
      if (found.rows.length > 0) {
        console.log(`✓ Found: ${known.desc}`);
      } else {
        console.log(`❌ Missing: ${known.desc}`);
      }
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch(console.error);
