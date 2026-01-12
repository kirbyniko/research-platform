/**
 * Run Validation Architecture Migration
 * Adds support for the new Review → Validation workflow
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Validation Architecture Migration...\n');
    
    await client.query('BEGIN');
    
    // Phase 1: Add validation columns to incidents
    console.log('📦 Phase 1: Adding validation tracking columns to incidents...');
    
    const columnsToAdd = [
      ['first_validated_by', 'INTEGER REFERENCES users(id)'],
      ['first_validated_at', 'TIMESTAMP'],
      ['second_validated_by', 'INTEGER REFERENCES users(id)'],
      ['second_validated_at', 'TIMESTAMP'],
      ['rejection_reason', 'TEXT'],
      ['rejected_by', 'INTEGER REFERENCES users(id)'],
      ['rejected_at', 'TIMESTAMP']
    ];
    
    for (const [column, type] of columnsToAdd) {
      const checkResult = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'incidents' AND column_name = $1
      `, [column]);
      
      if (checkResult.rows.length === 0) {
        await client.query(`ALTER TABLE incidents ADD COLUMN ${column} ${type}`);
        console.log(`   ✅ Added column: ${column}`);
      } else {
        console.log(`   ⏭️  Column already exists: ${column}`);
      }
    }
    
    // Phase 2: Create validation_issues table
    console.log('\n📦 Phase 2: Creating validation_issues table...');
    
    const tableExists = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'validation_issues'
    `);
    
    if (tableExists.rows.length === 0) {
      await client.query(`
        CREATE TABLE validation_issues (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          validation_session_id INTEGER,
          field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('field', 'quote', 'timeline', 'source')),
          field_name VARCHAR(100) NOT NULL,
          issue_reason TEXT NOT NULL,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          resolved_at TIMESTAMP,
          resolved_by INTEGER REFERENCES users(id)
        )
      `);
      console.log('   ✅ Created validation_issues table');
    } else {
      console.log('   ⏭️  Table already exists: validation_issues');
    }
    
    // Phase 3: Create indexes
    console.log('\n📦 Phase 3: Creating indexes...');
    
    const indexes = [
      ['idx_validation_issues_incident', 'validation_issues(incident_id)'],
      ['idx_validation_issues_unresolved', 'validation_issues(incident_id) WHERE resolved_at IS NULL'],
      ['idx_incidents_needs_validation', 'incidents(verification_status) WHERE verification_status IN (\'second_review\', \'first_validation\')'],
      ['idx_incidents_rejected', 'incidents(verification_status) WHERE verification_status = \'rejected\'']
    ];
    
    for (const [name, definition] of indexes) {
      try {
        await client.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${definition}`);
        console.log(`   ✅ Created index: ${name}`);
      } catch (err) {
        if (err.code === '42P07') {
          console.log(`   ⏭️  Index already exists: ${name}`);
        } else {
          throw err;
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Verify migration
    console.log('\n📋 Verifying migration...');
    
    const verifyColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incidents' 
      AND column_name IN ('first_validated_by', 'first_validated_at', 'second_validated_by', 'second_validated_at', 'rejection_reason', 'rejected_by', 'rejected_at')
    `);
    console.log(`   Found ${verifyColumns.rows.length}/7 validation columns in incidents table`);
    
    const verifyTable = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'validation_issues'
    `);
    console.log(`   validation_issues table: ${verifyTable.rows.length > 0 ? '✅ exists' : '❌ missing'}`);
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('New workflow status values:');
    console.log('  pending → first_review → second_review → first_validation → verified');
    console.log('                                    ↓');
    console.log('                                rejected');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
