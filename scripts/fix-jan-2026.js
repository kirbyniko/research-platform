// Fix the first incident (Geraldo) and verify both new entries have sources
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function fixAndVerify() {
  const client = await pool.connect();
  
  try {
    // Check sources for Geraldo (ID 51)
    const geraldoSources = await client.query(`
      SELECT * FROM incident_sources WHERE incident_id = 51
    `);
    
    console.log(`Geraldo Lunas Campos (ID 51) has ${geraldoSources.rows.length} sources`);
    
    if (geraldoSources.rows.length === 0) {
      // Add source
      await client.query(`
        INSERT INTO incident_sources (
          incident_id, source_type, url, title, publication, published_date
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        51,
        'official',
        'https://www.ice.gov/news/releases/ice-reports-aggravated-felon-and-convicted-child-sex-offenders-death-camp-east',
        "ICE reports aggravated felon and convicted child sex offender's death at Camp East Montana in Texas",
        'U.S. Immigration and Customs Enforcement',
        '2026-01-09'
      ]);
      console.log('  ✅ Added source');
      
      // Add quote
      await client.query(`
        INSERT INTO incident_quotes (
          incident_id, quote_text, category, verified, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        51,
        'Geraldo Lunas Campos, a 55-year-old aggravated felon from Cuba, died in ICE custody Jan. 3 at Camp East Montana. He was pronounced deceased at 10:16 p.m. after experiencing medical distress. His cause of death is under investigation.',
        'official_statement',
        true
      ]);
      console.log('  ✅ Added ICE statement quote');
    }
    
    // Check sources for Luis (ID 52)
    const luisSources = await client.query(`
      SELECT * FROM incident_sources WHERE incident_id = 52
    `);
    
    console.log(`\nLuis Gustavo Nunez Caceres (ID 52) has ${luisSources.rows.length} sources`);
    
    if (luisSources.rows.length === 0) {
      await client.query(`
        INSERT INTO incident_sources (
          incident_id, source_type, url, title, publication, published_date
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        52,
        'official',
        'https://www.ice.gov/news/releases/illegal-alien-ice-custody-passes-away-houston-area-hospital-after-being-admitted',
        'Illegal alien in ICE custody passes away at Houston-area hospital after being admitted for chronic heart-related health issues',
        'U.S. Immigration and Customs Enforcement',
        '2026-01-07'
      ]);
      console.log('  ✅ Added source');
      
      await client.query(`
        INSERT INTO incident_quotes (
          incident_id, quote_text, category, verified, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        52,
        'Luis Gustavo Nunez Caceres, a 42-year-old illegal alien from Honduras in ICE custody, passed away Jan. 5 at HCA Houston Healthcare in Conroe after being admitted for chronic heart-related health issues.',
        'official_statement',
        true
      ]);
      console.log('  ✅ Added ICE statement quote');
    }
    
    // Summary
    console.log('\n--- January 2026 Incidents ---');
    const jan2026 = await client.query(`
      SELECT i.id, i.subject_name, i.incident_date, i.facility, i.state,
             (SELECT COUNT(*) FROM incident_sources s WHERE s.incident_id = i.id) as sources,
             (SELECT COUNT(*) FROM incident_quotes q WHERE q.incident_id = i.id) as quotes
      FROM incidents i
      WHERE i.incident_date >= '2026-01-01'
      ORDER BY i.incident_date
    `);
    
    jan2026.rows.forEach(r => {
      console.log(`${r.subject_name} (${r.incident_date ? new Date(r.incident_date).toISOString().split('T')[0] : 'n/a'}) @ ${r.facility}, ${r.state} - ${r.sources} sources, ${r.quotes} quotes`);
    });
    
    const total = await client.query('SELECT COUNT(*) as count FROM incidents');
    console.log(`\n📊 Total incidents: ${total.rows[0].count}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

fixAndVerify().catch(console.error);
