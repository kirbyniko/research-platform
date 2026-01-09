const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT incident_id, victim_name, verification_status, submitted_by 
      FROM incidents 
      ORDER BY incident_date DESC 
      LIMIT 20
    `);
    
    console.log('\nVerification Status of Recent Cases:');
    console.log('=====================================\n');
    result.rows.forEach(row => {
      console.log(`${row.incident_id}: ${row.victim_name || 'Unnamed'}`);
      console.log(`  Status: ${row.verification_status || 'NULL'}`);
      console.log(`  Submitted by: ${row.submitted_by || 'NULL'}\n`);
    });
    
    // Count by status
    const counts = await pool.query(`
      SELECT verification_status, COUNT(*) as count
      FROM incidents
      GROUP BY verification_status
      ORDER BY count DESC
    `);
    
    console.log('\nStatus Counts:');
    console.log('==============');
    counts.rows.forEach(row => {
      console.log(`${row.verification_status || 'NULL'}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
})();
