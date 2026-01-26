const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function verifyEnhancements() {
  try {
    // Check Publications new fields
    const pubSample = await pool.query(`
      SELECT r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Publications'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
      LIMIT 1
    `);
    
    console.log('=== SAMPLE PUBLICATION (ALL FIELDS) ===');
    console.log(JSON.stringify(pubSample.rows[0].data, null, 2));
    
    // Check new field distributions
    const pubsResult = await pool.query(`
      SELECT r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Publications'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    const pubs = pubsResult.rows.map(r => r.data);
    
    console.log('\n=== NEW PUBLICATION FIELDS ===');
    ['region', 'primary_topic', 'sentiment', 'impact_level', 'target_audience'].forEach(field => {
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
    
    // Check Incidents new fields
    const incSample = await pool.query(`
      SELECT r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Incidents'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
      LIMIT 1
    `);
    
    console.log('\n\n=== SAMPLE INCIDENT (ALL FIELDS) ===');
    console.log(JSON.stringify(incSample.rows[0].data, null, 2));
    
    // Check new incident field distributions
    const incsResult = await pool.query(`
      SELECT r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Incidents'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    const incs = incsResult.rows.map(r => r.data);
    
    console.log('\n=== NEW INCIDENT FIELDS ===');
    ['facility_type', 'reported_by', 'affected_age_group', 'affected_gender', 'affected_nationality'].forEach(field => {
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

verifyEnhancements();
