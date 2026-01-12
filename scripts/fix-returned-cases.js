const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixReturnedCases() {
  try {
    // Find cases with validation issues but review_cycle = 1
    const result = await pool.query(`
      SELECT DISTINCT i.id, i.victim_name, i.verification_status, i.review_cycle, 
             COUNT(vi.id) as issue_count
      FROM incidents i
      JOIN validation_issues vi ON i.id = vi.incident_id
      WHERE vi.resolved_at IS NULL 
        AND i.review_cycle = 1
        AND i.verification_status IN ('pending', 'first_review', 'second_review')
      GROUP BY i.id, i.victim_name, i.verification_status, i.review_cycle
    `);
    
    console.log('Cases with unresolved validation issues but review_cycle = 1:');
    console.table(result.rows);
    
    if (result.rows.length > 0) {
      // Update them all to review_cycle = 2
      const ids = result.rows.map(r => r.id);
      await pool.query(`
        UPDATE incidents 
        SET review_cycle = 2 
        WHERE id = ANY($1)
      `, [ids]);
      
      console.log(`\nUpdated ${result.rows.length} cases to review_cycle = 2`);
      
      // Verify
      const updated = await pool.query(`
        SELECT id, victim_name, verification_status, review_cycle
        FROM incidents 
        WHERE id = ANY($1)
      `, [ids]);
      
      console.log('\nUpdated cases:');
      console.table(updated.rows);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

fixReturnedCases();
