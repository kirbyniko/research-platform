require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTagsField() {
  try {
    // Check field definition for tags
    const result = await pool.query(`
      SELECT id, name, slug, field_type, config 
      FROM field_definitions 
      WHERE name ILIKE '%tag%' OR slug ILIKE '%tag%'
    `);
    
    console.log('Tags field definitions:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check if there's a project_tags table
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%tag%'
    `);
    console.log('\nTag-related tables:');
    console.log(tables.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTagsField();
