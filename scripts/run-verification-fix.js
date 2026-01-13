// CRITICAL SECURITY FIX: Run the verification status fix on production database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSecurityFix() {
  // Get DATABASE_URL from production env file
  const envFile = fs.readFileSync('.env.prod.temp', 'utf8');
  const dbUrlMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
  
  if (!dbUrlMatch) {
    console.error('❌ DATABASE_URL not found in .env.prod.temp');
    process.exit(1);
  }
  
  const DATABASE_URL = dbUrlMatch[1].trim();
  
  console.log('🔌 Connecting to production database...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    const sql = fs.readFileSync('./scripts/fix-verification-security.sql', 'utf8');
    
    console.log('🔒 Running security fix on production database...\n');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && statement.length > 0) {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
        const result = await client.query(statement);
        if (result.rows && result.rows.length > 0) {
          console.table(result.rows);
        }
        if (result.rowCount !== undefined) {
          console.log(`   ✓ Affected rows: ${result.rowCount}`);
        }
      }
    }
    
    console.log('\n✅ Security fix applied successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSecurityFix();
