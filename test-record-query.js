const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testQuery() {
  try {
    const recordId = 4;
    const projectId = 1;
    
    console.log('Testing record query for record ID:', recordId);
    console.log('');
    
    // Test the exact query from the API
    const recordResult = await pool.query(
      `SELECT r.*, 
        rt.slug as record_type_slug,
        rt.name as record_type_name,
        u.name as submitted_by_name,
        u.email as submitted_by_email,
        rev.name as reviewed_by_name,
        val.name as validated_by_name
       FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       LEFT JOIN users u ON r.submitted_by = u.id
       LEFT JOIN users rev ON r.reviewed_by = rev.id
       LEFT JOIN users val ON r.validated_by = val.id
       WHERE r.id = $1 AND r.project_id = $2 AND r.deleted_at IS NULL`,
      [recordId, projectId]
    );
    
    console.log('Record query successful!');
    console.log('Rows returned:', recordResult.rows.length);
    if (recordResult.rows.length > 0) {
      console.log('\nRecord data:');
      console.log(JSON.stringify(recordResult.rows[0], null, 2));
    }
    console.log('');
    
    // Test field definitions query
    const record = recordResult.rows[0];
    const fieldsResult = await pool.query(
      `SELECT fd.*, fg.name as group_name, fg.sort_order as group_sort_order
       FROM field_definitions fd
       LEFT JOIN field_groups fg ON fd.field_group_id = fg.id
       WHERE fd.record_type_id = $1
       ORDER BY fg.sort_order NULLS FIRST, fd.sort_order, fd.name`,
      [record.record_type_id]
    );
    
    console.log('Field definitions query successful!');
    console.log('Fields returned:', fieldsResult.rows.length);
    console.log('');
    
    // Test quotes query
    const quotesResult = await pool.query(
      `SELECT * FROM record_quotes 
       WHERE record_id = $1 
       ORDER BY created_at`,
      [record.id]
    );
    
    console.log('Quotes query successful!');
    console.log('Quotes returned:', quotesResult.rows.length);
    console.log('');
    
    // Test sources query
    const sourcesResult = await pool.query(
      `SELECT * FROM record_sources 
       WHERE record_id = $1 
       ORDER BY created_at`,
      [record.id]
    );
    
    console.log('Sources query successful!');
    console.log('Sources returned:', sourcesResult.rows.length);
    console.log('');
    
    console.log('ALL QUERIES SUCCESSFUL - API should work!');
    
  } catch (error) {
    console.error('Error during test:');
    console.error('Message:', error.message);
    console.error('');
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testQuery();
