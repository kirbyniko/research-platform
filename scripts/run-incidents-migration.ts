// Migration script to create incidents tables
import pool from '../src/lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('Starting incidents schema migration...');
  
  const client = await pool.connect();
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'incidents-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'incident%'
      ORDER BY table_name
    `);
    
    console.log('\nCreated tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
