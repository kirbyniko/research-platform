import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'record_types' 
      ORDER BY ordinal_position
    `);
    console.log('record_types columns:');
    result.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
  } finally {
    await pool.end();
  }
}

main();
