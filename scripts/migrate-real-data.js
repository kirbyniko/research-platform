import { Pool } from 'pg';

// Source database (local)
const sourcePool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/ice_deaths'
});

// Target database (Neon cloud)
const targetPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrateRealData() {
  console.log('Migrating real incident data from local to cloud...\n');
  
  try {
    // Test connections
    await sourcePool.query('SELECT 1');
    await targetPool.query('SELECT 1');
    console.log('✓ Both databases connected\n');
    
    // Get all incidents from source
    const sourceIncidents = await sourcePool.query(`
      SELECT * FROM incidents ORDER BY created_at
    `);
    
    console.log(`Found ${sourceIncidents.rows.length} incidents in local database\n`);
    
    if (sourceIncidents.rows.length === 0) {
      console.log('No incidents to migrate');
      return;
    }
    
    let migrated = 0;
    
    for (const incident of sourceIncidents.rows) {
      try {
        // Insert incident into target
        const result = await targetPool.query(`
          INSERT INTO incidents (
            incident_id, incident_type, incident_date, date_precision,
            city, state, country, facility,
            subject_name, subject_age, subject_nationality,
            summary, verification_status, verified,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
          ON CONFLICT (incident_id) DO NOTHING
          RETURNING id
        `, [
          incident.incident_id || `MIGRATED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          incident.incident_type || 'death_in_custody',
          incident.incident_date,
          incident.date_precision || 'exact',
          incident.city,
          incident.state,
          incident.country || 'United States',
          incident.facility,
          incident.subject_name || incident.victim_name,
          incident.subject_age || incident.age,
          incident.subject_nationality || incident.country_of_origin,
          incident.summary,
          incident.verification_status || 'verified',
          incident.verified !== false,
          incident.created_at || new Date(),
          incident.updated_at || new Date()
        ]);
        
        if (result.rows.length === 0) {
          console.log(`  - Skipped (duplicate): ${incident.subject_name || incident.victim_name}`);
          continue;
        }
        
        const newIncidentId = result.rows[0].id;
        
        // Migrate sources
        const sources = await sourcePool.query(`
          SELECT * FROM incident_sources WHERE incident_id = $1
        `, [incident.id]);
        
        for (const source of sources.rows) {
          await targetPool.query(`
            INSERT INTO incident_sources (incident_id, url, title, source_type)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
          `, [newIncidentId, source.url, source.title, source.source_type || 'news']);
        }
        
        // Migrate quotes
        const quotes = await sourcePool.query(`
          SELECT * FROM incident_quotes WHERE incident_id = $1
        `, [incident.id]);
        
        for (const quote of quotes.rows) {
          await targetPool.query(`
            INSERT INTO incident_quotes (incident_id, quote_text, category, verified)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
          `, [newIncidentId, quote.quote_text, quote.category || 'evidence', quote.verified || false]);
        }
        
        // Migrate timeline
        const timeline = await sourcePool.query(`
          SELECT * FROM incident_timeline WHERE incident_id = $1
        `, [incident.id]);
        
        for (const event of timeline.rows) {
          await targetPool.query(`
            INSERT INTO incident_timeline (incident_id, event_date, event_type, description)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
          `, [newIncidentId, event.event_date, event.event_type || 'event', event.description || event.event]);
        }
        
        migrated++;
        console.log(`  ✓ ${incident.subject_name || incident.victim_name} (${sources.rows.length} sources, ${quotes.rows.length} quotes)`);
        
      } catch (error) {
        console.error(`  ✗ Error migrating ${incident.subject_name || incident.victim_name}:`, error.message);
      }
    }
    
    console.log(`\n✓ Migration complete! Migrated ${migrated} of ${sourceIncidents.rows.length} incidents`);
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

migrateRealData();
