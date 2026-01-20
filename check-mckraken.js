require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkCase() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  const result = await client.query(
    "SELECT * FROM incidents WHERE victim_name ILIKE '%mckraken%'"
  );
  
  console.log('Phil McKraken case:');
  console.log(JSON.stringify(result.rows[0], null, 2));
  
  await client.end();
}

checkCase().catch(console.error);
