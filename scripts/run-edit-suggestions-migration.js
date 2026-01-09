// Run edit suggestions migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    const schemaPath = path.join(__dirname, 'edit-suggestions-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running edit suggestions migration...');
    await client.query(schema);
    console.log('✓ Edit suggestions table created successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
