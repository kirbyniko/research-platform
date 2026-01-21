/**
 * Test the members query directly to debug 500 error
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to database\n');
    
    // First, check if the columns exist
    console.log('1️⃣ Checking if columns exist in project_members...');
    const colCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'project_members' 
      AND column_name IN ('can_upload', 'upload_quota_bytes')
      ORDER BY column_name
    `);
    
    if (colCheck.rows.length === 0) {
      console.log('❌ Columns do NOT exist!\n');
    } else {
      console.log('✅ Columns exist:');
      colCheck.rows.forEach(row => {
        console.log(`   ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
      console.log();
    }
    
    // Check if project exists
    console.log('2️⃣ Checking if project-a exists...');
    const projectCheck = await client.query(
      `SELECT id, slug, name FROM projects WHERE slug = 'project-a' AND deleted_at IS NULL`
    );
    
    if (projectCheck.rows.length === 0) {
      console.log('❌ Project "project-a" not found!\n');
      return;
    }
    
    const projectId = projectCheck.rows[0].id;
    console.log(`✅ Found project: ${projectCheck.rows[0].name} (id: ${projectId})\n`);
    
    // Try the actual query from the API
    console.log('3️⃣ Running the members query...');
    const membersResult = await client.query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.permissions, 
        pm.invited_by, pm.invited_at, pm.accepted_at, 
        COALESCE(pm.can_upload, false) as can_upload, 
        pm.upload_quota_bytes,
        u.name, u.email,
        inviter.name as invited_by_name
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       LEFT JOIN users inviter ON pm.invited_by = inviter.id
       WHERE pm.project_id = $1
       ORDER BY 
         CASE pm.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           WHEN 'analyst' THEN 3
           WHEN 'validator' THEN 4
           WHEN 'reviewer' THEN 5
           WHEN 'viewer' THEN 6
         END,
         pm.invited_at DESC`,
      [projectId]
    );
    
    console.log(`✅ Query succeeded! Found ${membersResult.rows.length} members\n`);
    
    if (membersResult.rows.length > 0) {
      console.log('Sample member data:');
      const member = membersResult.rows[0];
      console.log(JSON.stringify({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        can_upload: member.can_upload,
        upload_quota_bytes: member.upload_quota_bytes,
        user_name: member.name,
        user_email: member.email
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testQuery();
