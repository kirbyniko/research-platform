const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

async function createAdminUser() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  
  const client = await pool.connect();
  
  try {
    // Check if user already exists
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      console.log(`User ${email} already exists. Updating...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        'UPDATE users SET password_hash = $1, role = $2, email_verified = true WHERE email = $3',
        [passwordHash, 'admin', email]
      );
      console.log('User updated successfully!');
    } else {
      console.log(`Creating admin user: ${email}`);
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        'INSERT INTO users (email, password_hash, role, email_verified) VALUES ($1, $2, $3, true)',
        [email, passwordHash, 'admin']
      );
      console.log('Admin user created successfully!');
    }
    
    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`\nVisit: http://localhost:3000/auth/login`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

createAdminUser();
