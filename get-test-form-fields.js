// Get all fields for test-form record type
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function getFields() {
  try {
    const result = await pool.query(
      `SELECT fd.*, fg.name as group_name 
       FROM field_definitions fd 
       LEFT JOIN field_groups fg ON fd.field_group_id = fg.id 
       WHERE fd.record_type_id = 1 
       ORDER BY fd.field_group_id NULLS FIRST, fd.sort_order`
    );
    
    console.log('Fields in test-form:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    return result.rows;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

getFields();
