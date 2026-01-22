require('dotenv').config({ path: '.env.production' });
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('scripts/migrations/016-verifier-role-system.sql', 'utf8');

console.log('Running migration 016-verifier-role-system.sql...\n');

pool.query(sql)
  .then(() => {
    console.log('✓ Migration completed successfully\n');
    
    // Check if verifier_stats was created
    return pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'verifier_stats'
    `);
  })
  .then(result => {
    if (result.rows.length > 0) {
      console.log('✓ verifier_stats table exists');
    } else {
      console.log('✗ verifier_stats table NOT found!');
    }
    
    // Check if user columns were added
    return pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name LIKE '%verifier%'
    `);
  })
  .then(result => {
    console.log(`\nVerifier columns in users table: ${result.rows.length}`);
    result.rows.forEach(row => console.log(`  - ${row.column_name}`));
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  });
