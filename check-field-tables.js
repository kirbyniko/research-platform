require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%field%'
      ORDER BY table_name
    `);
    
    console.log('Tables with "field" in name:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
