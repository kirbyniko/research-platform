require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const r = await p.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'projects' 
    ORDER BY ordinal_position
  `);
  console.log('=== PROJECTS TABLE COLUMNS ===\n');
  r.rows.forEach(row => {
    console.log(`${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${row.column_default ? 'DEFAULT: ' + row.column_default : ''}`);
  });
  
  // Also check field_definitions columns
  console.log('\n=== FIELD_DEFINITIONS TABLE COLUMNS ===\n');
  const fd = await p.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'field_definitions' 
    ORDER BY ordinal_position
  `);
  fd.rows.forEach(row => {
    console.log(`${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${row.column_default ? 'DEFAULT: ' + row.column_default : ''}`);
  });

  await p.end();
}
check().catch(console.error);
