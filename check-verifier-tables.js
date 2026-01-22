const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkVerifierObjects() {
  try {
    // Check tables
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE '%verifier%'
    `);
    
    // Check views
    const views = await pool.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' AND viewname LIKE '%verifier%'
    `);
    
    // Check materialized views
    const matviews = await pool.query(`
      SELECT matviewname 
      FROM pg_matviews 
      WHERE schemaname = 'public' AND matviewname LIKE '%verifier%'
    `);
    
    // Check users columns
    const userCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name LIKE '%verifier%'
      ORDER BY ordinal_position
    `);
    
    console.log('Tables:', JSON.stringify(tables.rows, null, 2));
    console.log('Views:', JSON.stringify(views.rows, null, 2));
    console.log('Materialized Views:', JSON.stringify(matviews.rows, null, 2));
    console.log('User verifier columns:', JSON.stringify(userCols.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVerifierObjects();
