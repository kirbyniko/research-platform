require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testCreateRecordType() {
  try {
    const project = await pool.query(`SELECT * FROM projects WHERE slug = 'project-a'`);
    if (project.rows.length === 0) {
      console.log('Project not found');
      process.exit(1);
    }
    
    const projectId = project.rows[0].id;
    console.log('Project ID:', projectId);
    
    // Try to insert a record type
    console.log('\nAttempting to create record type...');
    
    const result = await pool.query(
      `INSERT INTO record_types (
        project_id, slug, name, name_plural, description,
        guest_form_enabled, requires_review, requires_validation,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        projectId,
        'test-form',
        'Test Form',
        'Test Forms',
        'A test form type',
        true,
        true,
        true,
        0
      ]
    );
    
    console.log('✓ Record type created:');
    console.log('  ID:', result.rows[0].id);
    console.log('  Name:', result.rows[0].name);
    console.log('  Slug:', result.rows[0].slug);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detail:', error.detail);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

testCreateRecordType();
