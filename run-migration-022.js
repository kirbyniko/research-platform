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

console.log('DATABASE_URL:', databaseUrl ? 'SET' : 'NOT SET');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'scripts/migrations/022-team-member-credits.sql'), 'utf-8');
    await pool.query(sql);
    console.log('✓ Migration 022: Team Member Credits completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration 022 failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
