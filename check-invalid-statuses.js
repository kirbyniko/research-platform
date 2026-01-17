// Check for cases with invalid statuses in production
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkInvalidStatuses() {
  const client = await pool.connect();
  try {
    // Get all unique statuses
    console.log('\n=== ALL VERIFICATION STATUSES IN PRODUCTION ===');
    let result = await client.query(`
      SELECT verification_status, COUNT(*) as count
      FROM incidents
      GROUP BY verification_status
      ORDER BY count DESC
    `);
    console.log('\nStatus distribution:');
    result.rows.forEach(row => {
      console.log(`  ${row.verification_status}: ${row.count} cases`);
    });
    
    // Check for cases with 'pending_review' status (invalid)
    console.log('\n=== CASES WITH INVALID STATUS (pending_review) ===');
    result = await client.query(`
      SELECT id, subject_name, victim_name, verification_status
      FROM incidents
      WHERE verification_status = 'pending_review'
      ORDER BY id
      LIMIT 20
    `);
    
    if (result.rows.length > 0) {
      console.log(`\nFound ${result.rows.length} cases with 'pending_review' status (should be 'pending'):`);
      result.rows.forEach(row => {
        console.log(`  ID ${row.id}: ${row.subject_name || row.victim_name}`);
      });
      
      console.log('\n⚠️  These cases need to be fixed. Run fix-invalid-statuses.js to correct them.');
    } else {
      console.log('\n✅ No cases with invalid statuses found');
    }
    
    // Show valid statuses per the API
    console.log('\n=== VALID STATUS WORKFLOW ===');
    console.log('  pending → first_review → first_validation → verified');
    console.log('\nAPI accepts for review:');
    console.log('  ✓ pending (goes to first_review)');
    console.log('  ✗ pending_review (INVALID - not recognized by API)');
    console.log('  ✗ first_review (already reviewed once)');
    console.log('  ✗ first_validation+ (already in validation/published)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkInvalidStatuses();
