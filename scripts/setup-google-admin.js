import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const email = process.env.ADMIN_EMAIL || 'kirbyniko@gmail.com';

try {
  const result = await pool.query(
    `INSERT INTO users (email, name, role, auth_provider) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (email) DO UPDATE 
     SET role = EXCLUDED.role 
     RETURNING id, email, role`,
    [email, 'Niko', 'admin', 'google']
  );
  
  console.log('✅ Admin user created/updated:', result.rows[0]);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
