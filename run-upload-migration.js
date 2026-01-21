require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('Running file upload system migration...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'scripts/migrations/003-file-upload-system.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('storage_plans', 'project_subscriptions', 'project_storage_usage', 'project_bandwidth_usage', 'project_files')
      ORDER BY table_name
    `);
    
    console.log('Created tables:');
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
    
    // Verify storage plans were seeded
    const plans = await pool.query('SELECT name, slug, storage_limit_bytes, price_cents FROM storage_plans ORDER BY sort_order');
    console.log('\nStorage plans:');
    plans.rows.forEach(p => {
      const gb = p.storage_limit_bytes / (1024 * 1024 * 1024);
      console.log(`  - ${p.name} (${p.slug}): ${gb}GB, $${p.price_cents / 100}/mo`);
    });
    
    // Check new columns on project_members
    const cols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'project_members' AND column_name IN ('can_upload', 'upload_quota_bytes')
    `);
    console.log('\nNew project_members columns:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name}`));
    
    // Check new columns on projects
    const projCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name LIKE '%upload%'
    `);
    console.log('\nNew projects columns:');
    projCols.rows.forEach(c => console.log(`  - ${c.column_name}`));
    
    console.log('\n✅ File upload system ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
  } finally {
    await pool.end();
  }
}

runMigration();
