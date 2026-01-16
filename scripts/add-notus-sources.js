// Add additional sources to cases
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

// NOTUS article covers these cases - add as second source where only Guardian exists
const notusArticle = {
  url: 'https://www.notus.org/immigration/ice-detention-deaths-december-2025',
  title: 'Seven Immigrants Die in ICE Custody in December, Marking Deadliest Month This Year',
  publication: 'NOTUS',
  author: 'Jackie Llanos',
  published_date: '2025-12-23'
};

// Cases mentioned specifically in NOTUS article that we should add as secondary source:
const casesMentionedInNotus = [
  'Fouad Saeed Abdulkadir',  // From Eritrea, 46
  'Nenko Stanev Gantchev',   // From Bulgaria, 56
  'Dalvin Francisco Rodriguez', // From Nicaragua, 39
  'Shiraz Fatehali Sachwani',   // From Pakistan, 48
  'Francisco Gaspar-Andres',    // mentioned re: wife testimony
  'Jean Wilson Brutus',         // From Haiti, 41
  'Norlan Guzman-Fuentes',      // Shot at Dallas
  'Miguel Angel Garcia-Hernandez' // Shot at Dallas
];

// El Paso Times article about Francisco Gaspar-Andres
const elPasoTimesArticle = {
  url: 'https://www.elpasotimes.com/story/news/immigration/2025/12/19/immigration-news-widow-says-ice-failed-husband-in-custody/87786319007/',
  title: 'Widow says ICE failed husband in custody',
  publication: 'El Paso Times',
  published_date: '2025-12-19'
};

async function addSources() {
  const client = await pool.connect();
  
  try {
    console.log('Adding additional sources to thin cases...\n');
    
    for (const caseName of casesMentionedInNotus) {
      // Find the incident
      const incident = await client.query(`
        SELECT id, subject_name FROM incidents 
        WHERE subject_name ILIKE $1
      `, [`%${caseName}%`]);
      
      if (incident.rows.length === 0) {
        console.log(`⚠️ Could not find: ${caseName}`);
        continue;
      }
      
      const incidentId = incident.rows[0].id;
      const fullName = incident.rows[0].subject_name;
      
      // Check if NOTUS source already exists
      const existing = await client.query(`
        SELECT id FROM incident_sources 
        WHERE incident_id = $1 AND url ILIKE '%notus.org%'
      `, [incidentId]);
      
      if (existing.rows.length > 0) {
        console.log(`✓ ${fullName} already has NOTUS source`);
        continue;
      }
      
      // Add NOTUS source
      await client.query(`
        INSERT INTO incident_sources (incident_id, url, title, publication, author, published_date, source_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        incidentId,
        notusArticle.url,
        notusArticle.title,
        notusArticle.publication,
        notusArticle.author,
        notusArticle.published_date,
        'news'
      ]);
      
      console.log(`✅ Added NOTUS source to ${fullName}`);
    }
    
    // Add El Paso Times article to Francisco Gaspar-Andres
    const francisco = await client.query(`
      SELECT id FROM incidents WHERE subject_name ILIKE '%Gaspar%Andres%'
    `);
    
    if (francisco.rows.length > 0) {
      const existingEpt = await client.query(`
        SELECT id FROM incident_sources 
        WHERE incident_id = $1 AND url ILIKE '%elpasotimes%'
      `, [francisco.rows[0].id]);
      
      if (existingEpt.rows.length === 0) {
        await client.query(`
          INSERT INTO incident_sources (incident_id, url, title, publication, published_date, source_type)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          francisco.rows[0].id,
          elPasoTimesArticle.url,
          elPasoTimesArticle.title,
          elPasoTimesArticle.publication,
          elPasoTimesArticle.published_date,
          'news'
        ]);
        console.log(`✅ Added El Paso Times source to Francisco Gaspar-Andres`);
      }
    }
    
    // Final stats
    console.log('\n--- Updated Source Coverage ---');
    const coverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = incidents.id) = 1) as single_source,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = incidents.id) >= 2) as multi_source
      FROM incidents
    `);
    
    const c = coverage.rows[0];
    console.log(`Total: ${c.total}`);
    console.log(`1 source: ${c.single_source} (${Math.round(c.single_source / c.total * 100)}%)`);
    console.log(`2+ sources: ${c.multi_source} (${Math.round(c.multi_source / c.total * 100)}%)`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

addSources().catch(console.error);
