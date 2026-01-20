require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function fixForceTypes() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  // Get all force details with force_types as object
  const result = await client.query(`
    SELECT id, incident_id, details 
    FROM incident_details 
    WHERE detail_type = 'force' 
    AND details ? 'force_types'
  `);

  console.log(`Found ${result.rows.length} force details with force_types`);

  let fixed = 0;
  for (const row of result.rows) {
    const details = row.details;
    
    // Check if force_types is an object (needs fixing)
    if (details.force_types && typeof details.force_types === 'object' && !Array.isArray(details.force_types)) {
      // Convert object to array
      const forceTypesArray = Object.keys(details.force_types).filter(key => details.force_types[key] === true);
      
      // Update details to use force_type (singular) as array
      const newDetails = { ...details };
      delete newDetails.force_types;
      newDetails.force_type = forceTypesArray;
      
      // Update in database
      await client.query(
        'UPDATE incident_details SET details = $1::jsonb WHERE id = $2',
        [JSON.stringify(newDetails), row.id]
      );
      
      console.log(`Fixed incident ${row.incident_id}: ${forceTypesArray.join(', ')}`);
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} incidents`);
  await client.end();
}

fixForceTypes().catch(console.error);
