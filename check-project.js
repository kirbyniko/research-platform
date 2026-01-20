require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProject() {
  try {
    // Check project
    const project = await pool.query(`SELECT * FROM projects WHERE slug = 'project-a'`);
    console.log('\n=== PROJECT ===');
    if (project.rows.length > 0) {
      console.log('ID:', project.rows[0].id);
      console.log('Name:', project.rows[0].name);
      console.log('Created by:', project.rows[0].created_by);
    } else {
      console.log('Project not found');
      process.exit(0);
    }
    
    const projectId = project.rows[0].id;
    const createdBy = project.rows[0].created_by;
    
    // Check project_members
    const members = await pool.query(`SELECT * FROM project_members WHERE project_id = $1`, [projectId]);
    console.log('\n=== PROJECT MEMBERS ===');
    if (members.rows.length === 0) {
      console.log('❌ NO MEMBERS FOUND - This is the problem!');
      console.log('\nFixing by adding creator as owner...');
      
      await pool.query(
        `INSERT INTO project_members (project_id, user_id, role, accepted_at)
         VALUES ($1, $2, 'owner', NOW())
         ON CONFLICT DO NOTHING`,
        [projectId, createdBy]
      );
      
      console.log('✓ Added creator as owner');
    } else {
      console.log('Members found:');
      members.rows.forEach(m => {
        console.log(`  - User ${m.user_id}: ${m.role} (accepted: ${m.accepted_at})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkProject();
