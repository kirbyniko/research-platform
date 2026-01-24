import pg from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Load production environment
dotenv.config({ path: '.env.production.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log('🚀 Running migration 019 - Display Templates System');
    console.log('Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);
    
    // Read the migration SQL
    const sql = fs.readFileSync('./scripts/migrations/019-display-templates.sql', 'utf8');
    
    // Check if table already exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'display_templates'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ display_templates table already exists');
      
      // Show columns
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'display_templates' 
        ORDER BY ordinal_position
      `);
      console.log('\nExisting columns:');
      cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    } else {
      console.log('📝 Creating display_templates table...');
      
      // Run the migration
      await pool.query(sql);
      
      console.log('✅ Migration completed successfully!');
      
      // Verify
      const verify = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'display_templates' 
        ORDER BY ordinal_position
      `);
      console.log('\nCreated columns:');
      verify.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
