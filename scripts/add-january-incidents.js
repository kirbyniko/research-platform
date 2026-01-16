// Add more January 2026 incidents - Renee Good, Keith Porter, Benjamin Guerrero Cruz, George Retes, Kaden Rummler, Broadview conditions
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

const incidents = [
  {
    incident_id: '2026-01-07-shooting-renee-good-minneapolis',
    subject_name: 'Renee Good',
    subject_age: 37,
    subject_nationality: 'United States',
    incident_type: 'shooting',
    incident_date: '2026-01-07',
    city: 'Minneapolis',
    state: 'MN',
    country: 'USA',
    facility: null,
    summary: 'Mother of three shot and killed by ICE agent during Minneapolis operation. Agent claimed self-defense; mayor and witnesses dispute narrative. Federal officials labeled her a "domestic terrorist." Six federal prosecutors resigned after DOJ pushed not to investigate shooting but investigate Good herself.',
    sources: [
      {
        publication: 'Los Angeles Times',
        title: 'ICE can\'t be trusted. Can California force accountability?',
        url: 'https://www.latimes.com/california/story/2026-01-14/ice-cant-be-trusted-can-california-force-accountability',
        author: 'Anita Chabria',
        published_date: '2026-01-14',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'After nearly 35 years of experience with federal law enforcement in this judicial district...I have never encountered anything like this.',
        attribution: 'Judge Gary Brown',
        context: 'Referenced in LA Times article about federal overreach'
      },
      {
        quote_text: 'Every congressional democrat and every democrat who\'s running for president should be asked a simple question: Do you think this officer was wrong in defending his life against a deranged leftist who tried to run him over?',
        attribution: 'Vice President JD Vance',
        context: 'Social media post one day after Good was killed',
        published_date: '2026-01-08'
      }
    ]
  },
  {
    incident_id: '2025-12-31-shooting-keith-porter-northridge',
    subject_name: 'Keith Porter Jr.',
    subject_age: 25,
    subject_nationality: 'United States',
    incident_type: 'shooting',
    incident_date: '2025-12-31',
    city: 'Northridge',
    state: 'CA',
    country: 'USA',
    facility: null,
    summary: 'Off-duty ICE agent shot and killed 25-year-old Porter on New Year\'s Eve. DHS claimed he was an "active shooter" but family and attorney say he was only firing into the air to celebrate new year. Agent not identified, no body camera footage. Attorney says witness heard demands to "put down the rifle" but no identification as law enforcement.',
    sources: [
      {
        publication: 'Los Angeles Times',
        title: '\'Active shooter\' or ICE agent\'s victim? What happened in L.A. New Year\'s Eve killing?',
        url: 'https://www.latimes.com/california/story/2026-01-08/ice-agent-keith-porter-killing-investigation',
        author: 'James Queally, Libor Jany, Christopher Buchanan',
        published_date: '2026-01-08',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'That is far from the truth. I can\'t even fathom that idea of him being looked at in a negative light. Calling the officer a hero, before any investigation had been conducted … this is ridiculous.',
        attribution: 'Adrian Metoyer (Porter\'s friend)',
        context: 'Responding to DHS characterization of Porter',
        published_date: '2026-01-08'
      },
      {
        quote_text: 'What should have been an arrest and possible citation has turned into a death sentence and potentially cold-blooded murder from an ICE agent who was not equipped to handle the situation.',
        attribution: 'Jamal Tooson (attorney for Porter\'s family)',
        context: 'News conference about shooting',
        published_date: '2026-01-08'
      }
    ]
  },
  {
    incident_id: '2025-08-08-detention-guerrero-cruz-reseda',
    subject_name: 'Benjamin Guerrero Cruz',
    subject_age: 18,
    subject_nationality: 'Chile',
    incident_type: 'wrongful_detention',
    incident_date: '2025-08-08',
    city: 'Los Angeles (Reseda)',
    state: 'CA',
    country: 'USA',
    facility: 'Adelanto ICE Processing Center',
    summary: 'Chilean teen detained by masked agents while walking dog, days before starting senior year. Held 3+ months at Adelanto ICE Processing Center despite community organizing. Agents did not identify themselves, left barefoot for 7 days. Released after "activist judge" ordered release per DHS.',
    sources: [
      {
        publication: 'Los Angeles Times',
        title: 'As he sat in ICE detention, a teen dreamed of finishing his senior year of high school in L.A.',
        url: 'https://www.latimes.com/california/story/2025-12-23/in-ice-detention-this-teen-dreamed-of-finishing-high-school-in-la',
        author: 'Brittny Mejia',
        published_date: '2025-12-23',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'I didn\'t know who they were, I didn\'t know what they wanted. But they handcuffed me and left me wondering: \'What did I do?\'',
        attribution: 'Benjamin Guerrero Cruz',
        context: 'Describing his arrest while walking his dog',
        published_date: '2025-12-23'
      },
      {
        quote_text: 'They grab people like animals, as if they\'re hurting someone by going to work. These weren\'t criminals. They worked, they were the breadwinners of their house and their families were scared without them.',
        attribution: 'Benjamin Guerrero Cruz',
        context: 'Describing fellow detainees at Adelanto',
        published_date: '2025-12-23'
      }
    ]
  },
  {
    incident_id: '2025-07-10-detention-retes-glass-house',
    subject_name: 'George Retes Jr.',
    subject_age: 25,
    subject_nationality: 'United States',
    incident_type: 'wrongful_detention',
    incident_date: '2025-07-10',
    city: 'Camarillo',
    state: 'CA',
    country: 'USA',
    facility: 'Metropolitan Detention Center (Los Angeles)',
    summary: 'Army veteran and US citizen detained during Glass House Farms ICE raid. Agents smashed car window, pepper sprayed him, knelt on neck and back. Held 3 days without charges, phone call, or attorney. After publishing op-ed about ordeal, DHS accused him of assault - which he denies and video contradicts.',
    sources: [
      {
        publication: 'Los Angeles Times',
        title: 'A U.S. veteran spoke out against his wrongful arrest by ICE. Now he\'s being accused of assault',
        url: 'https://www.latimes.com/california/story/2025-09-26/dhs-accuses-veteran-of-assault-after-he-details-his-arrest',
        author: 'Melissa Gomez',
        published_date: '2025-09-26',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'I served my country. I wore the uniform, I stood watch, and I believe in the values we say make us different. And yet here, on our own soil, I was wrongfully detained. Stripped of my rights, treated like I didn\'t belong and locked away — all as an American citizen and a veteran ... if it can happen to me, it can happen to any one of us.',
        attribution: 'George Retes Jr.',
        context: 'San Francisco Chronicle op-ed',
        published_date: '2025-09-16'
      },
      {
        quote_text: 'When people in this country stand up to this government, this government responds with fury.',
        attribution: 'Anya Bidwell (attorney, Institute for Justice)',
        context: 'Commenting on DHS accusations after Retes spoke out',
        published_date: '2025-09-26'
      }
    ]
  },
  {
    incident_id: '2026-01-10-assault-rummler-santa-ana',
    subject_name: 'Kaden Rummler',
    subject_age: 21,
    subject_nationality: 'United States',
    incident_type: 'assault',
    incident_date: '2026-01-10',
    city: 'Santa Ana',
    state: 'CA',
    country: 'USA',
    facility: null,
    summary: '21-year-old protester permanently blinded in left eye after DHS agent fired nonlethal round at close range during protest outside federal building. Suffered fractured skull, metal shard lodged 7mm from carotid artery. Experts say firing at head violates use-of-force standards. Video shows agent dragging him by hood while choking.',
    sources: [
      {
        publication: 'Los Angeles Times',
        title: 'Anti-ICE protester blinded by federal agent during demonstration in Santa Ana, family says',
        url: 'https://www.latimes.com/california/story/2026-01-13/socal-protester-permanently-blinded-by-dhs-agent-family-says',
        author: 'Ruben Vives, Itzel Luna',
        published_date: '2026-01-13',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'This constitutes as deadly force as far as the law is concerned. All the training manuals and [legal] cases say you don\'t aim at the face because these projectiles can cause serious injury [or] death.',
        attribution: 'Ed Obayashi (Modoc County sheriff\'s deputy, legal advisor)',
        context: 'Analyzing video of shooting',
        published_date: '2026-01-13'
      },
      {
        quote_text: 'The other officers were mocking him, saying, \'You\'re going to lose your eye.\'',
        attribution: 'Jeri Rees (Rummler\'s aunt)',
        context: 'Recounting what nephew told her about treatment by agents',
        published_date: '2026-01-13'
      }
    ]
  },
  {
    incident_id: '2025-11-04-detention-abuse-broadview',
    subject_name: 'Broadview Detention Facility Detainees',
    subject_age: null,
    subject_nationality: 'Various',
    incident_type: 'detention_abuse',
    incident_date: '2025-11-04',
    city: 'Broadview',
    state: 'IL',
    country: 'USA',
    facility: 'Broadview ICE Detention Center',
    summary: 'Federal judge expressed alarm about ICE detention conditions at Chicago-area facility. Former detainees described tight quarters, lack of sanitation, little access to lawyers. No beds, no working showers. Facility designed for 12-hour stays but people held for days. Judge said conditions were "unnecessarily cruel."',
    sources: [
      {
        publication: 'New York Times',
        title: '\'Unnecessarily Cruel\': Judge Expresses Alarm About ICE Detention Conditions',
        url: 'https://www.nytimes.com/2025/11/04/us/illinois-immigration-broadview-conditions.html',
        author: 'Mitch Smith',
        published_date: '2025-11-04',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'I do think the plaintiffs have made a case that justifies the entry of some sort of temporary restraining order.',
        attribution: 'Judge Robert W. Gettleman',
        context: 'Hearing on conditions at Broadview facility',
        published_date: '2025-11-04'
      },
      {
        quote_text: 'The government has improved the operations at the Broadview facility over the last couple months. It\'s been a learning curve.',
        attribution: 'Jana Brady (federal government lawyer)',
        context: 'Defending government at hearing',
        published_date: '2025-11-04'
      }
    ]
  }
];

async function addIncidents() {
  const client = await pool.connect();
  
  try {
    console.log('Adding verified January 2026 ICE incidents to database...\n');
    
    for (const incident of incidents) {
      // Check if incident already exists
      const existing = await client.query(
        'SELECT id FROM incidents WHERE incident_id = $1',
        [incident.incident_id]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⚠️ ${incident.subject_name} (${incident.incident_id}) already exists, skipping...`);
        continue;
      }
      
      // Insert incident
      const incidentResult = await client.query(`
        INSERT INTO incidents (
          incident_id, subject_name, subject_age, subject_nationality,
          incident_type, incident_date, 
          city, state, country, facility, summary, verification_status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id
      `, [
        incident.incident_id,
        incident.subject_name,
        incident.subject_age,
        incident.subject_nationality,
        incident.incident_type,
        incident.incident_date,
        incident.city,
        incident.state,
        incident.country,
        incident.facility,
        incident.summary,
        'pending'
      ]);
      
      const incidentId = incidentResult.rows[0].id;
      
      console.log(`✅ Added: ${incident.subject_name} (ID: ${incidentId}, Type: ${incident.incident_type})`);
      
      // Insert sources
      for (const source of incident.sources) {
        await client.query(`
          INSERT INTO incident_sources (
            incident_id, url, title, publication, author, 
            published_date, source_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          incidentId,
          source.url,
          source.title,
          source.publication,
          source.author,
          source.published_date,
          source.source_type
        ]);
      }
      console.log(`   📎 Added ${incident.sources.length} source(s)`);
      
      // Insert quotes
      for (const quote of incident.quotes) {
        // Truncate attribution to 50 chars for category field
        const category = (quote.attribution || 'Unknown').substring(0, 50);
        
        await client.query(`
          INSERT INTO incident_quotes (
            incident_id, quote_text, category, verified, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          incidentId,
          quote.quote_text,
          category,
          true
        ]);
      }
      console.log(`   💬 Added ${incident.quotes.length} quote(s)\n`);
    }
    
    // Get updated counts
    console.log('=== Updated Database Summary ===');
    const counts = await client.query(`
      SELECT incident_type, COUNT(*) as count
      FROM incidents
      GROUP BY incident_type
      ORDER BY count DESC
    `);
    
    counts.rows.forEach(row => {
      console.log(`${row.incident_type}: ${row.count}`);
    });
    
    const total = await client.query('SELECT COUNT(*) FROM incidents');
    console.log(`\nTotal incidents: ${total.rows[0].count}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

addIncidents().catch(console.error);
