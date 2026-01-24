import pg from 'pg';
import * as dotenv from 'dotenv';

// Load from production local env
dotenv.config({ path: '.env.production.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    console.log('Connected to database');
    
    // Check if display_templates table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'display_templates'
      ) as exists
    `);
    console.log('display_templates exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('\n❌ Table does not exist!');
      console.log('Run the migration: scripts/migrations/019-display-templates.sql');
      return;
    }
    
    // Show columns
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'display_templates' 
      ORDER BY ordinal_position
    `);
    console.log('\nColumns:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    
    // Check field definitions for a record type
    const recordTypes = await pool.query(`SELECT id, name, slug FROM record_types LIMIT 5`);
    console.log('\nRecord types:');
    recordTypes.rows.forEach(rt => console.log(`  - ${rt.id}: ${rt.slug} (${rt.name})`));
    
    if (recordTypes.rows.length > 0) {
      const firstRT = recordTypes.rows[0];
      const fields = await pool.query(`
        SELECT slug, name, field_type 
        FROM field_definitions 
        WHERE record_type_id = $1
      `, [firstRT.id]);
      console.log(`\nFields for ${firstRT.slug} (id=${firstRT.id}):`);
      fields.rows.forEach(f => console.log(`  - ${f.slug}: ${f.name} (${f.field_type})`));
      console.log(`\nTotal fields: ${fields.rows.length}`);
    }

    // Check test-form specifically
    const testForm = await pool.query(`SELECT id, name, slug FROM record_types WHERE slug = 'test-form'`);
    if (testForm.rows.length > 0) {
      const rt = testForm.rows[0];
      const fields = await pool.query(`
        SELECT slug, name, field_type 
        FROM field_definitions 
        WHERE record_type_id = $1
        ORDER BY slug
      `, [rt.id]);
      console.log(`\n\n=== Fields for test-form (id=${rt.id}) ===`);
      fields.rows.forEach(f => console.log(`  - ${f.slug}`));
      console.log(`Total: ${fields.rows.length} fields`);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

main();
