const { Pool } = require('pg');
const pool = new Pool({connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'});
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'incident_quotes' ORDER BY ordinal_position")
.then(r => { r.rows.forEach(row => console.log(row.column_name)); pool.end(); });
