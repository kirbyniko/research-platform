// Create test-form record type and then run comprehensive test data
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setup() {
  try {
    console.log('🔍 Checking for project-a...');
    
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1',
      ['project-a']
    );
    
    if (projectResult.rows.length === 0) {
      console.log('❌ Project "project-a" not found. Please create it first.');
      process.exit(1);
    }
    
    const projectId = projectResult.rows[0].id;
    console.log(`✅ Found project (ID: ${projectId})`);
    
    // Check if test-form record type exists
    const rtCheck = await pool.query(
      'SELECT id FROM record_types WHERE slug = $1',
      ['test-form']
    );
    
    if (rtCheck.rows.length > 0) {
      console.log(`✅ Record type "test-form" already exists (ID: ${rtCheck.rows[0].id})`);
    } else {
      console.log('📝 Creating "test-form" record type...');
      await pool.query(
        `INSERT INTO record_types (
          project_id, slug, name, description,
          guest_form_enabled, requires_review, requires_validation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          projectId, 'test-form', 'Death/Incident Record',
          'Comprehensive death and incident documentation form',
          true, true, true
        ]
      );
      console.log('✅ Record type created');
    }
    
    console.log('\n✅ Setup complete! Now run:');
    console.log('   node create-comprehensive-test-data.js');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

setup();
