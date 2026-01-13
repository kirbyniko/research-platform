// Create 5 John Doe test guest submissions
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTestSubmissions() {
  try {
    console.log('Creating 5 John Doe test submissions...');
    
    for (let i = 1; i <= 5; i++) {
      const submissionData = {
        victimName: 'John Doe',
        incidentType: 'death_in_custody',
        dateOfDeath: null,
        location: null,
        facility: null,
        description: `Test submission ${i} for John Doe - ${new Date().toISOString()}`,
        sourceUrls: [],
        mediaUrls: [],
        submittedAt: new Date().toISOString()
      };

      await pool.query(
        `INSERT INTO guest_submissions (submission_data, status)
         VALUES ($1, 'pending')`,
        [JSON.stringify(submissionData)]
      );
      
      console.log(`Created test submission ${i}/5`);
    }
    
    console.log('✅ Successfully created 5 test submissions');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestSubmissions();
