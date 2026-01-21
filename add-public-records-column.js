require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function addPublicRecordsColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Add public_validated_records column
    console.log('Adding public_validated_records column...');
    await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS public_validated_records BOOLEAN DEFAULT false
    `);
    console.log('✅ Column added\n');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
        AND column_name = 'public_validated_records'
    `);
    
    console.log('Verification:');
    console.log(result.rows[0]);
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addPublicRecordsColumn();
