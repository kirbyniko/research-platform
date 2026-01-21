/**
 * Run file upload system migration in production
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use production DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to production database');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'scripts', 'migrations', '003-file-upload-system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: 003-file-upload-system.sql');
    console.log('⏳ This may take a moment...\n');
    
    // Execute migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('storage_plans', 'project_subscriptions', 'project_storage_usage', 'project_bandwidth_usage', 'project_files')
      ORDER BY table_name
    `);
    
    console.log('Tables created:');
    tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
    
    // Verify columns
    console.log('\n🔍 Verifying new columns...');
    const memberCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'project_members' 
      AND column_name IN ('can_upload', 'upload_quota_bytes')
    `);
    
    const projectCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name LIKE 'guest_upload%'
    `);
    
    console.log('project_members columns:');
    memberCols.rows.forEach(row => console.log(`  ✓ ${row.column_name}`));
    
    console.log('projects columns:');
    projectCols.rows.forEach(row => console.log(`  ✓ ${row.column_name}`));
    
    // Show storage plans
    console.log('\n💾 Storage plans:');
    const plans = await client.query('SELECT name, slug, storage_limit_bytes, price_cents FROM storage_plans ORDER BY sort_order');
    plans.rows.forEach(plan => {
      const storage = plan.storage_limit_bytes / (1024 * 1024 * 1024);
      const price = (plan.price_cents / 100).toFixed(2);
      console.log(`  ${plan.name} (${plan.slug}): ${storage}GB - $${price}/month`);
    });
    
    console.log('\n✅ Migration verification complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
