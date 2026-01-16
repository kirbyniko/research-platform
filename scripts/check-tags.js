const { Pool } = require('pg');
require('dotenv').config({ path: '.env.prod.temp' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    // Check tag column
    const colCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incidents' AND column_name = 'tags'
    `);
    console.log('\n📋 Tags column:', colCheck.rows);
    
    // Check current tag values
    const tagCheck = await pool.query(`
      SELECT id, incident_id, incident_type, tags
      FROM incidents 
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      LIMIT 10
    `);
    console.log('\n🏷️  Incidents with tags:', tagCheck.rowCount);
    if (tagCheck.rowCount > 0) {
      tagCheck.rows.forEach(row => {
        console.log(`  ${row.incident_id}: ${row.tags.join(', ')}`);
      });
    }
    
    // Get all unique tags
    const uniqueTags = await pool.query(`
      SELECT DISTINCT unnest(tags) as tag
      FROM incidents
      WHERE tags IS NOT NULL
      ORDER BY tag
    `);
    console.log('\n📌 Unique tags:', uniqueTags.rows.map(r => r.tag));
    
    // Check incidents without tags
    const noTags = await pool.query(`
      SELECT COUNT(*) 
      FROM incidents 
      WHERE tags IS NULL OR array_length(tags, 1) IS NULL
    `);
    console.log('\n❌ Incidents without tags:', noTags.rows[0].count);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
