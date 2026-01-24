const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('Running migration 021: Project-Level Credits...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'scripts', 'migrations', '021-project-credits.sql'),
      'utf8'
    );
    
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    console.log('✅ Migration 021 completed successfully!');
    
    // Show summary
    const summary = await client.query(`
      SELECT 
        COUNT(*) as project_count,
        SUM(total_credits) as total_credits
      FROM project_credit_summary
    `);
    
    console.log('\n📊 Project Credits Summary:');
    console.log(`  Projects: ${summary.rows[0].project_count}`);
    console.log(`  Total Credits: ${summary.rows[0].total_credits}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
