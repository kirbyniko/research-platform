const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkReviewCycles() {
  try {
    // Check Maksym Chernyak
    const result = await pool.query(`
      SELECT id, victim_name, verification_status, review_cycle, 
             first_verified_by, second_verified_by, first_validated_by
      FROM incidents 
      WHERE victim_name ILIKE '%Chernyak%'
    `);
    
    console.log('Maksym Chernyak case:');
    console.table(result.rows);
    
    // Check all cases in first_review status
    const reviewCases = await pool.query(`
      SELECT id, victim_name, verification_status, review_cycle
      FROM incidents 
      WHERE verification_status IN ('pending', 'first_review', 'second_review')
      ORDER BY review_cycle DESC NULLS LAST, id
      LIMIT 20
    `);
    
    console.log('\nAll cases needing review (sorted by cycle):');
    console.table(reviewCases.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkReviewCycles();
