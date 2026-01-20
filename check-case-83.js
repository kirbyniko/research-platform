const fetch = require('node-fetch');

async function checkCase83() {
  try {
    const response = await fetch('https://ice-deaths.vercel.app/api/incidents/83');
    const data = await response.json();
    
    console.log('\n=== INCIDENT DETAILS ===');
    console.log('Total details:', data.incident_details?.length || 0);
    
    if (data.incident_details) {
      const detailTypes = {};
      for (const detail of data.incident_details) {
        if (!detailTypes[detail.detail_type]) {
          detailTypes[detail.detail_type] = [];
        }
        detailTypes[detail.detail_type].push(detail);
      }
      
      console.log('\n=== Detail Types ===');
      for (const [type, details] of Object.entries(detailTypes)) {
        console.log(`\n${type} (${details.length} records):`);
        details.forEach((d, i) => {
          console.log(`  Record ${i + 1} (ID ${d.id}):`, Object.keys(d.details || {}));
        });
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkCase83();
