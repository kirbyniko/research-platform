// Run the incident_media table migration
require('dotenv').config({ path: '.env.local' });
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
  console.log('🔄 Running incident_media table migration...\n');
  
  try {
    const sqlPath = path.join(__dirname, 'add-incident-media-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL migration...\n');
    await pool.query(sql);
    console.log('✅ incident_media table created successfully!\n');
    
    // Verify the table exists
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incident_media'
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length > 0) {
      console.log('Table columns:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error running migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
