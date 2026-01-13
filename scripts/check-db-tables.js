// Check database tables and incidents
const { Pool } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');

async function check() {
  // Get production DATABASE_URL via vercel CLI
  console.log('Getting production DATABASE_URL...');
  
  try {
    const result = execSync('vercel env ls production 2>&1', { encoding: 'utf8' });
    console.log('Vercel env ls result:', result.includes('DATABASE_URL') ? 'Has DATABASE_URL' : 'No DATABASE_URL found');
  } catch (e) {}
  
  // Try to get from .env.production
  let dbUrl;
  try {
    const envContent = fs.readFileSync('.env.production', 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) {
      dbUrl = match[1];
      console.log('Found DATABASE_URL in .env.production');
    }
  } catch (e) {
    console.log('Could not read .env.production');
  }
  
  // Try .env.prod.temp (from previous run)
  if (!dbUrl) {
    try {
      const envContent = fs.readFileSync('.env.prod.temp', 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
      if (match) {
        dbUrl = match[1];
        console.log('Found DATABASE_URL in .env.prod.temp');
      }
    } catch (e) {}
  }
  
  if (!dbUrl) {
    console.error('Could not find DATABASE_URL');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // List all tables
    console.log('\n📋 Tables in database:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(tables.rows.map(r => r.table_name).join(', '));
    
    // Check if incident_field_verifications exists
    const hasFieldVerif = tables.rows.some(r => r.table_name === 'incident_field_verifications');
    console.log('\n✅ incident_field_verifications exists:', hasFieldVerif);
    
    if (!hasFieldVerif) {
      console.log('\n⚠️ Creating incident_field_verifications table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS incident_field_verifications (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          field_name VARCHAR(100) NOT NULL,
          field_value TEXT,
          first_verified_by INTEGER REFERENCES users(id),
          first_verified_at TIMESTAMP,
          first_verification_notes TEXT,
          first_verification_source_ids INTEGER[],
          second_verified_by INTEGER REFERENCES users(id),
          second_verified_at TIMESTAMP,
          second_verification_notes TEXT,
          second_verification_source_ids INTEGER[],
          verification_status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(incident_id, field_name)
        )
      `);
      console.log('✅ Created table');
    }
    
    // Check if verification_disputes exists
    const hasDisputes = tables.rows.some(r => r.table_name === 'verification_disputes');
    console.log('✅ verification_disputes exists:', hasDisputes);
    
    if (!hasDisputes) {
      console.log('\n⚠️ Creating verification_disputes table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS verification_disputes (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          field_name VARCHAR(100),
          raised_by INTEGER NOT NULL REFERENCES users(id),
          raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          dispute_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          resolved_by INTEGER REFERENCES users(id),
          resolved_at TIMESTAMP,
          resolution TEXT,
          resolution_status VARCHAR(20) DEFAULT 'open',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created table');
    }
    
    // Check incidents 48 and 49
    console.log('\n📊 Checking incidents 48, 49:');
    const incidents = await pool.query(`
      SELECT id, victim_name, incident_date, verification_status, submitted_by 
      FROM incidents 
      WHERE id IN (48, 49)
    `);
    console.log(incidents.rows);
    
    // Check recent guest submissions
    console.log('\n📊 Recent guest submissions:');
    const subs = await pool.query(`
      SELECT id, status, created_at, 
             submission_data->>'victimName' as name,
             submission_data->>'description' as desc
      FROM guest_submissions
      ORDER BY created_at DESC
      LIMIT 5
    `);
    for (const row of subs.rows) {
      console.log(`  ID ${row.id}: ${row.name || 'Unknown'} - ${row.status} (${row.created_at})`);
      if (row.desc) console.log(`    Desc: ${row.desc.substring(0, 80)}...`);
    }
    
    // Check if review_cycle column exists
    const cols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incidents' AND column_name = 'review_cycle'
    `);
    console.log('\n✅ review_cycle column exists:', cols.rows.length > 0);
    
    if (cols.rows.length === 0) {
      console.log('⚠️ Adding review_cycle column...');
      await pool.query('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS review_cycle INTEGER DEFAULT 1');
      console.log('✅ Added');
    }
    
    console.log('\n✅ Database check complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

check();
