const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.production.local', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    // Check schema
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'incident_details' ORDER BY ordinal_position`);
    console.log('incident_details columns:', cols.rows.map(x => x.column_name).join(', '));
    
    // Check test case data
    const testCases = await pool.query(`SELECT id, incident_id, subject_name, victim_name, incident_type FROM incidents WHERE subject_name LIKE 'TEST -%' ORDER BY id`);
    console.log('\nTest cases:');
    for (const tc of testCases.rows) {
      console.log(`  ${tc.id}: ${tc.subject_name} (victim_name: ${tc.victim_name || 'NULL'}) - ${tc.incident_type}`);
      
      // Check details
      const details = await pool.query(`SELECT * FROM incident_details WHERE incident_id = $1`, [tc.id]);
      if (details.rows.length > 0) {
        const d = details.rows[0];
        console.log(`    Details: protest_topic=${d.protest_topic}, protest_size=${d.protest_size}, dispersal_method=${d.dispersal_method}, arrests_made=${d.arrests_made}`);
      } else {
        console.log(`    No details row`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
main();
