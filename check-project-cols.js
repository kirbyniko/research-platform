require('dotenv').config({path:'.env.local'});
const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='records'`)
  .then(r=>{console.log(r.rows.map(x=>x.column_name).join(', ')); p.end()});
