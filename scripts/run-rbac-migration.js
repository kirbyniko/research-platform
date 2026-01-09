// Run this to create RBAC tables
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'rbac-schema.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ RBAC schema created successfully');
    
    // Check if we need to update any existing admin users
    const adminCheck = await client.query(
      "SELECT id, email FROM users WHERE email LIKE '%admin%' OR role = 'admin'"
    );
    
    if (adminCheck.rows.length > 0) {
      console.log('Found potential admin users:', adminCheck.rows.map(r => r.email));
    } else {
      console.log('💡 No admin users found. You may want to update a user to admin role:');
      console.log("   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';");
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
