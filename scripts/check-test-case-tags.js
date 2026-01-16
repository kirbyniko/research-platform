const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.production.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let databaseUrl = '';

for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
    break;
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

pool.query(`SELECT id, incident_id, subject_name, tags FROM incidents WHERE subject_name LIKE 'TEST -%' LIMIT 1`)
  .then(r => {
    console.log('Sample test case from database:');
    console.log(JSON.stringify(r.rows[0], null, 2));
    pool.end();
  });
