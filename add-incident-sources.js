require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function addSourcesQuotes() {
  const client = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL });
  await client.connect();

  const incidents = [
    {
      incident_id: '2024-08-15-hernandez',
      sources: [
        { url: 'https://www.latimes.com/california/story/2024-08-16/adelanto-ice-detention-death', title: 'Los Angeles Times' },
        { url: 'https://www.ice.gov/detainee-deaths', title: 'ICE Death Reports' }
      ],
      quotes: [
        { text: 'He complained of chest pains for three days before anyone took him seriously.', category: 'family' },
        { text: 'ICE is committed to the health, safety and welfare of all those in our custody.', category: 'agency' }
      ]
    },
    {
      incident_id: '2024-09-22-okonkwo',
      sources: [
        { url: 'https://www.ajc.com/news/stewart-detention-center-death-investigation/', title: 'Atlanta Journal-Constitution' },
        { url: 'https://www.splcenter.org/news/2024/09/23/stewart-detention-death', title: 'Southern Poverty Law Center' }
      ],
      quotes: [
        { text: 'He was put in isolation because of his mental illness, not treated for it.', category: 'lawyer' },
        { text: 'He fled Nigeria to escape death, only to find it here.', category: 'family' }
      ]
    },
    {
      incident_id: '2024-11-08-garcia-morales',
      sources: [
        { url: 'https://www.texastribune.org/2024/11/09/dilley-family-detention-death/', title: 'Texas Tribune' },
        { url: 'https://www.ice.gov/detainee-deaths', title: 'ICE Death Reports' }
      ],
      quotes: [
        { text: 'She begged for help for days. They gave her Tylenol.', category: 'witness' },
        { text: 'Her daughter watched her mother die. No child should experience that.', category: 'lawyer' }
      ]
    },
    {
      incident_id: '2024-12-01-nguyen',
      sources: [
        { url: 'https://www.seattletimes.com/seattle-news/tacoma-ice-detention-stroke/', title: 'Seattle Times' },
        { url: 'https://www.aclu-wa.org/news/nguyen-detention-lawsuit', title: 'ACLU Washington' }
      ],
      quotes: [
        { text: 'He was slurring his words and could not move his left side. They told him to go back to bed.', category: 'witness' },
        { text: 'This man has been American his entire life. Now he cannot speak or walk.', category: 'family' }
      ]
    },
    {
      incident_id: '2025-01-15-martinez-family',
      sources: [
        { url: 'https://www.nj.com/news/2025/01/newark-ice-raid-family-separated.html', title: 'NJ.com' },
        { url: 'https://www.nytimes.com/2025/01/16/nyregion/newark-ice-raid-children/', title: 'New York Times' }
      ],
      quotes: [
        { text: 'My little brother kept asking when mommy and daddy are coming home. I did not know what to tell him.', category: 'victim' },
        { text: 'These children are American citizens. They have rights.', category: 'lawyer' }
      ]
    }
  ];

  for (const inc of incidents) {
    const res = await client.query('SELECT id FROM incidents WHERE incident_id = $1', [inc.incident_id]);
    if (res.rows.length === 0) {
      console.log('Incident not found:', inc.incident_id);
      continue;
    }
    const id = res.rows[0].id;
    
    for (const s of inc.sources) {
      try {
        await client.query('INSERT INTO incident_sources (incident_id, url, title) VALUES ($1, $2, $3)', [id, s.url, s.title]);
        console.log('  Added source:', s.title);
      } catch (e) {
        if (e.code === '23505') {
          console.log('  Source exists:', s.title);
        } else {
          console.error('  Source error:', e.message);
        }
      }
    }
    
    for (const q of inc.quotes) {
      try {
        await client.query('INSERT INTO incident_quotes (incident_id, quote_text, category) VALUES ($1, $2, $3)', [id, q.text, q.category]);
        console.log('  Added quote:', q.text.substring(0, 40) + '...');
      } catch (e) {
        if (e.code === '23505') {
          console.log('  Quote exists');
        } else {
          console.error('  Quote error:', e.message);
        }
      }
    }
    console.log('Processed:', inc.incident_id);
  }
  
  await client.end();
  console.log('\nDone!');
}

addSourcesQuotes().catch(console.error);
