require('dotenv').config({ path: '.env.production' });
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrationFile = process.argv[2] || 'scripts/migrations/025-infographics.sql';
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log(`Running migration: ${migrationFile}`);

pool.query(sql)
  .then(() => {
    console.log('✓ Migration completed successfully');
    return pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'infographic%' ORDER BY table_name`);
  })
  .then(result => {
    console.log('\nInfographic tables in database:');
    result.rows.forEach(row => console.log('  -', row.table_name));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  });
