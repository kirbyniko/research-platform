const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDateValues() {
  try {
    const result = await pool.query(`
      SELECT incident_id, incident_date, CHAR_LENGTH(incident_date::text) as len
      FROM incidents 
      WHERE incident_date IS NOT NULL 
      ORDER BY id DESC 
      LIMIT 20
    `);
    
    console.log('Sample incident_date values:');
    result.rows.forEach(row => {
      console.log(`${row.incident_id}: [${row.incident_date}] (length: ${row.len})`);
    });
    
    // Check for mm/dd/yyyy pattern
    const placeholders = await pool.query(`
      SELECT incident_id, incident_date 
      FROM incidents 
      WHERE incident_date ~ '^[mMdDyY/]+$'
    `);
    
    console.log('\nIncidents with placeholder dates:');
    if (placeholders.rows.length === 0) {
      console.log('None found');
    } else {
      placeholders.rows.forEach(row => {
        console.log(`${row.incident_id}: ${row.incident_date}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDateValues();
