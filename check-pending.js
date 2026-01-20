require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT id, incident_id, victim_name, incident_type, verification_status FROM incidents WHERE verification_status = 'pending' ORDER BY created_at DESC LIMIT 10");
  console.log('Recent pending incidents:\n');
  r.rows.forEach(x => console.log(`  ${x.id}: ${x.victim_name || x.incident_id} (${x.incident_type})`));
  await c.end();
}

run();
