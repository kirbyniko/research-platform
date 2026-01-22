require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    // Check for verification tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'verification%'
      ORDER BY table_name
    `);
    console.log('Verification tables:', tables.rows);
    
    // Check for new columns on projects
    const projectCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
        AND column_name IN ('require_validation', 'verification_quota_monthly', 'third_party_verification_enabled', 'trust_score')
    `);
    console.log('Project verification columns:', projectCols.rows);
    
    // Check for new columns on records
    const recordCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'records' 
        AND column_name IN ('verification_level', 'verification_scope', 'verified_data_hash')
    `);
    console.log('Record verification columns:', recordCols.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
