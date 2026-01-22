require('dotenv').config({ path: '.env.production.local' });
const fs = require('fs');
const { Pool } = require('pg');

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-single-migration.js <migration-file>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync(`scripts/migrations/${migrationFile}`, 'utf8');

console.log(`Running migration: ${migrationFile}...`);

pool.query(sql)
  .then(() => {
    console.log('✓ Migration completed successfully');
    return pool.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration failed:', error.message);
    pool.end();
    process.exit(1);
  });
