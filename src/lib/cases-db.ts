import pool from './db';
import { Case } from '@/types/case';

export async function getAllCasesFromDb(): Promise<Case[]> {
  const client = await pool.connect();
  try {
    // Get all cases
    const casesResult = await client.query(`
      SELECT * FROM cases ORDER BY date_of_death DESC
    `);

    const cases: Case[] = [];

    for (const caseRow of casesResult.rows) {
      // Get facility
      const facilityResult = await client.query(
        'SELECT * FROM facilities WHERE case_id = $1',
        [caseRow.id]
      );

      // Get timeline events
      const timelineResult = await client.query(
        'SELECT * FROM timeline_events WHERE case_id = $1 ORDER BY sort_order',
        [caseRow.id]
      );

      // Get discrepancies
      const discrepanciesResult = await client.query(
        'SELECT * FROM discrepancies WHERE case_id = $1',
        [caseRow.id]
      );

      // Get sources
      const sourcesResult = await client.query(
        'SELECT id, title, publisher, date, url, quote, quote_context FROM sources WHERE case_id = $1',
        [caseRow.id]
      );

      // Create a sources map for lookups
      const sourcesMap = new Map(sourcesResult.rows.map((s: any) => [s.id, {
        id: s.id,
        title: s.title,
        publisher: s.publisher,
        date: s.date ? s.date.toISOString().split('T')[0] : '',
        url: s.url,
        ...(s.quote && { quote: s.quote }),
        ...(s.quote_context && { quote_context: s.quote_context }),
      }]));

      // Get categories
      const categoriesResult = await client.query(
        'SELECT category FROM categories WHERE case_id = $1',
        [caseRow.id]
      );

      const facility = facilityResult.rows[0];
      
      cases.push({
        id: caseRow.id,
        name: caseRow.name,
        age: caseRow.age,
        nationality: caseRow.nationality,
        date_of_death: caseRow.date_of_death.toISOString().split('T')[0],
        facility: facility ? {
          name: facility.name,
          ...(facility.city && { city: facility.city }),
          state: facility.state,
          type: facility.type,
        } : {
          name: 'Unknown',
          state: 'Unknown',
          type: 'Unknown',
        },
        custody_status: caseRow.custody_status,
        category: categoriesResult.rows.map((r: any) => r.category),
        official_cause_of_death: caseRow.official_cause_of_death,
        timeline: timelineResult.rows.map((r: any) => ({
          date: r.date.toISOString().split('T')[0],
          event: r.event,
          ...(r.source_id && { source: sourcesMap.get(r.source_id) }),
        })),
        discrepancies: discrepanciesResult.rows.map((r: any) => ({
          ice_claim: r.ice_claim,
          ...(r.ice_claim_source_id && { ice_claim_source: sourcesMap.get(r.ice_claim_source_id) }),
          counter_evidence: r.counter_evidence,
          ...(r.counter_evidence_source_id && { counter_evidence_source: sourcesMap.get(r.counter_evidence_source_id) }),
        })),
        sources: Array.from(sourcesMap.values()),
        notes: caseRow.notes,
        ...(caseRow.image_url && { image_url: caseRow.image_url }),
      });
    }

    return cases;
  } finally {
    client.release();
  }
}

export async function getCaseByIdFromDb(id: string): Promise<Case | null> {
  const cases = await getAllCasesFromDb();
  return cases.find(c => c.id === id) || null;
}

export async function saveCaseToDb(caseData: Case): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert case
    await client.query(
      `INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         age = EXCLUDED.age,
         nationality = EXCLUDED.nationality,
         date_of_death = EXCLUDED.date_of_death,
         custody_status = EXCLUDED.custody_status,
         official_cause_of_death = EXCLUDED.official_cause_of_death,
         notes = EXCLUDED.notes,
         image_url = EXCLUDED.image_url,
         updated_at = CURRENT_TIMESTAMP`,
      [
        caseData.id,
        caseData.name,
        caseData.age,
        caseData.nationality,
        caseData.date_of_death,
        caseData.custody_status,
        caseData.official_cause_of_death,
        caseData.notes || null,
        caseData.image_url || null,
      ]
    );

    // Delete existing related records
    await client.query('DELETE FROM facilities WHERE case_id = $1', [caseData.id]);
    await client.query('DELETE FROM timeline_events WHERE case_id = $1', [caseData.id]);
    await client.query('DELETE FROM discrepancies WHERE case_id = $1', [caseData.id]);
    await client.query('DELETE FROM sources WHERE case_id = $1', [caseData.id]);
    await client.query('DELETE FROM categories WHERE case_id = $1', [caseData.id]);

    // Insert facility
    await client.query(
      'INSERT INTO facilities (case_id, name, city, state, type) VALUES ($1, $2, $3, $4, $5)',
      [caseData.id, caseData.facility.name, (caseData.facility as any).city || null, caseData.facility.state, caseData.facility.type]
    );

    // Insert timeline events
    for (let i = 0; i < caseData.timeline.length; i++) {
      await client.query(
        'INSERT INTO timeline_events (case_id, date, event, sort_order) VALUES ($1, $2, $3, $4)',
        [caseData.id, caseData.timeline[i].date, caseData.timeline[i].event, i]
      );
    }

    // Insert discrepancies
    if (caseData.discrepancies) {
      for (const disc of caseData.discrepancies) {
        await client.query(
          'INSERT INTO discrepancies (case_id, ice_claim, counter_evidence) VALUES ($1, $2, $3)',
          [caseData.id, disc.ice_claim, disc.counter_evidence]
        );
      }
    }

    // Insert sources
    for (const source of caseData.sources) {
      await client.query(
        'INSERT INTO sources (case_id, title, publisher, date, url) VALUES ($1, $2, $3, $4, $5)',
        [caseData.id, source.title, source.publisher, source.date, source.url]
      );
    }

    // Insert categories
    for (const category of caseData.category) {
      await client.query(
        'INSERT INTO categories (case_id, category) VALUES ($1, $2)',
        [caseData.id, category]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
