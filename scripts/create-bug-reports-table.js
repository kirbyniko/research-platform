// Run this to create the bug_reports table
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createBugReportsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        steps TEXT,
        reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        page_url TEXT,
        user_agent TEXT,
        extension_version VARCHAR(20),
        case_context JSONB,
        console_errors JSONB,
        metadata JSONB,
        status VARCHAR(20) DEFAULT 'open',
        notes TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bug_reports_reported_at ON bug_reports(reported_at DESC);
    `);
    
    console.log('✅ bug_reports table created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createBugReportsTable();
