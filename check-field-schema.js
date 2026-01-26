const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkSchema() {
  try {
    // Check what tables exist for field definitions
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%field%'
      ORDER BY table_name
    `);
    
    console.log('=== TABLES WITH "FIELD" ===');
    tables.rows.forEach(r => console.log('-', r.table_name));
    
    // Check field_definitions table
    const fieldDefs = await pool.query(`
      SELECT fd.*, rt.name as record_type_name
      FROM field_definitions fd
      JOIN record_types rt ON fd.record_type_id = rt.id
      WHERE fd.record_type_id IN (9, 10, 11)
      ORDER BY rt.name, fd.name
      LIMIT 50
    `);
    
    console.log('\n=== FIELD DEFINITIONS ===');
    console.log('Total fields found:', fieldDefs.rows.length);
    if (fieldDefs.rows.length > 0) {
      fieldDefs.rows.forEach(f => {
        console.log(`\n${f.record_type_name} - ${f.name}:`);
        console.log('  Label:', f.label);
        console.log('  Type:', f.field_type);
        console.log('  Required:', f.is_required);
      });
    } else {
      console.log('NO FIELDS DEFINED - This is the problem!');
      console.log('Need to insert field definitions for record types 9, 10, 11');
    }
    
    // Check record_types table structure
    const rtColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'record_types'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== RECORD_TYPES TABLE COLUMNS ===');
    rtColumns.rows.forEach(c => {
      console.log(`- ${c.column_name} (${c.data_type})`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkSchema();
