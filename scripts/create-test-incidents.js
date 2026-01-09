import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTestIncidents() {
  console.log('Creating test incidents for review...\n');
  
  try {
    // Create test user if needed
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role, auth_provider)
      VALUES ('test@example.com', 'Test User', 'user', 'google')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    console.log('✓ Test user created/found:', userId);
    
    // Create 3 test incidents with pending status
    const incidents = [
      {
        name: 'John Doe',
        age: 35,
        country: 'Mexico',
        date: '2024-03-15',
        city: 'El Paso',
        state: 'TX',
        facility: 'El Paso Processing Center',
        summary: 'Subject died in custody after reporting chest pain. Medical attention was delayed for 2 hours.',
      },
      {
        name: 'Maria Garcia',
        age: 28,
        country: 'Guatemala',
        date: '2024-05-20',
        city: 'Tucson',
        state: 'AZ',
        facility: 'Tucson Sector Border Patrol',
        summary: 'Subject sustained injuries during arrest. Multiple officers involved in restraint.',
      },
      {
        name: 'Carlos Rodriguez',
        age: 42,
        country: 'Honduras',
        date: '2024-07-10',
        city: 'Houston',
        state: 'TX',
        facility: 'IAH Polk Detention Center',
        summary: 'Subject reported denied medical care for chronic condition over 3-week period.',
      }
    ];
    
    for (const incident of incidents) {
      // Generate unique incident_id
      const uniqueId = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await pool.query(`
        INSERT INTO incidents (
          incident_id, incident_type, incident_date, city, state, facility,
          subject_name, subject_age, subject_nationality,
          summary, verification_status, submitted_by, submitter_role,
          created_at
        ) VALUES (
          $1, 'death_in_custody', $2, $3, $4, $5, $6, $7, $8, $9, 
          'pending', $10, 'user', NOW()
        )
        RETURNING id, incident_id
      `, [
        uniqueId,
        incident.date, incident.city, incident.state, incident.facility,
        incident.name, incident.age, incident.country, incident.summary,
        userId
      ]);
      
      const incidentId = result.rows[0].id;
      console.log(`✓ Created incident: ${incident.name} (ID: ${incidentId})`);
      
      // Add a test source
      await pool.query(`
        INSERT INTO incident_sources (incident_id, url, title, source_type)
        VALUES ($1, $2, $3, 'news')
      `, [
        incidentId,
        'https://example.com/article-' + incidentId,
        'Test News Article - ' + incident.name
      ]);
      
      // Add a test quote
      await pool.query(`
        INSERT INTO incident_quotes (incident_id, quote_text, category, verified)
        VALUES ($1, $2, 'evidence', false)
      `, [
        incidentId,
        `"${incident.name} was found unresponsive in their cell," according to facility records.`
      ]);
    }
    
    console.log('\n✓ Created 3 test incidents with pending status');
    console.log('These should now appear in the extension review queue');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestIncidents();
