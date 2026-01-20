require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function fixAllArrayFields() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  // Define which fields should be arrays (not objects)
  const arrayFields = [
    'force_type',
    'force_types',
    'injuries_caused',
    'injuries_sustained',
    'violations'
  ];

  // Get all incident_details
  const result = await client.query(`
    SELECT id, incident_id, detail_type, details 
    FROM incident_details
  `);

  console.log(`Checking ${result.rows.length} incident_details records...\n`);

  let fixed = 0;
  for (const row of result.rows) {
    const details = row.details;
    let needsUpdate = false;
    const newDetails = { ...details };

    for (const field of arrayFields) {
      if (details[field] && typeof details[field] === 'object' && !Array.isArray(details[field])) {
        // Convert object to array
        const arrayValue = Object.keys(details[field]).filter(key => details[field][key] === true);
        
        // If field is 'force_types', convert to 'force_type' (singular)
        if (field === 'force_types') {
          delete newDetails.force_types;
          newDetails.force_type = arrayValue;
        } else {
          newDetails[field] = arrayValue;
        }
        
        console.log(`  ${row.incident_id || row.id} (${row.detail_type}): Fixed ${field} = [${arrayValue.join(', ')}]`);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await client.query(
        'UPDATE incident_details SET details = $1::jsonb WHERE id = $2',
        [JSON.stringify(newDetails), row.id]
      );
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} records`);
  await client.end();
}

fixAllArrayFields().catch(console.error);
