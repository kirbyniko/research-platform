const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ice_deaths',
});

async function checkDataQuality() {
  const result = await pool.query(`
    SELECT 
      id, 
      name, 
      age, 
      official_cause_of_death,
      (SELECT COUNT(*) FROM timeline_events WHERE case_id = cases.id) as timeline_count,
      (SELECT COUNT(*) FROM categories WHERE case_id = cases.id) as category_count
    FROM cases 
    ORDER BY date_of_death DESC
  `);

  console.log('\nCurrent Data Status:\n');
  console.log('Name'.padEnd(35), '| Age | Cause'.padEnd(45), '| Timeline | Categories');
  console.log('-'.repeat(120));
  
  result.rows.forEach(c => {
    const cause = c.official_cause_of_death.substring(0, 40);
    console.log(
      c.name.padEnd(35),
      '|',
      String(c.age).padEnd(3),
      '|',
      cause.padEnd(40),
      '|',
      String(c.timeline_count).padEnd(8),
      '|',
      c.category_count
    );
  });

  await pool.end();
}

checkDataQuality();
