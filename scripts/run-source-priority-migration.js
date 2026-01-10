const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('./scripts/add-source-priority.sql', 'utf8');
    await pool.query(sql);
    console.log('✓ Migration completed successfully');
    console.log('✓ Added source_priority column to incident_sources');
    console.log('✓ Updated existing sources with appropriate priorities');
    await pool.end();
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
