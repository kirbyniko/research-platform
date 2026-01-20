require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'incident_quotes' ORDER BY ordinal_position");
  console.log('incident_quotes columns:', r.rows.map(x => x.column_name).join(', '));
  await c.end();
}

run();
