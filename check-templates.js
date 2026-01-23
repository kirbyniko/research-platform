require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'display%'
  `);
  console.log('Display tables:', result.rows);
  
  const cols = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'project_members' 
    AND column_name = 'can_manage_appearances'
  `);
  console.log('Permission column:', cols.rows);
  
  await pool.end();
}

check().catch(console.error);
