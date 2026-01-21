require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('Running project tags migration...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'scripts/migrations/002-project-tags.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('project_tags', 'record_tags')
      ORDER BY table_name
    `);
    
    console.log('Created tables:');
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
    
    // Check if tags_enabled column exists
    const cols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'tags_enabled'
    `);
    
    if (cols.rows.length > 0) {
      console.log('  - projects.tags_enabled column added');
    }
    
    console.log('\n✅ Project tags system ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
  } finally {
    await pool.end();
  }
}

runMigration();
