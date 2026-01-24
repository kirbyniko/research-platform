require('dotenv').config({ path: '.env.production.local' });
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Remove quotes from DATABASE_URL if present
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && (databaseUrl.startsWith('"') || databaseUrl.startsWith("'"))) {
  databaseUrl = databaseUrl.slice(1, -1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkCredits() {
  try {
    console.log('\n=== PROJECT CREDITS ===');
    const projects = await pool.query(`
      SELECT p.id, p.name, p.slug, 
             uc.balance, uc.total_purchased, uc.total_used,
             uc.updated_at
      FROM projects p
      LEFT JOIN user_credits uc ON uc.project_id = p.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.id
    `);
    
    console.table(projects.rows);
    
    console.log('\n=== RECENT CREDIT TRANSACTIONS ===');
    const transactions = await pool.query(`
      SELECT 
        ct.id,
        ct.transaction_type,
        ct.amount,
        ct.balance_after,
        p.name as project_name,
        u.email as user_email,
        ct.stripe_checkout_session_id,
        ct.description,
        ct.created_at
      FROM credit_transactions ct
      JOIN projects p ON p.id = ct.project_id
      JOIN users u ON u.id = ct.user_id
      ORDER BY ct.created_at DESC
      LIMIT 10
    `);
    
    console.table(transactions.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error checking credits:', error);
    await pool.end();
    process.exit(1);
  }
}

checkCredits();
