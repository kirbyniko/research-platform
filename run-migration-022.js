require('dotenv').config({ path: '.env.production.local' });
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
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
