const { Pool } = require('pg');

// Use exact connection string
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkData() {
  try {
    // Get projects and their record counts
    const projects = await pool.query(`
      SELECT p.id, p.name, p.slug, 
             (SELECT COUNT(*) FROM records r WHERE r.project_id = p.id) as record_count
      FROM projects p
      ORDER BY record_count DESC
    `);
    
    console.log('\n=== PROJECTS ===');
    for (const p of projects.rows) {
      console.log(`  ${p.name} (${p.slug}): ${p.record_count} records`);
    }
    
    // Get record types with counts
    const types = await pool.query(`
      SELECT rt.id, rt.name, rt.project_id, COUNT(r.id) as count
      FROM record_types rt
      LEFT JOIN records r ON r.record_type_id = rt.id
      GROUP BY rt.id, rt.name, rt.project_id
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n=== RECORD TYPES (Top 10) ===');
    for (const t of types.rows) {
      console.log(`  ${t.name}: ${t.count} records`);
    }
    
    // Sample data from the largest record type
    if (types.rows.length > 0 && parseInt(types.rows[0].count) > 0) {
      const largestType = types.rows[0];
      const sample = await pool.query(`
        SELECT data FROM records 
        WHERE record_type_id = $1 
        LIMIT 3
      `, [largestType.id]);
      
      console.log(`\n=== SAMPLE DATA from "${largestType.name}" ===`);
      sample.rows.forEach((r, i) => {
        console.log(`\nRecord ${i+1}:`);
        const data = r.data;
        Object.entries(data).forEach(([key, value]) => {
          const displayValue = value === null ? '(null)' : 
                              typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value;
          console.log(`  ${key}: ${displayValue}`);
        });
      });
      
      // Field fill rates
      const allRecords = await pool.query(`
        SELECT data FROM records WHERE record_type_id = $1
      `, [largestType.id]);
      
      console.log(`\n=== FIELD FILL RATES for "${largestType.name}" ===`);
      const fieldCounts = {};
      const total = allRecords.rows.length;
      
      allRecords.rows.forEach(r => {
        Object.entries(r.data).forEach(([key, value]) => {
          if (!fieldCounts[key]) fieldCounts[key] = { filled: 0, total: 0 };
          fieldCounts[key].total++;
          if (value !== null && value !== undefined && value !== '' && value !== 'Unknown') {
            fieldCounts[key].filled++;
          }
        });
      });
      
      Object.entries(fieldCounts)
        .sort(([,a], [,b]) => (b.filled/b.total) - (a.filled/a.total))
        .forEach(([field, counts]) => {
          const pct = ((counts.filled / counts.total) * 100).toFixed(0);
          const bar = '█'.repeat(Math.floor(pct/5)) + '░'.repeat(20 - Math.floor(pct/5));
          console.log(`  ${field.padEnd(25)} ${bar} ${pct}%`);
        });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
