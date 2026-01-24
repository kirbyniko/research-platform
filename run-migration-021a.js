require('dotenv').config({ path: '.env.production.local' });
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Remove quotes from DATABASE_URL if present
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && (databaseUrl.startsWith('"') || databaseUrl.startsWith("'"))) {
  databaseUrl = databaseUrl.slice(1, -1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'scripts/migrations/021a-fix-project-credits-constraint.sql'), 'utf-8');
    await pool.query(sql);
    console.log('✓ Migration 021a: Fixed project credits constraints');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration 021a failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
