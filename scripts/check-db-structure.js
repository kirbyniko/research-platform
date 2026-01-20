/**
 * Check Database Structure
 * Shows what tables exist and what data is in them
 */

require('dotenv').config({ path: '.env.production', override: true });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    console.log('\n=== CHECKING DATABASE STRUCTURE ===\n');

    // List all tables
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('📊 Tables:');
    tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
    
    // Check projects
    console.log('\n📁 Projects:');
    const projects = await pool.query('SELECT id, slug, name, is_public FROM projects ORDER BY id');
    if (projects.rows.length === 0) {
      console.log('  ⚠️  No projects found');
    } else {
      projects.rows.forEach(p => console.log(`  ${p.id}. ${p.name} (slug: ${p.slug}, public: ${p.is_public})`));
    }
    
    // Check record types
    console.log('\n📝 Record Types:');
    const recordTypes = await pool.query(`
      SELECT rt.id, rt.slug, rt.name, p.slug as project_slug
      FROM record_types rt
      JOIN projects p ON rt.project_id = p.id
      ORDER BY rt.id
    `);
    if (recordTypes.rows.length === 0) {
      console.log('  ⚠️  No record types found');
    } else {
      recordTypes.rows.forEach(rt => console.log(`  ${rt.id}. ${rt.name} (${rt.project_slug}/${rt.slug})`));
    }
    
    // Check field groups
    console.log('\n📁 Field Groups:');
    const groups = await pool.query(`
      SELECT fg.id, fg.name, fg.slug, rt.name as record_type
      FROM field_groups fg
      JOIN record_types rt ON fg.record_type_id = rt.id
      ORDER BY rt.id, fg.sort_order
    `);
    if (groups.rows.length === 0) {
      console.log('  ⚠️  No field groups found');
    } else {
      groups.rows.forEach(g => console.log(`  ${g.id}. ${g.record_type} > ${g.name} (${g.slug})`));
    }
    
    // Check field definitions
    console.log('\n📋 Field Definitions (count by record type):');
    const fields = await pool.query(`
      SELECT rt.name as record_type, COUNT(*) as field_count
      FROM field_definitions fd
      JOIN record_types rt ON fd.record_type_id = rt.id
      GROUP BY rt.name
      ORDER BY rt.name
    `);
    if (fields.rows.length === 0) {
      console.log('  ⚠️  No field definitions found');
    } else {
      fields.rows.forEach(f => console.log(`  ${f.record_type}: ${f.field_count} fields`));
    }
    
    // Check records
    console.log('\n📄 Records (count by type and status):');
    const records = await pool.query(`
      SELECT rt.name as record_type, r.status, COUNT(*) as count
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE r.deleted_at IS NULL
      GROUP BY rt.name, r.status
      ORDER BY rt.name, r.status
    `);
    if (records.rows.length === 0) {
      console.log('  ⚠️  No records found');
    } else {
      records.rows.forEach(r => console.log(`  ${r.record_type} [${r.status}]: ${r.count}`));
    }
    
    // Check users
    console.log('\n👥 Users:');
    const users = await pool.query('SELECT id, email, role FROM users ORDER BY id');
    if (users.rows.length === 0) {
      console.log('  ⚠️  No users found');
    } else {
      users.rows.forEach(u => console.log(`  ${u.id}. ${u.email} (${u.role})`));
    }
    
    console.log('\n✅ Database check complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
