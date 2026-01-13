require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addColumns() {
  try {
    console.log('Adding soft delete columns to guest_submissions...');
    
    await pool.query(`
      ALTER TABLE guest_submissions 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS deletion_reason TEXT
    `);
    
    console.log('✅ Successfully added deleted_at and deletion_reason columns');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error);
  } finally {
    await pool.end();
  }
}

addColumns();
