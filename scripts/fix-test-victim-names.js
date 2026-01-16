const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.production.local', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function fixVictimNames() {
  try {
    // Update victim_name to match subject_name for test cases
    const result = await pool.query(`
      UPDATE incidents 
      SET victim_name = subject_name 
      WHERE subject_name LIKE 'TEST -%' 
        AND (victim_name IS NULL OR victim_name = '')
      RETURNING id, subject_name, victim_name
    `);
    
    console.log('Updated victim_name for', result.rowCount, 'test cases:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.subject_name} -> victim_name: ${row.victim_name}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

fixVictimNames();
