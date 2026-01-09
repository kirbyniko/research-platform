const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ice_deaths',
  password: 'password',
  port: 5432,
});

async function runFieldVerificationMigration() {
  console.log('Running field verification schema migration...\n');
  
  try {
    // Field verification tracking table
    console.log('Creating incident_field_verifications table...');
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
    console.log('✓ incident_field_verifications table created');

    // Verification disputes table
    console.log('Creating verification_disputes table...');
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
    console.log('✓ verification_disputes table created');

    // Add columns to incidents table
    console.log('Adding verification columns to incidents table...');
    
    const alterColumns = [
      ['submitted_by', 'INTEGER REFERENCES users(id)'],
      ['submitted_at', 'TIMESTAMP'],
      ['first_verified_by', 'INTEGER REFERENCES users(id)'],
      ['first_verified_at', 'TIMESTAMP'],
      ['first_verification_notes', 'TEXT'],
      ['second_verified_by', 'INTEGER REFERENCES users(id)'],
      ['second_verified_at', 'TIMESTAMP'],
      ['second_verification_notes', 'TEXT'],
      ['verification_status', "VARCHAR(20) DEFAULT 'pending'"],
      ['submitter_role', 'VARCHAR(20)'],
      ['victim_name', 'VARCHAR(200)'],
      ['facility_name', 'VARCHAR(200)'],
      ['description', 'TEXT']
    ];
    
    for (const [col, type] of alterColumns) {
      try {
        await pool.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ${col} ${type}`);
        console.log(`  ✓ Added column: ${col}`);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.log(`  ⚠ Column ${col}: ${e.message}`);
        }
      }
    }

    // Copy subject_name to victim_name if needed
    console.log('Syncing victim_name with subject_name...');
    await pool.query(`
      UPDATE incidents 
      SET victim_name = subject_name 
      WHERE victim_name IS NULL AND subject_name IS NOT NULL
    `);
    console.log('✓ victim_name synced');

    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_field_verif_incident ON incident_field_verifications(incident_id)',
      'CREATE INDEX IF NOT EXISTS idx_field_verif_status ON incident_field_verifications(verification_status)',
      'CREATE INDEX IF NOT EXISTS idx_field_verif_first ON incident_field_verifications(first_verified_by)',
      'CREATE INDEX IF NOT EXISTS idx_field_verif_second ON incident_field_verifications(second_verified_by)',
      'CREATE INDEX IF NOT EXISTS idx_disputes_incident ON verification_disputes(incident_id)',
      'CREATE INDEX IF NOT EXISTS idx_disputes_status ON verification_disputes(resolution_status)',
      'CREATE INDEX IF NOT EXISTS idx_incidents_verif_status ON incidents(verification_status)'
    ];
    
    for (const idx of indexes) {
      await pool.query(idx);
    }
    console.log('✓ Indexes created');

    console.log('\n✅ Field verification schema migration complete!');
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runFieldVerificationMigration();
