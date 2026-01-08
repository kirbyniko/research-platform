const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ice_deaths',
});

async function migrateJsonToPostgres() {
  console.log('Starting migration from JSON to PostgreSQL...\n');

  try {
    // Read all case files
    const casesDir = path.join(__dirname, '../data/cases');
    const files = fs.readdirSync(casesDir).filter(f => f.endsWith('.json') && f !== '_template.json');

    console.log(`Found ${files.length} case files to migrate\n`);

    for (const file of files) {
      const filePath = path.join(casesDir, file);
      const caseData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      console.log(`Migrating: ${caseData.name} (${caseData.id})...`);

      // Insert case
      await pool.query(
        `INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           age = EXCLUDED.age,
           nationality = EXCLUDED.nationality,
           date_of_death = EXCLUDED.date_of_death,
           custody_status = EXCLUDED.custody_status,
           official_cause_of_death = EXCLUDED.official_cause_of_death,
           notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP`,
        [
          caseData.id,
          caseData.name,
          caseData.age,
          caseData.nationality,
          caseData.date_of_death,
          caseData.custody_status,
          caseData.official_cause_of_death,
          caseData.notes || null
        ]
      );

      // Insert facility
      await pool.query(
        `DELETE FROM facilities WHERE case_id = $1`,
        [caseData.id]
      );
      await pool.query(
        `INSERT INTO facilities (case_id, name, city, state, type)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          caseData.id,
          caseData.facility.name,
          caseData.facility.city || null,
          caseData.facility.state,
          caseData.facility.type
        ]
      );

      // Insert timeline events
      await pool.query(`DELETE FROM timeline_events WHERE case_id = $1`, [caseData.id]);
      for (let i = 0; i < caseData.timeline.length; i++) {
        const event = caseData.timeline[i];
        await pool.query(
          `INSERT INTO timeline_events (case_id, date, event, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [caseData.id, event.date, event.event, i]
        );
      }

      // Insert discrepancies
      if (caseData.discrepancies && caseData.discrepancies.length > 0) {
        await pool.query(`DELETE FROM discrepancies WHERE case_id = $1`, [caseData.id]);
        for (const disc of caseData.discrepancies) {
          await pool.query(
            `INSERT INTO discrepancies (case_id, ice_claim, counter_evidence)
             VALUES ($1, $2, $3)`,
            [caseData.id, disc.ice_claim, disc.counter_evidence]
          );
        }
      }

      // Insert sources
      await pool.query(`DELETE FROM sources WHERE case_id = $1`, [caseData.id]);
      for (const source of caseData.sources) {
        await pool.query(
          `INSERT INTO sources (case_id, title, publisher, date, url)
           VALUES ($1, $2, $3, $4, $5)`,
          [caseData.id, source.title, source.publisher, source.date, source.url]
        );
      }

      // Insert categories
      await pool.query(`DELETE FROM categories WHERE case_id = $1`, [caseData.id]);
      for (const category of caseData.category) {
        await pool.query(
          `INSERT INTO categories (case_id, category)
           VALUES ($1, $2)`,
          [caseData.id, category]
        );
      }

      console.log(`✓ Migrated: ${caseData.name}\n`);
    }

    console.log(`\n✅ Successfully migrated ${files.length} cases to PostgreSQL`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateJsonToPostgres();
