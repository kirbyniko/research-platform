const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkPubs() {
  try {
    // Get record type info
    const types = await pool.query(`
      SELECT rt.id, rt.name, COUNT(r.id) as count
      FROM record_types rt
      LEFT JOIN records r ON r.record_type_id = rt.id
      WHERE rt.name ILIKE '%publication%'
      GROUP BY rt.id, rt.name
    `);
    
    console.log('=== PUBLICATION RECORD TYPES ===');
    for (const t of types.rows) {
      console.log(`Record Type: ${t.name} (ID: ${t.id}) - ${t.count} records`);
    }
    
    // Get sample records
    if (types.rows.length > 0) {
      const rtId = types.rows[0].id;
      const records = await pool.query(
        'SELECT id, data FROM records WHERE record_type_id = $1 LIMIT 5',
        [rtId]
      );
      
      console.log('\n=== SAMPLE PUBLICATIONS ===');
      for (const r of records.rows) {
        console.log(`\nRecord ${r.id}:`);
        console.log(JSON.stringify(r.data, null, 2));
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

checkPubs();
