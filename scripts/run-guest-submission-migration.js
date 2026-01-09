const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use DATABASE_URL from environment (works for both local and production)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  console.error('For production: Set DATABASE_URL to your Neon connection string');
  console.error('For local: DATABASE_URL is in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🔄 Running guest submission migration...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-guest-submission-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL migration...\n');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('Changes applied:');
    console.log('  • Added submitter_ip column to incidents table');
    console.log('  • Added indexes for submitter_role and verification_status');
    console.log('  • Updated existing records with null submitter_role\n');
    
    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incidents' AND column_name = 'submitter_ip'
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Verified: submitter_ip column exists');
    } else {
      console.log('⚠️  Warning: Could not verify submitter_ip column');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
