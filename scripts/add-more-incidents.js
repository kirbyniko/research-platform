// Add more verified ICE incidents - Part 2
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

// More verified incidents with real quotes from sources
const newIncidents = [
  // 1. Job Garcia - US citizen tackled and detained at Home Depot
  {
    incident_id: '2025-06-19-assault-garcia-home-depot',
    incident_type: 'assault',
    subject_name: 'Job Garcia',
    subject_age: 37,
    incident_date: '2025-06-19',
    city: 'Hollywood',
    state: 'CA',
    country: 'USA',
    facility: null,
    summary: 'Job Garcia, a 37-year-old U.S. citizen, photographer, and doctoral student at Claremont Graduate University, was tackled to the ground, handcuffed, and detained for over 24 hours after filming federal agents conducting a raid at Home Depot in Hollywood, California. He was held near Dodger Stadium where he said agents boasted about arresting immigrants. He is seeking $1 million in damages.',
    sources: [
      {
        url: 'https://www.latimes.com/california/story/2025-06-20/border-patrol-agents-brag-in-front-of-detained',
        title: "'A good day': Detained U.S. citizen said agents bragged after arresting dozens at Home Depot",
        publication: 'Los Angeles Times',
        author: 'Brittny Mejia, Rachel Uranga',
        published_date: '2025-06-20',
        source_type: 'news'
      },
      {
        url: 'https://www.nytimes.com/2025/07/02/us/politics/immigration-lawsuit-los-angeles.html',
        title: 'Legal Actions in L.A. Highlight Harsh Tactics of Immigration Crackdown',
        publication: 'The New York Times',
        author: 'Miriam Jordan, Jazmine Ulloa',
        published_date: '2025-07-02',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'How many bodies did you guys grab today? Oh, we grabbed 31. That was a good day today.',
        category: 'witness_statement',
        source_name: 'Job Garcia, recounting what agents said (Los Angeles Times)'
      },
      {
        quote_text: 'They call them "bodies," they reduce them to bodies. My blood was boiling.',
        category: 'victim_statement',
        source_name: 'Job Garcia (Los Angeles Times)'
      },
      {
        quote_text: 'That moment, I thought I could probably die here.',
        category: 'victim_statement',
        source_name: 'Job Garcia, on being pinned down with difficulty breathing'
      },
      {
        quote_text: 'They assumed that I was undocumented. No agent asked if he was an American citizen. Nobody asked for identification.',
        category: 'victim_statement',
        source_name: 'Job Garcia (Los Angeles Times)'
      }
    ]
  },

  // 2. Adrian Martinez - US citizen arrested at Walmart
  {
    incident_id: '2025-06-17-arrest-martinez-walmart',
    incident_type: 'wrongful_arrest',
    subject_name: 'Adrian Martinez',
    subject_age: 20,
    incident_date: '2025-06-17',
    city: 'Pico Rivera',
    state: 'CA',
    country: 'USA',
    facility: null,
    summary: 'Adrian Martinez, a 20-year-old U.S. citizen and Walmart worker, was arrested while trying to stop the arrest of a man who cleaned a shopping center in Pico Rivera, California. He was charged with conspiracy to impede a federal officer. The U.S. Attorney posted on X that he "punched a border patrol agent" but the criminal complaint makes no reference to a punch. Martinez was released on $5,000 bond.',
    sources: [
      {
        url: 'https://www.latimes.com/california/story/2025-06-18/a-us-citizen-confronting-agents-during-a-sweep-is-arrested-as-tension-continue-to-simmer-on-la-strets',
        title: 'A US citizen confronting agents during a sweep is arrested as tension continue to simmer on LA streets',
        publication: 'Los Angeles Times',
        published_date: '2025-06-18',
        source_type: 'news'
      },
      {
        url: 'https://www.latimes.com/california/story/2025-06-20/border-patrol-agents-brag-in-front-of-detained',
        title: "'A good day': Detained U.S. citizen said agents bragged after arresting dozens at Home Depot",
        publication: 'Los Angeles Times',
        author: 'Brittny Mejia, Rachel Uranga',
        published_date: '2025-06-20',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'U.S. Attorney Essayli and U.S. Border Patrol Sector Chief Gregory Bovino outrageously alleged that Adrian assaulted a federal agent. However he has not been charged with an assault charge because he didn\'t assault anyone, and the evidence of that is clear.',
        category: 'attorney_statement',
        source_name: "Adrian Martinez's attorneys"
      },
      {
        quote_text: 'They were bullying this older guy. I didn\'t like that so I went and confronted them and they put their hands on me and I pushed their hands off.',
        category: 'victim_statement',
        source_name: 'Adrian Martinez (via Job Garcia, Los Angeles Times)'
      }
    ]
  },

  // 3. Portland shooting - Two wounded by Border Patrol
  {
    incident_id: '2026-01-09-shooting-portland',
    incident_type: 'shooting',
    subject_name: 'Luis David Nino-Moncada and Yorlenys Betzabeth Zambrano-Contreras',
    incident_date: '2026-01-09',
    city: 'Portland (Hazelwood)',
    state: 'OR',
    country: 'USA',
    facility: null,
    summary: 'Two Venezuelan nationals, Luis David Nino-Moncada and Yorlenys Betzabeth Zambrano-Contreras, were shot by U.S. Border Patrol agents during a "targeted vehicle stop" in the Hazelwood neighborhood of Portland, Oregon. An agent fired into the vehicle after claiming the driver tried to run them over. The victims were found with gunshot wounds more than two miles away after the driver drove off. Federal officials were no longer on the scene when local police arrived. Oregon Governor Tina Kotek called for a transparent investigation.',
    sources: [
      {
        url: 'https://www.nytimes.com/2026/01/09/us/portland-oregon-shooting-border-patrol.html',
        title: 'What We Know About the Shooting in Portland, Ore.',
        publication: 'The New York Times',
        author: 'Francesca Regalado, Anna Griffin, Hamed Aleaziz, Thomas Fuller',
        published_date: '2026-01-09',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'Shortly after 2 p.m. on Thursday, the Border Patrol agents were conducting what they described as a "targeted vehicle stop" in the Hazelwood neighborhood, about eight miles from the city center. An agent fired a shot into the vehicle after the driver tried to run them over.',
        category: 'official_statement',
        source_name: 'Department of Homeland Security (via New York Times)'
      },
      {
        quote_text: 'Local police said that they first responded after a man injured in the shooting called 911. The driver of the vehicle drove off after the shooting, and the victims were found with gunshot wounds by the police more than two miles away. Local police said the federal officials involved in the shooting were no longer on the scene when they arrived.',
        category: 'official_statement',
        source_name: 'Portland Police (via New York Times)'
      }
    ]
  }
];

async function addIncidents() {
  const client = await pool.connect();
  
  try {
    console.log('Adding more verified ICE incidents to database...\n');
    
    for (const incident of newIncidents) {
      // Check if already exists
      const existing = await client.query(
        'SELECT id FROM incidents WHERE incident_id = $1',
        [incident.incident_id]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⚠️ ${incident.subject_name} already exists, skipping...`);
        continue;
      }
      
      // Insert incident
      const result = await client.query(`
        INSERT INTO incidents (
          incident_id, incident_type, subject_name, subject_age, subject_nationality,
          incident_date, city, state, country, facility, summary,
          verification_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id
      `, [
        incident.incident_id,
        incident.incident_type,
        incident.subject_name,
        incident.subject_age || null,
        incident.subject_nationality || null,
        incident.incident_date,
        incident.city,
        incident.state,
        incident.country,
        incident.facility,
        incident.summary,
        'pending'
      ]);
      
      const incidentId = result.rows[0].id;
      console.log(`✅ Added: ${incident.subject_name} (ID: ${incidentId}, Type: ${incident.incident_type})`);
      
      // Add sources
      for (const source of incident.sources) {
        await client.query(`
          INSERT INTO incident_sources (
            incident_id, url, title, publication, author, published_date, source_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          incidentId,
          source.url,
          source.title,
          source.publication,
          source.author || null,
          source.published_date,
          source.source_type
        ]);
      }
      console.log(`   📎 Added ${incident.sources.length} source(s)`);
      
      // Add quotes
      for (const quote of incident.quotes) {
        await client.query(`
          INSERT INTO incident_quotes (
            incident_id, quote_text, category, verified, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          incidentId,
          quote.quote_text,
          quote.category,
          true
        ]);
      }
      console.log(`   💬 Added ${incident.quotes.length} quote(s)\n`);
    }
    
    // Summary
    console.log('=== Updated Database Summary ===');
    const summary = await client.query(`
      SELECT incident_type, COUNT(*) as count
      FROM incidents
      GROUP BY incident_type
      ORDER BY count DESC
    `);
    
    summary.rows.forEach(row => {
      console.log(`${row.incident_type}: ${row.count}`);
    });
    
    const total = await client.query('SELECT COUNT(*) as count FROM incidents');
    console.log(`\nTotal incidents: ${total.rows[0].count}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

addIncidents().catch(console.error);
