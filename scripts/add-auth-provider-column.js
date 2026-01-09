const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ice_deaths',
  password: 'password',
  port: 5432,
});

async function addAuthProviderColumn() {
  try {
    console.log('Adding auth_provider column to users table...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'google'
    `);
    
    console.log('✓ auth_provider column added successfully');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'auth_provider'
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Verified column exists:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addAuthProviderColumn();
