require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.PRODUCTION_DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ PRODUCTION_DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔌 Connecting to Neon database...');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sqlPath = path.join(__dirname, 'scripts', 'statements-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
