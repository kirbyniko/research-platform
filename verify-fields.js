require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyFields() {
  try {
    const result = await pool.query(`
      SELECT rt.name as record_type, COUNT(fd.id) as field_count
      FROM record_types rt
      LEFT JOIN field_definitions fd ON rt.id = fd.record_type_id
      WHERE rt.id IN (9, 10, 11)
      GROUP BY rt.name, rt.id
      ORDER BY rt.name
    `);
    
    console.log('\n📊 Field counts by record type:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.record_type}: ${row.field_count} fields`);
    });
    
    const total = result.rows.reduce((sum, row) => sum + parseInt(row.field_count), 0);
    console.log(`\n📝 Total: ${total} field definitions\n`);
    
    // Check a sample of fields
    const sampleFields = await pool.query(`
      SELECT rt.name as record_type, fd.slug, fd.name, fd.field_type
      FROM field_definitions fd
      JOIN record_types rt ON fd.record_type_id = rt.id
      WHERE rt.id IN (9, 10, 11)
      ORDER BY rt.name, fd.sort_order
      LIMIT 10
    `);
    
    console.log('📌 Sample fields:');
    sampleFields.rows.forEach(row => {
      console.log(`  ${row.record_type}: ${row.slug} (${row.field_type})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyFields();
