const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reset() {
  try {
    await pool.query(
      'UPDATE incidents SET verified = $1, verification_status = $2 WHERE id = $3',
      [false, 'pending', 41]
    );
    console.log('✓ Reset incident 41 to pending');
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

reset();
