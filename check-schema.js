require('dotenv').config({path:'.env.production'});
const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
p.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'field_definitions' ORDER BY ordinal_position")
.then(r=>{r.rows.forEach(row=>console.log(row.column_name));p.end();});
