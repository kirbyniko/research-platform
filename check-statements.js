require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT id, statement_id, headline, statement_type, verification_status FROM statements ORDER BY created_at DESC LIMIT 10");
  console.log('Recent statements:\n');
  r.rows.forEach(x => console.log(`  ${x.id}: ${x.headline} (${x.statement_type}, ${x.verification_status})`));
  await c.end();
}

run();
