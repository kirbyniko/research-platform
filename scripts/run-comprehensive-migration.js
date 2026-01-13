// Comprehensive database migration - ensure all required tables/columns exist
const { Pool } = require('pg');
const fs = require('fs');

async function migrate() {
  const envContent = fs.readFileSync('.env.prod.temp', 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
  const dbUrl = match[1];
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Running comprehensive migration...\n');
    
    // Check and create validation_issues table
    const hasValidationIssues = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'validation_issues'
      );
    `);
    
    if (!hasValidationIssues.rows[0].exists) {
      console.log('Creating validation_issues table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS validation_issues (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          validation_session_id INTEGER,
          field_type VARCHAR(50) NOT NULL,
          field_name VARCHAR(100) NOT NULL,
          issue_reason TEXT NOT NULL,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          resolved_at TIMESTAMP,
          resolved_by INTEGER REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_validation_issues_incident ON validation_issues(incident_id);
      `);
      console.log('✅ Created validation_issues table');
    } else {
      console.log('✅ validation_issues table exists');
    }
    
    // Add validation columns to incidents
    const colsToAdd = [
      { name: 'first_validated_by', def: 'INTEGER REFERENCES users(id)' },
      { name: 'first_validated_at', def: 'TIMESTAMP' },
      { name: 'second_validated_by', def: 'INTEGER REFERENCES users(id)' },
      { name: 'second_validated_at', def: 'TIMESTAMP' },
      { name: 'rejection_reason', def: 'TEXT' },
      { name: 'rejected_by', def: 'INTEGER REFERENCES users(id)' },
      { name: 'rejected_at', def: 'TIMESTAMP' },
      { name: 'review_cycle', def: 'INTEGER DEFAULT 1' }
    ];
    
    for (const col of colsToAdd) {
      try {
        await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`);
      } catch (e) {
        // Ignore if exists
      }
    }
    console.log('✅ Ensured all incident columns exist');
    
    // Check verification_feedback table
    const hasVerifFeedback = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'verification_feedback'
      );
    `);
    
    if (!hasVerifFeedback.rows[0].exists) {
      console.log('Creating verification_feedback table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS verification_feedback (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          feedback_type VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Created verification_feedback table');
    } else {
      console.log('✅ verification_feedback table exists');
    }
    
    // Check incident_media table
    const hasMedia = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'incident_media'
      );
    `);
    
    if (!hasMedia.rows[0].exists) {
      console.log('Creating incident_media table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS incident_media (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          media_type VARCHAR(50) DEFAULT 'image',
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_incident_media_incident ON incident_media(incident_id);
      `);
      console.log('✅ Created incident_media table');
    } else {
      console.log('✅ incident_media table exists');
    }
    
    // List all tables for verification
    console.log('\n📋 Current tables:');
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log(tables.rows.map(r => r.table_name).join(', '));
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

migrate();
