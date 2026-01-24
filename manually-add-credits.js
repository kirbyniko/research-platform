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

async function manuallyAddCredits() {
  const projectId = process.argv[2];
  const amount = parseInt(process.argv[3]);
  const userId = process.argv[4] || 1; // Default to user ID 1
  
  if (!projectId || !amount) {
    console.error('Usage: node manually-add-credits.js <projectId> <amount> [userId]');
    console.error('Example: node manually-add-credits.js 1 100 1');
    process.exit(1);
  }
  
  try {
    // Ensure project has a credits record
    await pool.query(`
      INSERT INTO user_credits (project_id, balance, total_purchased, total_used)
      VALUES ($1, 0, 0, 0)
      ON CONFLICT DO NOTHING
    `, [projectId]);
    
    // Add credits
    const updateResult = await pool.query(`
      UPDATE user_credits 
      SET 
        balance = balance + $2, 
        total_purchased = total_purchased + $2,
        updated_at = NOW()
      WHERE project_id = $1
      RETURNING balance, total_purchased
    `, [projectId, amount]);
    
    if (updateResult.rows.length === 0) {
      console.error('Failed to update credits - project not found');
      process.exit(1);
    }
    
    const { balance, total_purchased } = updateResult.rows[0];
    
    // Record transaction
    await pool.query(`
      INSERT INTO credit_transactions 
      (user_id, project_id, transaction_type, amount, balance_after, description)
      VALUES ($1, $2, 'admin_adjustment', $3, $4, $5)
    `, [
      userId,
      projectId,
      amount,
      balance,
      `Manual credit addition - webhook failed`
    ]);
    
    console.log(`✅ Added ${amount} credits to project ${projectId}`);
    console.log(`   New balance: ${balance}`);
    console.log(`   Total purchased: ${total_purchased}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error adding credits:', error);
    await pool.end();
    process.exit(1);
  }
}

manuallyAddCredits();
