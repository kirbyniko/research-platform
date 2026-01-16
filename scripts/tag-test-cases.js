// Tag all test cases in production database
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually parse .env.production.local
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

async function tagTestCases() {
  const result = await pool.query(`
    UPDATE incidents 
    SET tags = ARRAY['test'] 
    WHERE subject_name LIKE 'TEST -%' 
    RETURNING id, subject_name, tags
  `);
  
  console.log('Tagged', result.rowCount, 'test cases with [test]:');
  result.rows.forEach(row => console.log('  -', row.subject_name));
  
  await pool.end();
}

tagTestCases();
