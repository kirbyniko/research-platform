const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkValidationIssues() {
  try {
    // Check for validation issues
    const issues = await pool.query(`
      SELECT vi.*, i.victim_name 
      FROM validation_issues vi
      JOIN incidents i ON vi.incident_id = i.id
      WHERE vi.resolved_at IS NULL
      ORDER BY vi.created_at DESC
    `);
    
    console.log('Unresolved validation issues:');
    console.table(issues.rows);
    
    // Check if Maksym was ever validated
    const maksym = await pool.query(`
      SELECT id, victim_name, verification_status, review_cycle,
             first_verified_by, first_verified_at,
             second_verified_by, second_verified_at,
             first_validated_by, first_validated_at,
             second_validated_by, second_validated_at
      FROM incidents 
      WHERE id = 38
    `);
    
    console.log('\nMaksym Chernyak full history:');
    console.table(maksym.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkValidationIssues();
