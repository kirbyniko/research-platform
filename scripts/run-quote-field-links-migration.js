// Run Quote-Field Links migration
// Usage: node scripts/run-quote-field-links-migration.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running quote-field links migration...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'quote-field-links-schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✓ Quote-field links schema created successfully');
    
    // Check if table was created
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'quote_field_links'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ Verified: quote_field_links table exists');
    }
    
    // Count existing data
    const countResult = await client.query('SELECT COUNT(*) FROM quote_field_links');
    console.log(`  Current rows in quote_field_links: ${countResult.rows[0].count}`);
    
    console.log('\nMigration complete!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
