
const fetch = require('node-fetch');
const fs = require('fs');

const envContent = fs.readFileSync('.env.production.local', 'utf8');
const keyMatch = envContent.match(/NEXT_PUBLIC_ADMIN_API_KEY=["']?([^"'\n]+)["']?/);
const apiKey = keyMatch ? keyMatch[1] : '';

async function main() {
  try {
    const response = await fetch('https://ice-deaths.vercel.app/api/incidents/77/details', {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      console.log('Error:', response.status, response.statusText);
      const text = await response.text();
      console.log('Body:', text);
      return;
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
main();
