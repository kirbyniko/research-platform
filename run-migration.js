require('dotenv').config({ path: '.env.production' });
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('scripts/migrations/001-platform-schema.sql', 'utf8');

console.log('Running schema migration...');

pool.query(sql)
  .then(() => {
    console.log('✓ Schema created successfully');
    return pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  })
  .then(result => {
    console.log('\nTables in database:');
    result.rows.forEach(row => console.log('  -', row.table_name));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
