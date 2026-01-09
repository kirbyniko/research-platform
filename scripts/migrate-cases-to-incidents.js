const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ice_deaths',
});

async function migrateCasesToIncidents() {
  console.log('Migrating cases to incidents table...\n');

  try {
    // Get all cases
    const casesResult = await pool.query(`
      SELECT c.*, f.name as facility_name, f.city, f.state
      FROM cases c
      LEFT JOIN facilities f ON c.id = f.case_id
      ORDER BY c.date_of_death DESC
    `);

    console.log(`Found ${casesResult.rows.length} cases to migrate\n`);

    for (const caseRow of casesResult.rows) {
      console.log(`Migrating: ${caseRow.name} (${caseRow.id})...`);

      // Get categories for this case to determine incident_type
      const categoriesResult = await pool.query(`
        SELECT category FROM categories WHERE case_id = $1
      `, [caseRow.id]);

      // Map categories to incident_type (default to 'detention_death' if no categories)
      let incidentType = 'detention_death';
      const categories = categoriesResult.rows.map(r => r.category);
      
      if (categories.includes('officer-involved shooting') || categories.includes('use_of_force')) {
        incidentType = 'street_incident';
      } else if (categories.includes('suicide')) {
        incidentType = 'suicide_in_custody';
      } else if (categories.includes('pursuit-related death')) {
        incidentType = 'street_incident';
      }

      // Insert into incidents table
      await pool.query(`
        INSERT INTO incidents (
          incident_id,
          incident_type,
          victim_name,
          subject_age,
          subject_nationality,
          incident_date,
          facility,
          city,
          state,
          summary,
          verification_status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (incident_id) DO UPDATE SET
          incident_type = EXCLUDED.incident_type,
          victim_name = EXCLUDED.victim_name,
          subject_age = EXCLUDED.subject_age,
          subject_nationality = EXCLUDED.subject_nationality,
          incident_date = EXCLUDED.incident_date,
          facility = EXCLUDED.facility,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          summary = EXCLUDED.summary,
          updated_at = NOW()
      `, [
        caseRow.id,                    // incident_id
        incidentType,                  // incident_type
        caseRow.name,                  // victim_name
        caseRow.age,                   // subject_age
        caseRow.nationality,           // subject_nationality
        caseRow.date_of_death,         // incident_date
        caseRow.facility_name,         // facility
        caseRow.city,                  // city
        caseRow.state,                 // state
        caseRow.notes,                 // summary
        'pending'                      // verification_status (all need verification)
      ]);

      // Migrate sources to incident_sources and incident_quotes
      const sourcesResult = await pool.query(`
        SELECT * FROM sources WHERE case_id = $1
      `, [caseRow.id]);

      for (const source of sourcesResult.rows) {
        // Insert source
        const sourceInsert = await pool.query(`
          INSERT INTO incident_sources (
            incident_id,
            source_type,
            title,
            publication,
            published_date,
            url,
            author
          ) VALUES (
            (SELECT id FROM incidents WHERE incident_id = $1),
            $2, $3, $4, $5, $6, $7
          )
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          caseRow.id,
          'article',
          source.title,
          source.publisher,
          source.date,
          source.url,
          source.author || null
        ]);

        // If source has a quote, add it to incident_quotes
        if (source.quote && sourceInsert.rows.length > 0) {
          await pool.query(`
            INSERT INTO incident_quotes (
              incident_id,
              source_id,
              quote_text
            ) VALUES (
              (SELECT id FROM incidents WHERE incident_id = $1),
              $2, $3
            )
            ON CONFLICT DO NOTHING
          `, [
            caseRow.id,
            sourceInsert.rows[0].id,
            source.quote
          ]);
        }
      }

      console.log(`  ✓ Migrated with ${sourcesResult.rows.length} sources`);
    }

    console.log('\n✅ Migration complete!');
    
    // Show summary
    const count = await pool.query('SELECT COUNT(*) as count FROM incidents WHERE verification_status = $1', ['pending']);
    console.log(`\n${count.rows[0].count} cases now awaiting verification in the incidents table.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateCasesToIncidents();
