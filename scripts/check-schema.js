// Check incidents table schema
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    const r = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incidents' 
      ORDER BY ordinal_position
    `);
    console.log('incidents table columns:');
    r.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);
