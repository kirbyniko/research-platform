const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkRecords() {
  try {
    // First, check what columns exist in records table
    const columnsResult = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'records' 
       ORDER BY ordinal_position`
    );
    
    console.log('Columns in records table:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    console.log('');
    
    // Get project-a ID
    const projectResult = await pool.query(
      `SELECT id FROM projects WHERE slug = 'project-a'`
    );
    
    if (projectResult.rows.length === 0) {
      console.log('Project "project-a" not found');
      return;
    }
    
    const projectId = projectResult.rows[0].id;
    console.log(`Project ID: ${projectId}\n`);
    
    // Get all records (without record_data)
    const recordsResult = await pool.query(
      `SELECT id, record_type_id, status, submitted_by, created_at 
       FROM records 
       WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY id`,
      [projectId]
    );
    
    console.log(`Total records in project-a: ${recordsResult.rows.length}\n`);
    
    recordsResult.rows.forEach(record => {
      console.log(`Record ID: ${record.id}`);
      console.log(`  Type ID: ${record.record_type_id}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Submitted by: ${record.submitted_by}`);
      console.log(`  Created: ${record.created_at}`);
      console.log('');
    });
    
    // Check if record 4 exists specifically
    const record4Result = await pool.query(
      `SELECT * FROM records WHERE id = 4 AND deleted_at IS NULL`
    );
    
    if (record4Result.rows.length > 0) {
      console.log('\nRecord 4 details:');
      console.log(JSON.stringify(record4Result.rows[0], null, 2));
    } else {
      console.log('\nRecord 4 does not exist or is deleted');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkRecords();
