// Test documents table
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

async function test() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ documents table does not exist!');
      console.log('\nRun this to create it:');
      console.log('psql -U postgres -d ice_deaths -f scripts/add-documents-tables.sql');
    } else {
      console.log('✅ documents table exists with columns:');
      tableCheck.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    
    // Also check extracted_quotes
    const quotesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'extracted_quotes'
      ORDER BY ordinal_position
    `);
    
    if (quotesCheck.rows.length === 0) {
      console.log('\n❌ extracted_quotes table does not exist!');
    } else {
      console.log('\n✅ extracted_quotes table exists with', quotesCheck.rows.length, 'columns');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
