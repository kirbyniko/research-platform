require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, victim_name, subject_name 
      FROM incidents 
      WHERE id IN (83, 90)
      ORDER BY id
    `);
    
    console.log('\nVictim names in database:');
    result.rows.forEach(row => {
      console.log(`\nID ${row.id}:`);
      console.log(`  victim_name: "${row.victim_name}"`);
      console.log(`  subject_name: "${row.subject_name}"`);
    });
  } finally {
    client.release();
    await pool.end();
  }
})();
