const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateReviewTracking() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding review tracking columns...');
    
    // Add columns
    await client.query(`
      ALTER TABLE incidents 
      ADD COLUMN IF NOT EXISTS first_review_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS first_review_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS second_review_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS second_review_at TIMESTAMP
    `);
    
    console.log('Columns added successfully');
    
    // Update existing verified incidents
    const verifiedResult = await client.query(`
      UPDATE incidents 
      SET 
        verification_status = 'verified',
        first_review_at = updated_at,
        second_review_at = updated_at
      WHERE verified = true
      RETURNING incident_id
    `);
    
    console.log(`Updated ${verifiedResult.rowCount} verified incidents`);
    
    // Update unverified incidents
    const unverifiedResult = await client.query(`
      UPDATE incidents 
      SET verification_status = 'pending'
      WHERE verified = false OR verified IS NULL
      RETURNING incident_id
    `);
    
    console.log(`Updated ${unverifiedResult.rowCount} unverified incidents to pending`);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_first_review_by ON incidents(first_review_by);
      CREATE INDEX IF NOT EXISTS idx_incidents_second_review_by ON incidents(second_review_by);
    `);
    
    console.log('Indexes created');
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateReviewTracking();
