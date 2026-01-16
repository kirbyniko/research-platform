// Add additional sources to thin cases where we found them
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

// Additional sources found through research
const additionalSources = [
  // The Minneapolis shooting (Renee Good / "Unnamed Woman") already has 8 sources

  // For Isidro Pérez - CBS Miami reported on a Cuban man dying in ICE custody in Miami
  // But this appears to be a different case - need to verify
  
  // For Shiraz Fatehali Sachwani - ICE press release exists but redirecting
  // Source: https://www.ice.gov/news/releases/criminal-illegal-alien-pakistan-passes-away-suspected-natural-causes-fort-worth
];

async function addSources() {
  const client = await pool.connect();
  
  try {
    console.log('=== Cases with only 1 source that need additional sourcing ===\n');
    
    // Get all cases with only 1 source
    const thinCases = await client.query(`
      SELECT i.id, i.subject_name, i.incident_date, i.facility, i.state,
             (SELECT url FROM incident_sources s WHERE s.incident_id = i.id LIMIT 1) as existing_source
      FROM incidents i
      WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = i.id) = 1
      ORDER BY i.incident_date DESC
    `);
    
    console.log(`Found ${thinCases.rows.length} cases with only 1 source:\n`);
    
    thinCases.rows.forEach((c, i) => {
      const date = c.incident_date ? new Date(c.incident_date).toISOString().split('T')[0] : 'n/a';
      console.log(`${i + 1}. ${c.subject_name} (${date})`);
      console.log(`   Facility: ${c.facility || 'Unknown'}, ${c.state || 'Unknown'}`);
      console.log(`   Existing source: ${c.existing_source || 'None'}`);
      console.log('');
    });
    
    // Show summary by verification status
    const summary = await client.query(`
      SELECT 
        verification_status,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = incidents.id) = 1) as single_source,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = incidents.id) >= 2) as multi_source
      FROM incidents
      GROUP BY verification_status
    `);
    
    console.log('\n=== Source Coverage by Status ===');
    summary.rows.forEach(row => {
      console.log(`${row.verification_status}: ${row.count} total (${row.single_source} with 1 source, ${row.multi_source} with 2+ sources)`);
    });
    
    // Total summary
    const total = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = incidents.id) = 1) as single_source,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = incidents.id) >= 2) as multi_source,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = incidents.id) >= 3) as three_plus
      FROM incidents
    `);
    
    const t = total.rows[0];
    console.log(`\n=== Overall Source Coverage ===`);
    console.log(`Total incidents: ${t.total}`);
    console.log(`  1 source only: ${t.single_source} (${Math.round(t.single_source / t.total * 100)}%)`);
    console.log(`  2+ sources: ${t.multi_source} (${Math.round(t.multi_source / t.total * 100)}%)`);
    console.log(`  3+ sources: ${t.three_plus} (${Math.round(t.three_plus / t.total * 100)}%)`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

addSources().catch(console.error);
