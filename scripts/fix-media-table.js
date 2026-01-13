// Fix incident_media table structure
const { Pool } = require('pg');
const fs = require('fs');

async function fix() {
  const envContent = fs.readFileSync('.env.prod.temp', 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
  const dbUrl = match[1];
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Fixing incident_media table...\n');
    
    // Get current columns
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incident_media'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    for (const row of cols.rows) {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    }
    
    // Add missing columns
    const colsToAdd = [
      { name: 'title', def: 'VARCHAR(255)' },
      { name: 'credit', def: 'VARCHAR(255)' },
      { name: 'license', def: 'VARCHAR(100)' },
      { name: 'source_url', def: 'TEXT' },
      { name: 'source_publication', def: 'VARCHAR(255)' },
      { name: 'media_date', def: 'DATE' },
      { name: 'is_primary', def: 'BOOLEAN DEFAULT false' },
      { name: 'display_order', def: 'INTEGER DEFAULT 0' },
      { name: 'updated_at', def: 'TIMESTAMP DEFAULT NOW()' }
    ];
    
    console.log('\nAdding missing columns...');
    for (const col of colsToAdd) {
      try {
        await pool.query(`ALTER TABLE incident_media ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`);
        console.log(`  Added: ${col.name}`);
      } catch (e) {
        console.log(`  Skipped: ${col.name} (already exists or error)`);
      }
    }
    
    // Verify
    const newCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incident_media'
      ORDER BY ordinal_position
    `);
    
    console.log('\nUpdated columns:');
    for (const row of newCols.rows) {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fix();
