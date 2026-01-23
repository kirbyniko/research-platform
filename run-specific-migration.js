require('dotenv').config({ path: '.env.production' });
const fs = require('fs');
const { Pool } = require('pg');

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-specific-migration.js <migration-file>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync(`scripts/migrations/${migrationFile}`, 'utf8');

console.log(`Running migration: ${migrationFile}`);

pool.query(sql)
  .then(() => {
    console.log('✓ Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.error(error.detail || '');
    process.exit(1);
  });
