/**
 * Check Records Table Schema
 */

require('dotenv').config({ path: '.env.production', override: true });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== RECORDS TABLE SCHEMA ===\n');
    result.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
