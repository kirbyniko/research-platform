require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const r = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'incidents' ORDER BY ordinal_position`);
  console.log('Columns:', r.rows.map(x => x.column_name).join(', '));
  await p.end();
}
check().catch(console.error);
