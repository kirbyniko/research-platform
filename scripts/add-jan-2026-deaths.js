// Add January 2026 ICE Deaths from official announcements
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

// New deaths from ICE.gov press releases (January 2026)
const newDeaths = [
  {
    name: 'Geraldo Lunas Campos',
    age: 55,
    nationality: 'Cuban',
    deathDate: '2026-01-03',
    facility: 'Camp East Montana',
    city: null, // Camp East Montana location
    state: 'TX',
    causeOfDeath: 'Under investigation - medical distress',
    summary: 'A 55-year-old Cuban national died in ICE custody on January 3, 2026 at Camp East Montana. He was pronounced deceased at 10:16 p.m. after experiencing medical distress. His cause of death is under investigation.',
    iceStatement: 'Geraldo Lunas Campos, a 55-year-old aggravated felon from Cuba, died in ICE custody Jan. 3 at Camp East Montana. He was pronounced deceased at 10:16 p.m. after experiencing medical distress. His cause of death is under investigation.',
    sourceUrl: 'https://www.ice.gov/news/releases/ice-reports-aggravated-felon-and-convicted-child-sex-offenders-death-camp-east',
    sourceTitle: 'ICE reports aggravated felon and convicted child sex offender\'s death at Camp East Montana in Texas',
    announcementDate: '2026-01-09'
  },
  {
    name: 'Luis Gustavo Nunez Caceres',
    age: 42,
    nationality: 'Honduran',
    deathDate: '2026-01-05',
    facility: 'HCA Houston Healthcare',
    city: 'Conroe',
    state: 'TX',
    causeOfDeath: 'Chronic heart-related health issues',
    summary: 'A 42-year-old Honduran national in ICE custody passed away on January 5, 2026 at HCA Houston Healthcare in Conroe after being admitted for chronic heart-related health issues.',
    iceStatement: 'Luis Gustavo Nunez Caceres, a 42-year-old illegal alien from Honduras in ICE custody, passed away Jan. 5 at HCA Houston Healthcare in Conroe after being admitted for chronic heart-related health issues.',
    sourceUrl: 'https://www.ice.gov/news/releases/illegal-alien-ice-custody-passes-away-houston-area-hospital-after-being-admitted',
    sourceTitle: 'Illegal alien in ICE custody passes away at Houston-area hospital after being admitted for chronic heart-related health issues',
    announcementDate: '2026-01-07'
  }
];

async function addNewDeaths() {
  const client = await pool.connect();
  
  try {
    console.log('Adding January 2026 ICE deaths to database...\n');
    
    for (const death of newDeaths) {
      // Check if already exists
      const existing = await client.query(
        `SELECT id FROM incidents WHERE subject_name ILIKE $1 OR subject_name ILIKE $2`,
        [death.name, `%${death.name.split(' ').pop()}%`]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⚠️  ${death.name} may already exist (ID: ${existing.rows[0].id}), skipping...`);
        continue;
      }
      
      // Generate incident_id
      const incidentIdStr = `${death.deathDate}-${death.name.toLowerCase().replace(/[^a-z]/g, '-')}`;
      
      // Insert incident
      const result = await client.query(`
        INSERT INTO incidents (
          incident_id, subject_name, subject_age, subject_nationality, incident_date, incident_type,
          facility, city, state, summary, country,
          verification_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id
      `, [
        incidentIdStr,
        death.name,
        death.age,
        death.nationality,
        death.deathDate,
        'detention_death',
        death.facility,
        death.city,
        death.state,
        death.summary,
        'USA',
        'pending'
      ]);
      
      const incidentId = result.rows[0].id;
      console.log(`✅ Added: ${death.name} (ID: ${incidentId})`);
      
      // Add ICE source
      await client.query(`
        INSERT INTO incident_sources (
          incident_id, source_type, url, title, publication,
          published_date
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        incidentId,
        'official',
        death.sourceUrl,
        death.sourceTitle,
        'U.S. Immigration and Customs Enforcement',
        death.announcementDate
      ]);
      
      console.log(`   📎 Added ICE press release source`);
      
      // Add ICE statement as quote
      await client.query(`
        INSERT INTO incident_quotes (
          incident_id, quote_text, category, verified, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        incidentId,
        death.iceStatement,
        'official_statement',
        true
      ]);
      
      console.log(`   💬 Added ICE statement quote\n`);
    }
    
    // Final count
    const count = await client.query('SELECT COUNT(*) as total FROM incidents');
    console.log(`\n📊 Total incidents in database: ${count.rows[0].total}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

addNewDeaths().catch(console.error);
