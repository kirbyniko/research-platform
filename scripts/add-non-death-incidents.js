// Add non-death ICE incidents from verified news sources
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

// Verified incidents from news sources with real quotes
const newIncidents = [
  // 1. Kilmar Abrego Garcia - Wrongful deportation case
  {
    incident_id: '2025-03-wrongful-deportation-abrego-garcia',
    incident_type: 'wrongful_deportation',
    subject_name: 'Kilmar Armando Abrego Garcia',
    incident_date: '2025-03-15', // Approximate date of wrongful deportation
    city: 'Baltimore',
    state: 'MD',
    country: 'USA',
    facility: null,
    summary: 'Kilmar Armando Abrego Garcia, a Maryland resident with legal status, was wrongfully deported to El Salvador by the Trump administration in March 2025. A federal judge later ruled he had been detained "without lawful authority" for nearly four months. He was released in December 2025 after Judge Paula Xinis issued a ruling.',
    sources: [
      {
        url: 'https://www.nytimes.com/2025/12/11/us/politics/abrego-garcia-released.html',
        title: 'Abrego Garcia Is Released From ICE Detention After Judge\'s Order',
        publication: 'The New York Times',
        author: 'Alan Feuer',
        published_date: '2025-12-11',
        source_type: 'news'
      },
      {
        url: 'https://www.nytimes.com/2025/08/25/us/politics/kilmar-abrego-garcia-arrested-ice-deportation.html',
        title: 'Abrego Garcia Detained Again After Government Signaled It Would Re-Deport Him',
        publication: 'The New York Times',
        author: 'Alan Feuer',
        published_date: '2025-08-25',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'Today\'s decision granting Mr. Abrego Garcia\'s release is a victory not just for one Maryland man but for everyone. We\'re gratified by the court\'s ruling upholding due process and the rule of law.',
        category: 'family_statement',
        source_name: 'Andrew Rossman, lawyer for Abrego Garcia'
      },
      {
        quote_text: 'The Trump administration had detained him for nearly four months "without lawful authority" despite repeated vows to re-expel him from the country.',
        category: 'court_document',
        source_name: 'Federal District Court ruling, Judge Paula Xinis'
      }
    ]
  },

  // 2. V.M.L. - 2-year-old US citizen deported
  {
    incident_id: '2025-04-25-us-citizen-child-deported',
    incident_type: 'wrongful_deportation',
    subject_name: 'V.M.L. (2-year-old US citizen)',
    subject_age: 2,
    incident_date: '2025-04-25',
    city: null,
    state: 'LA', // Case in Louisiana court
    country: 'USA',
    facility: 'LaSalle ICE Processing Center',
    summary: 'A 2-year-old United States citizen, known in court papers as V.M.L., was deported to Honduras with her mother despite her father filing an emergency petition to stop the deportation. Federal Judge Terry A. Doughty, a Trump appointee, expressed "strong suspicion that the government just deported a U.S. citizen with no meaningful process."',
    sources: [
      {
        url: 'https://www.nytimes.com/2025/04/25/us/politics/us-citizen-deported.html',
        title: '2-Year-Old U.S. Citizen Deported \'With No Meaningful Process,\' Judge Suspects',
        publication: 'The New York Times',
        author: 'Alan Feuer',
        published_date: '2025-04-25',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'The government contends that this is all OK because the mother wishes that the child be deported with her. But the court doesn\'t know that.',
        category: 'court_document',
        source_name: 'Judge Terry A. Doughty, Federal District Court'
      },
      {
        quote_text: 'It is illegal and unconstitutional to deport a U.S. citizen.',
        category: 'court_document',
        source_name: 'Judge Terry A. Doughty'
      }
    ]
  },

  // 3. US Citizens detained - Jason Brian Gavidia and Julio Noriega
  {
    incident_id: '2025-06-us-citizen-detained-gavidia',
    incident_type: 'wrongful_detention',
    subject_name: 'Jason Brian Gavidia',
    incident_date: '2025-06-15', // June 2025 per article
    city: 'Montebello',
    state: 'CA',
    country: 'USA',
    facility: null,
    summary: 'Jason Brian Gavidia, a U.S. citizen, was stopped and detained by ICE agents in Montebello, California in June 2025. Despite declaring his citizenship, he was ignored by officers. This was part of a pattern documented by the New York Times in which at least 15 U.S. citizens were arrested or detained by immigration agents since January 2025.',
    sources: [
      {
        url: 'https://www.nytimes.com/2025/09/29/us/trump-immigration-agents-us-citizens.html',
        title: '\'I\'m From Here!\': U.S. Citizens Are Ending Up in Trump\'s Dragnet',
        publication: 'The New York Times',
        author: 'Jazmine Ulloa, Allison McCann, Jennifer Medina',
        published_date: '2025-09-29',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'While many of those detained have immediately declared their U.S. citizenship to officers, they have routinely been ignored, according to interviews with the men, their lawyers and court documents. In some cases they have been handcuffed, kept in holding cells and immigration facilities overnight, and in at least two cases held without access to a lawyer or even a phone call.',
        category: 'journalist_analysis',
        source_name: 'The New York Times investigation'
      }
    ]
  },

  // 4. Julio Noriega - US citizen detained in Chicago
  {
    incident_id: '2025-01-us-citizen-detained-noriega',
    incident_type: 'wrongful_detention',
    subject_name: 'Julio Noriega',
    subject_age: 54,
    incident_date: '2025-01-25', // Late January per article
    city: 'Berwyn',
    state: 'IL',
    country: 'USA',
    facility: null,
    summary: 'Julio Noriega, a 54-year-old U.S. citizen from Chicago, was detained by ICE officers while handing out copies of his résumé to local businesses in Berwyn, Illinois. He was handcuffed and loaded into a van without being allowed to explain he was a citizen. He was released about 10 hours later.',
    sources: [
      {
        url: 'https://www.nytimes.com/2025/09/29/us/trump-immigration-agents-us-citizens.html',
        title: '\'I\'m From Here!\': U.S. Citizens Are Ending Up in Trump\'s Dragnet',
        publication: 'The New York Times',
        author: 'Jazmine Ulloa, Allison McCann, Jennifer Medina',
        published_date: '2025-09-29',
        source_type: 'news'
      },
      {
        url: 'https://chicago.suntimes.com/immigration/2025/03/14/us-citizen-arrested-berwyn-ice-chicago-attorneys',
        title: 'US citizen arrested by ICE in Berwyn',
        publication: 'Chicago Sun-Times',
        published_date: '2025-03-14',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'They handcuffed him and loaded him into a van, without allowing him to explain he was a citizen.',
        category: 'court_document',
        source_name: 'Motion filed in Federal District Court for Northern Illinois'
      }
    ]
  },

  // 5. Erron Anthony Clarke - Inhumane detention conditions
  {
    incident_id: '2025-11-detention-abuse-clarke',
    incident_type: 'detention_abuse',
    subject_name: 'Erron Anthony Clarke',
    subject_nationality: 'Jamaican',
    incident_date: '2025-11-15', // November 2025
    city: 'Central Islip',
    state: 'NY',
    country: 'USA',
    facility: 'Alphonse M. D\'Amato U.S. Courthouse',
    summary: 'Erron Anthony Clarke, a Jamaican citizen who had applied for permanent residency, was held for more than two days in a 6x6 foot cell designed for one person, with eight other detainees, near an open toilet, in freezing conditions (21 degrees outside). Federal Judge Gary R. Brown, a Trump appointee, issued a 24-page opinion condemning the conditions.',
    sources: [
      {
        url: 'https://www.nytimes.com/2025/12/19/nyregion/judge-ice-detention-long-island.html',
        title: 'Trump-Appointed Judge Flays ICE Over Conditions in Long Island Lockup',
        publication: 'The New York Times',
        author: 'Santul Nerkar',
        published_date: '2025-12-19',
        source_type: 'news'
      }
    ],
    quotes: [
      {
        quote_text: 'After nearly 35 years of experience with federal law enforcement in this judicial district, encompassing service as a prosecutor and a judge, I have never encountered anything like this.',
        category: 'court_document',
        source_name: 'Judge Gary R. Brown, Federal District Court (Trump appointee)'
      },
      {
        quote_text: 'The judge also wrote that Immigration and Customs Enforcement had presented false information about Mr. Clarke\'s arrest and had ignored court orders by failing to present him for a hearing and provide photographs of the cell. He questioned why the agency should not be held in contempt.',
        category: 'journalist_analysis',
        source_name: 'The New York Times'
      }
    ]
  }
];

async function addIncidents() {
  const client = await pool.connect();
  
  try {
    console.log('Adding non-death ICE incidents to database...\n');
    
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
          true // Pre-verified from source
        ]);
      }
      console.log(`   💬 Added ${incident.quotes.length} quote(s)\n`);
    }
    
    // Summary
    console.log('=== Database Summary ===');
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
