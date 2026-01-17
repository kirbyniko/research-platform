const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Use production database
const pool = new Pool({ connectionString: process.env.PRODUCTION_DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding review lock columns to PRODUCTION incidents table...');
    
    // Add locked_by column
    await client.query(`
      ALTER TABLE incidents 
      ADD COLUMN IF NOT EXISTS locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('✓ Added locked_by column');
    
    // Add locked_at column
    await client.query(`
      ALTER TABLE incidents 
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✓ Added locked_at column');
    
    // Add lock_expires_at column
    await client.query(`
      ALTER TABLE incidents 
      ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✓ Added lock_expires_at column');
    
    // Create indexes for efficient lock queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_locked_by ON incidents(locked_by)
    `);
    console.log('✓ Created index on locked_by');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_lock_expires_at ON incidents(lock_expires_at)
    `);
    console.log('✓ Created index on lock_expires_at');
    
    await client.query('COMMIT');
    
    console.log('\n✅ PRODUCTION Review lock migration completed successfully!');
    
    // Show current table structure
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'incidents' 
      AND column_name LIKE 'lock%'
      ORDER BY ordinal_position
    `);
    
    console.log('\nNew lock columns:');
    cols.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

runMigration().catch(console.error);
