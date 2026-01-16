const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
  
  // Check if incident_details exists
  const details = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='incident_details' ORDER BY ordinal_position");
  if (details.rows.length > 0) {
    console.log('\nincident_details columns:', details.rows.map(r => r.column_name).join(', '));
  }
  
  await pool.end();
}
run();
