import pg from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.production.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log('🚀 Running migration 020 - AI Usage & Credits System');
    
    const sql = fs.readFileSync('./scripts/migrations/020-ai-usage-credits.sql', 'utf8');
    
    // Check if ai_usage table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_usage'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ AI usage tables already exist');
    } else {
      console.log('📝 Creating AI usage tables...');
      await pool.query(sql);
      console.log('✅ Migration completed!');
    }
    
    // Verify tables
    const tables = ['ai_usage', 'user_credits', 'credit_transactions', 'rate_limit_tiers'];
    for (const table of tables) {
      const check = await pool.query(`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) as exists
      `, [table]);
      console.log(`  - ${table}: ${check.rows[0].exists ? '✅' : '❌'}`);
    }
    
    // Check rate limit tiers
    const tiers = await pool.query(`SELECT name, requests_per_hour, requests_per_day FROM rate_limit_tiers`);
    console.log('\nRate limit tiers:');
    tiers.rows.forEach(t => console.log(`  - ${t.name}: ${t.requests_per_hour}/hr, ${t.requests_per_day}/day`));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
