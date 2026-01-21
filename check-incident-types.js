require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`SELECT config FROM field_definitions WHERE record_type_id=6 AND slug='incident_types'`)
  .then(r => {
    console.log(JSON.stringify(r.rows[0]?.config, null, 2));
    pool.end();
  });
