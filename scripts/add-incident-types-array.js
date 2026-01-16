// Migration: Add incident_types array column to incidents table
const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.production.local', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if column already exists
    const checkCol = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incidents' AND column_name = 'incident_types'
    `);
    
    if (checkCol.rows.length > 0) {
      console.log('Column incident_types already exists, skipping creation');
    } else {
      // Add the new array column
      console.log('Adding incident_types column...');
      await client.query(`
        ALTER TABLE incidents 
        ADD COLUMN incident_types TEXT[] DEFAULT ARRAY[]::TEXT[]
      `);
      console.log('Column added');
    }
    
    // Migrate existing data from incident_type to incident_types
    console.log('Migrating existing data...');
    const result = await client.query(`
      UPDATE incidents 
      SET incident_types = ARRAY[incident_type]
      WHERE incident_type IS NOT NULL 
        AND incident_type != ''
        AND (incident_types IS NULL OR incident_types = ARRAY[]::TEXT[])
      RETURNING id, incident_type, incident_types
    `);
    console.log(`Migrated ${result.rowCount} rows`);
    
    // Create GIN index for fast array queries
    console.log('Creating GIN index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_types 
      ON incidents USING GIN(incident_types)
    `);
    console.log('Index created');
    
    await client.query('COMMIT');
    console.log('Migration complete!');
    
    // Verify
    const verify = await client.query(`
      SELECT id, incident_id, incident_type, incident_types 
      FROM incidents 
      WHERE incident_types IS NOT NULL AND array_length(incident_types, 1) > 0
      LIMIT 10
    `);
    console.log('\nSample data after migration:');
    verify.rows.forEach(r => {
      console.log(`  ${r.id}: ${r.incident_type} -> ${JSON.stringify(r.incident_types)}`);
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
