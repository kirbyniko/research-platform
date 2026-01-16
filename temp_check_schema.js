
const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.production.local', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    // Get the schema for incident_details table
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'incident_details' 
      ORDER BY ordinal_position
    `);
    console.log('incident_details schema:');
    schema.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.is_nullable})`));
    
    // Check what detail_types exist
    const types = await pool.query(`
      SELECT DISTINCT detail_type, COUNT(*) as count
      FROM incident_details
      GROUP BY detail_type
      ORDER BY detail_type
    `);
    console.log('\nExisting detail_types:');
    types.rows.forEach(r => console.log(`  ${r.detail_type}: ${r.count} records`));
    
    // Check the protest suppression test case details structure
    const protestCase = await pool.query(`
      SELECT id.detail_type, id.details
      FROM incidents i
      JOIN incident_details id ON i.id = id.incident_id
      WHERE i.subject_name LIKE '%Protest Suppression%'
    `);
    console.log('\nProtest suppression test case details:');
    protestCase.rows.forEach(r => {
      console.log(`  Type: ${r.detail_type}`);
      console.log(`  Details:`, JSON.stringify(r.details, null, 2));
    });
    
  } finally {
    await pool.end();
  }
}
main();
