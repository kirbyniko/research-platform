// Test the search API query
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    // First check columns
    const cols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'records'"
    );
    console.log('Records columns:', cols.rows.map(r => r.column_name));
    
    const query = 'Carlos';
    const projectId = 1;
    
    // Test the search query - records don't have 'name' column, check data JSONB
    const result = await pool.query(`
      SELECT DISTINCT 
        r.id,
        r.status,
        r.created_at,
        rt.name as record_type,
        rt.slug as record_type_slug,
        r.data->>'name' as name,
        r.data->>'victim_name' as victim_name,
        r.data->>'incident_date' as incident_date,
        r.data->>'city' as city,
        r.data->>'state' as state
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.project_id = $1
        AND (
          r.data->>'name' ILIKE $2
          OR r.data->>'victim_name' ILIKE $2
          OR r.data->>'subject_name' ILIKE $2
        )
      LIMIT 10
    `, [projectId, `%${query}%`]);
    
    console.log('Query works! Results:', result.rows.length);
    console.log(result.rows);
  } catch (err) {
    console.error('Query error:', err.message);
    console.error(err);
  }
  await pool.end();
}

test();
