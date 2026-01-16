const { Pool } = require('pg');
const pool = new Pool({connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'});
pool.query('SELECT DISTINCT incident_type FROM incidents').then(r => { 
  console.log('Existing incident types:'); 
  r.rows.forEach(row => console.log('- ' + row.incident_type)); 
  pool.end(); 
});
