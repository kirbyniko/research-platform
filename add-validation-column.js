/**
 * Add require_different_validator column to projects table
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to database\n');
    
    console.log('Adding require_different_validator column to projects table...');
    await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS require_different_validator BOOLEAN DEFAULT false
    `);
    
    console.log('✅ Column added successfully!\n');
    
    // Verify column exists
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name = 'require_different_validator'
    `);
    
    if (result.rows.length > 0) {
      console.log('Verification:');
      console.log(`  Column: ${result.rows[0].column_name}`);
      console.log(`  Type: ${result.rows[0].data_type}`);
      console.log(`  Default: ${result.rows[0].column_default}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addColumn();
