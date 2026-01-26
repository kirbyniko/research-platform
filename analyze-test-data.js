const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function analyze() {
  try {
    // Analyze Publications data quality
    const pubsResult = await pool.query(`
      SELECT r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Publications'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    const pubs = pubsResult.rows.map(r => r.data);
    console.log('Total Publications:', pubs.length);
    
    // Count unique values for each field
    const fields = ['pub_type', 'publisher', 'is_paywalled', 'author'];
    fields.forEach(field => {
      const values = {};
      pubs.forEach(p => {
        const val = String(p[field] ?? 'null');
        values[val] = (values[val] || 0) + 1;
      });
      console.log('\n' + field + ':');
      Object.entries(values).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => {
        console.log('  ' + k + ': ' + v);
      });
    });
    
    // Analyze Incidents too
    console.log('\n\n=== INCIDENTS ===');
    const incResult = await pool.query(`
      SELECT r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Incidents'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    const incs = incResult.rows.map(r => r.data);
    console.log('Total Incidents:', incs.length);
    
    const incFields = ['incident_type', 'severity', 'state', 'status'];
    incFields.forEach(field => {
      const values = {};
      incs.forEach(p => {
        const val = String(p[field] ?? 'null');
        values[val] = (values[val] || 0) + 1;
      });
      console.log('\n' + field + ':');
      Object.entries(values).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => {
        console.log('  ' + k + ': ' + v);
      });
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

analyze();
