const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkVerifierStats() {
  try {
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'verifier_stats'
    `);
    
    if (tables.rows.length > 0) {
      console.log('✓ verifier_stats table exists');
      
      const cols = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'verifier_stats'
        ORDER BY ordinal_position
      `);
      
      console.log('\nColumns:');
      cols.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('✗ verifier_stats table does NOT exist');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVerifierStats();
