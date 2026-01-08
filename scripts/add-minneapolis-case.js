const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ice_deaths',
});

async function addMinneapolisCase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const caseId = '2026-01-07-minneapolis-shooting';
    
    // Insert case
    await client.query(
      `INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        caseId,
        'Unnamed Woman (37 years old)',
        37,
        'United States',
        '2026-01-07',
        'Bystander - Not in custody',
        'Gunshot wounds to the head from ICE officer',
        'US citizen killed by ICE officer. Name not yet publicly released. FBI and Minnesota Bureau of Criminal Apprehension jointly investigating. Woman was NOT a target of enforcement - described as legal observer/community member. Case represents concerning expansion of ICE enforcement resulting in bystander death.'
      ]
    );
    
    // Insert facility
    await client.query(
      `INSERT INTO facilities (case_id, name, state, type) VALUES ($1, $2, $3, $4)`,
      [caseId, 'Street Incident - East 34th Street and Portland Avenue', 'MN', 'Other']
    );
    
    // Insert timeline
    const timeline = [
      { date: '2026-01-07', event: '~9:30 AM - Whistles sounded to alert neighborhood of ICE presence' },
      { date: '2026-01-07', event: 'Woman in Honda Pilot blocked by federal agents' },
      { date: '2026-01-07', event: 'ICE agent attempted to open driver door' },
      { date: '2026-01-07', event: 'Woman put vehicle in reverse, then drive' },
      { date: '2026-01-07', event: 'ICE agent fired at least 2-3 shots, striking woman in head' },
      { date: '2026-01-07', event: 'Vehicle traveled several feet before crashing' },
      { date: '2026-01-07', event: 'Woman transported to Hennepin Healthcare' },
      { date: '2026-01-07', event: 'Pronounced dead at hospital' }
    ];
    
    for (let i = 0; i < timeline.length; i++) {
      await client.query(
        `INSERT INTO timeline_events (case_id, date, event, sort_order) VALUES ($1, $2, $3, $4)`,
        [caseId, timeline[i].date, timeline[i].event, i]
      );
    }
    
    // Insert discrepancy
    await client.query(
      `INSERT INTO discrepancies (case_id, ice_claim, counter_evidence) VALUES ($1, $2, $3)`,
      [
        caseId,
        'Woman "weaponized her vehicle, attempting to run over officers" - called it "an act of domestic terrorism"',
        'Multiple videos from witnesses contradict this. Mayor Jacob Frey watched videos and called ICE narrative "bulls**t". Governor Tim Walz stated "Don\'t believe this propaganda machine." City officials confirm she was a legal observer/community member, not a target of ICE enforcement. Senator Tina Smith confirmed woman was a US citizen.'
      ]
    );
    
    // Insert sources
    const sources = [
      { title: 'ICE Shoots Woman in Minneapolis', publisher: 'CBS News Minnesota', date: '2026-01-07', url: 'https://www.cbsnews.com/minnesota/' },
      { title: 'Minneapolis Officials Contradict ICE Account', publisher: 'The Guardian', date: '2026-01-07', url: 'https://www.theguardian.com' }
    ];
    
    for (const source of sources) {
      await client.query(
        `INSERT INTO sources (case_id, title, publisher, date, url) VALUES ($1, $2, $3, $4, $5)`,
        [caseId, source.title, source.publisher, source.date, source.url]
      );
    }
    
    // Insert categories
    const categories = ['Officer-involved shooting', 'Bystander death'];
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (case_id, category) VALUES ($1, $2)`,
        [caseId, cat]
      );
    }
    
    await client.query('COMMIT');
    console.log('✓ Added Minneapolis shooting case (2026-01-07)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMinneapolisCase();
