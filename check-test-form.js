require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT * FROM record_types WHERE slug='test-form'")
  .then(r => {
    if (r.rows.length > 0) {
      console.log('✓ test-form exists in database:');
      console.log('  ID:', r.rows[0].id);
      console.log('  Name:', r.rows[0].name);
      console.log('  Project ID:', r.rows[0].project_id);
    } else {
      console.log('❌ test-form not found in database');
    }
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
