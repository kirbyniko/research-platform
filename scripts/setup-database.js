/**
 * Database Setup Script
 * Run this to initialize the database schema on your Neon PostgreSQL instance
 * 
 * Usage: node scripts/setup-database.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable not set');
  console.error('Set it in your .env.local file or pass it as an environment variable');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
const pool = new Pool({ connectionString });

async function runSQLFile(filename) {
  const filepath = join(__dirname, filename);
  console.log(`\n📄 Running ${filename}...`);
  
  try {
    const sql = readFileSync(filepath, 'utf8');
    await pool.query(sql);
    console.log(`✅ ${filename} completed successfully`);
    return true;
  } catch (error) {
    // If the error is about something already existing, that's okay
    if (error.message.includes('already exists')) {
      console.log(`⚠️  ${filename} - some objects already exist (continuing...)`);
      return true;
    }
    console.error(`❌ Error running ${filename}:`, error.message);
    return false;
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup...\n');

    // Run schema files in order
    const schemaFiles = [
      'db-schema.sql',           // Legacy case tables
      'users-schema.sql',        // Users and authentication
      'incidents-schema.sql',    // Main incidents system
      'rbac-schema.sql',         // Role-based access control
      'edit-suggestions-schema.sql', // Edit suggestions
      'add-documents-tables.sql',    // Document management
      'bug-reports-table.sql',       // Bug tracking
      'field-verification-schema.sql', // Field verification
      'quote-field-links-schema.sql',  // Quote field links
      // Skip extension-tables.sql - conflicts with existing cases table
    ];

    for (const file of schemaFiles) {
      const success = await runSQLFile(file);
      if (!success) {
        console.error(`\n❌ Failed on ${file}, stopping.`);
        process.exit(1);
      }
    }

    console.log('\n✅ Database setup complete!');
    console.log('\n📊 Next steps:');
    console.log('1. Run: node scripts/create-admin.js (to create your admin user)');
    console.log('2. Run: node scripts/add-verified-cases.js (to import verified cases from /data/cases/)');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
