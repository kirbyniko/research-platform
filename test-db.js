const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

(async () => {
  try {
    const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
    console.log('\n=== Tables in database ===');
    res.rows.forEach(row => console.log(' -', row.table_name));
    
    // Check if statements table exists
    const stmtRes = await pool.query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_name='statements'`);
    const stmtExists = stmtRes.rows[0].count > 0;
    
    if (stmtExists) {
      const dataRes = await pool.query(`SELECT id, headline, tags FROM statements LIMIT 3`);
      console.log('\n=== Sample statements ===');
      dataRes.rows.forEach(row => {
        console.log(`ID: ${row.id}, Headline: ${row.headline?.substring(0, 40)}..., Tags: ${JSON.stringify(row.tags)}`);
      });
    } else {
      console.log('\n❌ statements table does NOT exist');
    }
    
    pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    pool.end();
  }
})();
