// Run migration 014-advanced-settings.sql
import { config } from 'dotenv';
config({ path: '.env.local' });

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const migrationPath = path.join(process.cwd(), 'scripts/migrations/014-advanced-settings.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Running migration 014-advanced-settings.sql...');
  
  try {
    // Run the entire migration as a single statement
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
