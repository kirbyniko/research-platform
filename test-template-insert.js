import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testTemplateInsert() {
  try {
    console.log('🧪 Testing template insert...\n');
    
    // Get a real project and record type
    const projects = await pool.query(`SELECT id, slug FROM projects WHERE slug = 'project-a' LIMIT 1`);
    if (projects.rows.length === 0) {
      console.log('❌ No projects found');
      return;
    }
    
    const project = projects.rows[0];
    console.log('Project:', project);
    
    const recordTypes = await pool.query(`SELECT id, slug FROM record_types WHERE project_id = $1 LIMIT 1`, [project.id]);
    if (recordTypes.rows.length === 0) {
      console.log('❌ No record types found');
      return;
    }
    
    const recordType = recordTypes.rows[0];
    console.log('Record Type:', recordType);
    
    // Get a user
    const users = await pool.query(`SELECT id FROM users LIMIT 1`);
    if (users.rows.length === 0) {
      console.log('❌ No users found');
      return;
    }
    const userId = users.rows[0].id;
    console.log('User ID:', userId);
    
    // Try to insert a simple template
    const template = {
      version: 1,
      page: { maxWidth: '1200px', padding: '2rem', backgroundColor: '#ffffff' },
      sections: []
    };
    
    console.log('\n📝 Inserting template...');
    const result = await pool.query(
      `INSERT INTO display_templates 
       (project_id, record_type_id, name, description, template, is_default, ai_prompt, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name`,
      [
        project.id,
        recordType.id,
        'Test Template',
        'Test description',
        JSON.stringify(template),
        false,
        null,
        userId,
      ]
    );
    
    console.log('✅ Template inserted successfully!');
    console.log('ID:', result.rows[0].id);
    console.log('Name:', result.rows[0].name);
    
    // Clean up
    await pool.query(`DELETE FROM display_templates WHERE id = $1`, [result.rows[0].id]);
    console.log('✅ Test template deleted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

testTemplateInsert();
