require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT fd.slug, fd.name, fd.field_type, fd.sort_order, fg.name as group_name, fd.config
      FROM field_definitions fd
      LEFT JOIN field_groups fg ON fd.field_group_id = fg.id
      WHERE fd.record_type_id = 6
      ORDER BY fd.sort_order
    `);
    
    result.rows.forEach(row => {
      const showWhen = row.config?.show_when ? JSON.stringify(row.config.show_when) : '';
      console.log(`${row.sort_order}. ${row.slug} (${row.field_type}) - ${row.group_name || 'ungrouped'}${showWhen ? ' [show_when: ' + showWhen + ']' : ''}`);
    });
    
    console.log('\nTotal fields:', result.rows.length);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
