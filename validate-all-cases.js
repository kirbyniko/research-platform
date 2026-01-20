require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function validateAllCases() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  // Get all incidents
  const incidents = await client.query(`
    SELECT id, incident_id, victim_name, incident_type 
    FROM incidents 
    ORDER BY id DESC 
    LIMIT 20
  `);

  console.log(`Validating ${incidents.rows.length} incidents...\n`);

  const issues = [];

  for (const incident of incidents.rows) {
    // Get details
    const details = await client.query(
      'SELECT detail_type, details FROM incident_details WHERE incident_id = $1',
      [incident.id]
    );

    for (const detail of details.rows) {
      const d = detail.details;
      
      // Check for object-format fields that should be arrays
      const arrayFields = ['force_type', 'force_types', 'injuries_caused', 'injuries_sustained'];
      for (const field of arrayFields) {
        if (d[field] && typeof d[field] === 'object' && !Array.isArray(d[field])) {
          issues.push({
            id: incident.id,
            name: incident.victim_name || incident.incident_id,
            type: incident.incident_type,
            issue: `${field} is object instead of array`,
            detail_type: detail.detail_type
          });
        }
      }
      
      // Check for deprecated force_types field
      if (d.force_types) {
        issues.push({
          id: incident.id,
          name: incident.victim_name || incident.incident_id,
          type: incident.incident_type,
          issue: 'Has deprecated force_types field (should be force_type)',
          detail_type: detail.detail_type
        });
      }
    }
  }

  if (issues.length === 0) {
    console.log('✅ All cases look good!');
  } else {
    console.log(`❌ Found ${issues.length} issues:\n`);
    issues.forEach(issue => {
      console.log(`  ID ${issue.id} (${issue.name}):`);
      console.log(`    Type: ${issue.type}, Detail: ${issue.detail_type}`);
      console.log(`    Issue: ${issue.issue}\n`);
    });
  }

  await client.end();
}

validateAllCases().catch(console.error);
