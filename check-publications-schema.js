const { Pool } = require('pg');

// Use exact connection string
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkPublications() {
  try {
    // Get the record type schema
    const rtResult = await pool.query(`
      SELECT id, name 
      FROM record_types 
      WHERE project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
      AND name ILIKE '%publication%'
    `);
    
    console.log('=== PUBLICATION RECORD TYPE ===');
    if (rtResult.rows[0]) {
      console.log('ID:', rtResult.rows[0].id);
      console.log('Name:', rtResult.rows[0].name);
    }
    
    // Get sample records
    const recordsResult = await pool.query(`
      SELECT r.id, r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
      AND rt.name ILIKE '%publication%'
      LIMIT 5
    `);
    
    console.log('\n=== SAMPLE PUBLICATIONS ===');
    recordsResult.rows.forEach(r => {
      console.log('ID:', r.id);
      console.log('Data:', JSON.stringify(r.data, null, 2));
      console.log('---');
    });
    
    // Count total
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
      AND rt.name ILIKE '%publication%'
    `);
    console.log('\nTotal Publications:', countResult.rows[0].total);
    
    // Check all record types
    const allRtResult = await pool.query(`
      SELECT rt.id, rt.name, COUNT(r.id) as record_count
      FROM record_types rt
      LEFT JOIN records r ON r.record_type_id = rt.id
      WHERE rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
      GROUP BY rt.id, rt.name
      ORDER BY rt.name
    `);
    
    console.log('\n=== ALL RECORD TYPES ===');
    allRtResult.rows.forEach(r => {
      console.log(`${r.name}: ${r.record_count} records (ID: ${r.id})`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkPublications();
