require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function fixDeprecatedForceTypes() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  // Get all incident_details with force_types field
  const result = await client.query(`
    SELECT id, incident_id, detail_type, details 
    FROM incident_details 
    WHERE details ? 'force_types'
  `);

  console.log(`Found ${result.rows.length} records with force_types field\n`);

  let fixed = 0;
  for (const row of result.rows) {
    const details = row.details;
    const newDetails = { ...details };
    
    // If there's a force_types field
    if (details.force_types) {
      let forceTypeArray;
      
      // Handle both object and array formats
      if (Array.isArray(details.force_types)) {
        forceTypeArray = details.force_types;
      } else if (typeof details.force_types === 'object') {
        forceTypeArray = Object.keys(details.force_types).filter(key => details.force_types[key] === true);
      }
      
      // Remove force_types and set force_type
      delete newDetails.force_types;
      
      // Only set if we don't already have force_type, or merge if we do
      if (newDetails.force_type && Array.isArray(newDetails.force_type)) {
        // Merge and deduplicate
        newDetails.force_type = [...new Set([...newDetails.force_type, ...forceTypeArray])];
      } else {
        newDetails.force_type = forceTypeArray;
      }
      
      await client.query(
        'UPDATE incident_details SET details = $1::jsonb WHERE id = $2',
        [JSON.stringify(newDetails), row.id]
      );
      
      console.log(`Fixed incident_detail ${row.id} (incident ${row.incident_id}): force_type = [${newDetails.force_type.join(', ')}]`);
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} records`);
  await client.end();
}

fixDeprecatedForceTypes().catch(console.error);
