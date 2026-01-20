const fs = require('fs');
const path = require('path');
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

(async () => {
  try {
    const schemaFile = path.join(__dirname, 'scripts', 'statements-schema.sql');
    const sql = fs.readFileSync(schemaFile, 'utf8');
    
    console.log('Running statements-schema.sql...');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
        try {
          await pool.query(stmt);
          console.log('✓ Success');
        } catch (e) {
          if (e.message.includes('already exists')) {
            console.log('⚠ Already exists (skipping)');
          } else {
            throw e;
          }
        }
      }
    }
    
    console.log('\n✅ Schema migration complete!');
    
    // Verify tables were created
    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' AND table_name LIKE 'statement%'
      ORDER BY table_name
    `);
    
    console.log('\nCreated tables:');
    res.rows.forEach(row => console.log(' -', row.table_name));
    
    pool.end();
  } catch(e) {
    console.error('❌ Error:', e.message);
    pool.end();
    process.exit(1);
  }
})();
