require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkDetails() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  // Get incident ID
  const incidentResult = await client.query(
    "SELECT id FROM incidents WHERE victim_name ILIKE '%mckraken%'"
  );
  
  if (incidentResult.rows.length === 0) {
    console.log('No incident found');
    await client.end();
    return;
  }
  
  const incidentId = incidentResult.rows[0].id;
  console.log('Incident ID:', incidentId);
  
  // Get details
  const detailsResult = await client.query(
    "SELECT detail_type, details FROM incident_details WHERE incident_id = $1",
    [incidentId]
  );
  
  console.log('\nIncident Details:');
  detailsResult.rows.forEach(row => {
    console.log(`\nDetail Type: ${row.detail_type}`);
    console.log('Details:', JSON.stringify(row.details, null, 2));
  });
  
  await client.end();
}

checkDetails().catch(console.error);
