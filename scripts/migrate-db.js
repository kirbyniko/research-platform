import { Pool } from 'pg';

// Source database (local)
const sourcePool = new Pool({
  connectionString: process.env.SOURCE_DB || 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

// Target database (Neon cloud)
const targetPool = new Pool({
  connectionString: process.env.TARGET_DB || process.env.DATABASE_URL
});

async function copyTable(tableName, sourceQuery = null, transform = null) {
  console.log(`\nCopying ${tableName}...`);
  
  try {
    // Get data from source
    const query = sourceQuery || `SELECT * FROM ${tableName}`;
    const sourceResult = await sourcePool.query(query);
    
    if (sourceResult.rows.length === 0) {
      console.log(`  No data in ${tableName}`);
      return 0;
    }
    
    // Transform data if needed
    const rows = transform ? sourceResult.rows.map(transform) : sourceResult.rows;
    
    // Get column names from first row
    const columns = Object.keys(rows[0]);
    const placeholders = rows.map((_, rowIdx) => 
      `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`
    ).join(', ');
    
    const values = rows.flatMap(row => columns.map(col => row[col]));
    
    // Insert into target with conflict handling
    const insertQuery = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ON CONFLICT DO NOTHING
    `;
    
    await targetPool.query(insertQuery, values);
    console.log(`  ✓ Copied ${rows.length} rows`);
    return rows.length;
    
  } catch (error) {
    console.error(`  ✗ Error copying ${tableName}:`, error.message);
    return 0;
  }
}

async function migrateDatabase() {
  console.log('Starting database migration...');
  console.log('Source:', process.env.SOURCE_DB || 'postgresql://localhost:5432/ice_deaths');
  console.log('Target:', process.env.TARGET_DB || process.env.DATABASE_URL);
  
  try {
    // Test connections
    await sourcePool.query('SELECT 1');
    await targetPool.query('SELECT 1');
    console.log('✓ Both databases connected\n');
    
    let totalRows = 0;
    
    // 1. Users (must come first due to foreign keys)
    totalRows += await copyTable('users');
    
    // 2. Legacy cases table
    totalRows += await copyTable('cases');
    
    // 3. Incidents (main table)
    totalRows += await copyTable('incidents');
    
    // 4. Related incident tables
    totalRows += await copyTable('incident_agencies');
    totalRows += await copyTable('incident_violations');
    totalRows += await copyTable('incident_details');
    totalRows += await copyTable('incident_sources');
    totalRows += await copyTable('incident_quotes');
    totalRows += await copyTable('incident_timeline');
    
    // 5. Documents
    totalRows += await copyTable('documents');
    totalRows += await copyTable('document_fields');
    
    // 6. Edit suggestions
    totalRows += await copyTable('edit_suggestions');
    
    // 7. Bug reports
    totalRows += await copyTable('bug_reports');
    
    // 8. API keys
    totalRows += await copyTable('api_keys');
    
    console.log(`\n✓ Migration complete! Copied ${totalRows} total rows.`);
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

migrateDatabase();
