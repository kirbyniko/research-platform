require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function summary() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  // Statements
  const stmtCount = await client.query("SELECT verification_status, COUNT(*) FROM statements GROUP BY verification_status");
  console.log('\n=== STATEMENTS ===');
  stmtCount.rows.forEach(r => console.log(`  ${r.verification_status}: ${r.count}`));
  
  const stmtSources = await client.query("SELECT COUNT(*) as c FROM statement_sources");
  const stmtQuotes = await client.query("SELECT COUNT(*) as c FROM statement_quotes");
  console.log(`  Sources: ${stmtSources.rows[0].c}, Quotes: ${stmtQuotes.rows[0].c}`);

  // Incidents
  const incCount = await client.query("SELECT verification_status, COUNT(*) FROM incidents GROUP BY verification_status");
  console.log('\n=== INCIDENTS ===');
  incCount.rows.forEach(r => console.log(`  ${r.verification_status}: ${r.count}`));
  
  const incSources = await client.query("SELECT COUNT(*) as c FROM incident_sources");
  const incQuotes = await client.query("SELECT COUNT(*) as c FROM incident_quotes");
  console.log(`  Sources: ${incSources.rows[0].c}, Quotes: ${incQuotes.rows[0].c}`);
  
  // Recent statements
  console.log('\n=== RECENT STATEMENTS ===');
  const recent = await client.query("SELECT speaker_name, statement_type, political_affiliation, breaking_ranks FROM statements ORDER BY created_at DESC LIMIT 10");
  recent.rows.forEach(r => {
    const br = r.breaking_ranks ? ' [BREAKING RANKS]' : '';
    console.log(`  ${r.speaker_name} (${r.political_affiliation || 'n/a'}) - ${r.statement_type}${br}`);
  });
  
  // Recent incidents
  console.log('\n=== RECENT INCIDENTS ===');
  const recentInc = await client.query("SELECT victim_name, facility, incident_type FROM incidents ORDER BY created_at DESC LIMIT 10");
  recentInc.rows.forEach(r => {
    console.log(`  ${r.victim_name || 'Unknown'} at ${r.facility || 'Unknown'} - ${r.incident_type}`);
  });
  
  await client.end();
}

summary().catch(console.error);
