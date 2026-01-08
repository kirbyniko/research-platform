import pool from './db';
import type {
  Incident,
  IncidentFilters,
  IncidentStats,
  IncidentSource,
  IncidentQuote,
  TimelineEntry,
  IncidentType,
  AgencyType,
  ViolationType,
  Outcome,
  DeathDetails,
  InjuryDetails,
  ArrestDetails,
  RightsViolationDetails,
  DeportationDetails,
  FamilySeparationDetails,
  WorkplaceRaidDetails,
} from '@/types/incident';

// ============================================
// CREATE
// ============================================

export async function createIncident(incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert main incident
    const result = await client.query(`
      INSERT INTO incidents (
        incident_id, incident_type, incident_date, date_precision, incident_date_end,
        city, state, country, facility, address, latitude, longitude,
        subject_name, subject_name_public, subject_age, subject_gender,
        subject_nationality, subject_immigration_status, subject_occupation,
        subject_years_in_us, subject_family_in_us,
        summary, verified, verification_notes, tags, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      RETURNING id
    `, [
      incident.incident_id,
      incident.incident_type,
      incident.date,
      incident.date_precision || 'exact',
      incident.date_end || null,
      incident.location?.city || null,
      incident.location?.state || null,
      incident.location?.country || 'USA',
      incident.location?.facility || null,
      incident.location?.address || null,
      incident.location?.coordinates?.latitude || null,
      incident.location?.coordinates?.longitude || null,
      incident.subject?.name || null,
      incident.subject?.name_public ?? false,
      incident.subject?.age || null,
      incident.subject?.gender || null,
      incident.subject?.nationality || null,
      incident.subject?.immigration_status || null,
      incident.subject?.occupation || null,
      incident.subject?.years_in_us || null,
      incident.subject?.family_in_us || null,
      incident.summary,
      incident.verified ?? false,
      incident.verification_notes || null,
      incident.tags || [],
      incident.created_by || null,
    ]);

    const incidentId = result.rows[0].id;

    // Insert agencies
    if (incident.agencies_involved?.length) {
      for (const agency of incident.agencies_involved) {
        await client.query(`
          INSERT INTO incident_agencies (incident_id, agency)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [incidentId, agency]);
      }
    }

    // Insert violations
    if (incident.violations_alleged?.length) {
      for (const violation of incident.violations_alleged) {
        await client.query(`
          INSERT INTO incident_violations (incident_id, violation_type)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [incidentId, violation]);
      }
    }

    // Insert type-specific details
    const detailsMap: Record<string, unknown> = {
      death: incident.death_details,
      injury: incident.injury_details,
      arrest: incident.arrest_details,
      rights_violation: incident.violation_details,
      deportation: incident.deportation_details,
      family_separation: incident.family_separation_details,
      workplace_raid: incident.workplace_raid_details,
    };

    const details = detailsMap[incident.incident_type];
    if (details) {
      await client.query(`
        INSERT INTO incident_details (incident_id, detail_type, details)
        VALUES ($1, $2, $3)
      `, [incidentId, incident.incident_type, JSON.stringify(details)]);
    }

    // Insert outcome if present
    if (incident.outcome) {
      await client.query(`
        UPDATE incidents SET
          outcome_status = $2,
          outcome_legal_action = $3,
          outcome_settlement = $4,
          outcome_policy_change = $5,
          outcome_criminal_charges = $6,
          outcome_internal_investigation = $7,
          outcome_media_coverage = $8
        WHERE id = $1
      `, [
        incidentId,
        incident.outcome.status,
        incident.outcome.legal_action || null,
        incident.outcome.settlement_amount || null,
        incident.outcome.policy_change || null,
        incident.outcome.criminal_charges || null,
        incident.outcome.internal_investigation || null,
        incident.outcome.media_coverage_level || null,
      ]);
    }

    await client.query('COMMIT');
    return incidentId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// READ
// ============================================

export async function getIncidentById(id: number | string): Promise<Incident | null> {
  const client = await pool.connect();
  try {
    const idColumn = typeof id === 'number' ? 'id' : 'incident_id';
    const result = await client.query(`
      SELECT * FROM incidents WHERE ${idColumn} = $1
    `, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return await buildIncidentFromRow(client, row);
  } finally {
    client.release();
  }
}

export async function getIncidents(filters: IncidentFilters = {}): Promise<Incident[]> {
  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Type filter
    if (filters.type) {
      conditions.push(`incident_type = $${paramIndex++}`);
      params.push(filters.type);
    } else if (filters.types?.length) {
      conditions.push(`incident_type = ANY($${paramIndex++})`);
      params.push(filters.types);
    }

    // Agency filter
    if (filters.agency) {
      conditions.push(`EXISTS (SELECT 1 FROM incident_agencies WHERE incident_id = incidents.id AND agency = $${paramIndex++})`);
      params.push(filters.agency);
    } else if (filters.agencies?.length) {
      conditions.push(`EXISTS (SELECT 1 FROM incident_agencies WHERE incident_id = incidents.id AND agency = ANY($${paramIndex++}))`);
      params.push(filters.agencies);
    }

    // Violation filter
    if (filters.violation) {
      conditions.push(`EXISTS (SELECT 1 FROM incident_violations WHERE incident_id = incidents.id AND violation_type = $${paramIndex++})`);
      params.push(filters.violation);
    } else if (filters.violations?.length) {
      conditions.push(`EXISTS (SELECT 1 FROM incident_violations WHERE incident_id = incidents.id AND violation_type = ANY($${paramIndex++}))`);
      params.push(filters.violations);
    }

    // Location filters
    if (filters.state) {
      conditions.push(`state = $${paramIndex++}`);
      params.push(filters.state);
    }
    if (filters.city) {
      conditions.push(`city ILIKE $${paramIndex++}`);
      params.push(`%${filters.city}%`);
    }

    // Date filters
    if (filters.year) {
      conditions.push(`EXTRACT(YEAR FROM incident_date) = $${paramIndex++}`);
      params.push(filters.year);
    }
    if (filters.year_start) {
      conditions.push(`EXTRACT(YEAR FROM incident_date) >= $${paramIndex++}`);
      params.push(filters.year_start);
    }
    if (filters.year_end) {
      conditions.push(`EXTRACT(YEAR FROM incident_date) <= $${paramIndex++}`);
      params.push(filters.year_end);
    }

    // Verified filter
    if (filters.verified !== undefined) {
      conditions.push(`verified = $${paramIndex++}`);
      params.push(filters.verified);
    }

    // Search filter
    if (filters.search) {
      conditions.push(`(
        summary ILIKE $${paramIndex} OR
        subject_name ILIKE $${paramIndex} OR
        city ILIKE $${paramIndex} OR
        facility ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortColumn = filters.sort_by || 'incident_date';
    const sortOrder = filters.sort_order || 'DESC';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const query = `
      SELECT * FROM incidents
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await client.query(query, params);
    const incidents: Incident[] = [];

    for (const row of result.rows) {
      incidents.push(await buildIncidentFromRow(client, row));
    }

    return incidents;
  } finally {
    client.release();
  }
}

export async function getIncidentStats(): Promise<IncidentStats> {
  const client = await pool.connect();
  try {
    const totalResult = await client.query('SELECT COUNT(*) as count FROM incidents');
    const verifiedResult = await client.query('SELECT COUNT(*) as count FROM incidents WHERE verified = true');
    
    const byTypeResult = await client.query(`
      SELECT incident_type, COUNT(*) as count FROM incidents GROUP BY incident_type
    `);
    
    const byAgencyResult = await client.query(`
      SELECT agency, COUNT(*) as count FROM incident_agencies GROUP BY agency
    `);
    
    const byStateResult = await client.query(`
      SELECT state, COUNT(*) as count FROM incidents WHERE state IS NOT NULL GROUP BY state
    `);
    
    const byYearResult = await client.query(`
      SELECT EXTRACT(YEAR FROM incident_date)::int as year, COUNT(*) as count 
      FROM incidents WHERE incident_date IS NOT NULL 
      GROUP BY year ORDER BY year
    `);

    return {
      total_incidents: parseInt(totalResult.rows[0].count),
      verified_count: parseInt(verifiedResult.rows[0].count),
      unverified_count: parseInt(totalResult.rows[0].count) - parseInt(verifiedResult.rows[0].count),
      by_type: Object.fromEntries(byTypeResult.rows.map((r: { incident_type: string; count: string }) => [r.incident_type, parseInt(r.count)])) as Record<IncidentType, number>,
      by_agency: Object.fromEntries(byAgencyResult.rows.map((r: { agency: string; count: string }) => [r.agency, parseInt(r.count)])) as Record<AgencyType, number>,
      by_state: Object.fromEntries(byStateResult.rows.map((r: { state: string; count: string }) => [r.state, parseInt(r.count)])),
      by_year: Object.fromEntries(byYearResult.rows.map((r: { year: number; count: string }) => [r.year, parseInt(r.count)])),
    };
  } finally {
    client.release();
  }
}

// ============================================
// UPDATE
// ============================================

export async function updateIncident(id: number, updates: Partial<Incident>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Build update query dynamically
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, unknown> = {
      incident_type: updates.incident_type,
      incident_date: updates.date,
      date_precision: updates.date_precision,
      incident_date_end: updates.date_end,
      city: updates.location?.city,
      state: updates.location?.state,
      country: updates.location?.country,
      facility: updates.location?.facility,
      address: updates.location?.address,
      subject_name: updates.subject?.name,
      subject_name_public: updates.subject?.name_public,
      subject_age: updates.subject?.age,
      subject_gender: updates.subject?.gender,
      subject_nationality: updates.subject?.nationality,
      subject_immigration_status: updates.subject?.immigration_status,
      subject_occupation: updates.subject?.occupation,
      summary: updates.summary,
      verified: updates.verified,
      verification_notes: updates.verification_notes,
      tags: updates.tags,
    };

    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      await client.query(`
        UPDATE incidents SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
      `, params);
    }

    // Update agencies if provided
    if (updates.agencies_involved) {
      await client.query('DELETE FROM incident_agencies WHERE incident_id = $1', [id]);
      for (const agency of updates.agencies_involved) {
        await client.query(`
          INSERT INTO incident_agencies (incident_id, agency) VALUES ($1, $2)
        `, [id, agency]);
      }
    }

    // Update violations if provided
    if (updates.violations_alleged) {
      await client.query('DELETE FROM incident_violations WHERE incident_id = $1', [id]);
      for (const violation of updates.violations_alleged) {
        await client.query(`
          INSERT INTO incident_violations (incident_id, violation_type) VALUES ($1, $2)
        `, [id, violation]);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// DELETE
// ============================================

export async function deleteIncident(id: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM incidents WHERE id = $1', [id]);
  } finally {
    client.release();
  }
}

// ============================================
// SOURCES
// ============================================

export async function addIncidentSource(incidentId: number, source: Omit<IncidentSource, 'id'>): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO incident_sources (incident_id, url, title, publication, author, published_date, archived_url, source_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      incidentId,
      source.url,
      source.title,
      source.publication || null,
      source.author || null,
      source.published_date || null,
      source.archived_url || null,
      source.source_type || 'news_article',
    ]);
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function getIncidentSources(incidentId: number): Promise<IncidentSource[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM incident_sources WHERE incident_id = $1 ORDER BY published_date DESC
    `, [incidentId]);
    return result.rows.map(formatSource);
  } finally {
    client.release();
  }
}

// ============================================
// QUOTES
// ============================================

export async function addIncidentQuote(incidentId: number, quote: Omit<IncidentQuote, 'id'>): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO incident_quotes (incident_id, source_id, quote_text, category, page_number, paragraph_number, confidence, verified, verified_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      incidentId,
      quote.source_id || null,
      quote.text,
      quote.category || 'context',
      quote.page_number || null,
      quote.paragraph_number || null,
      quote.confidence || null,
      quote.verified ?? false,
      quote.verified_by || null,
    ]);
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function getIncidentQuotes(incidentId: number): Promise<IncidentQuote[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT q.*, s.url as source_url, s.title as source_title, s.publication as source_publication
      FROM incident_quotes q
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE q.incident_id = $1
      ORDER BY q.created_at
    `, [incidentId]);
    return result.rows.map(formatQuote);
  } finally {
    client.release();
  }
}

export async function updateQuoteVerification(quoteId: number, verified: boolean, verifiedBy?: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE incident_quotes SET verified = $2, verified_by = $3, verified_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [quoteId, verified, verifiedBy || null]);
  } finally {
    client.release();
  }
}

// ============================================
// TIMELINE
// ============================================

export async function addTimelineEntry(incidentId: number, entry: Omit<TimelineEntry, 'id'>): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO incident_timeline (incident_id, event_date, event_time, description, source_id, quote_id, sequence_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      incidentId,
      entry.date || null,
      entry.time || null,
      entry.description,
      entry.source_id || null,
      entry.quote_id || null,
      entry.sequence_order || null,
    ]);
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function getIncidentTimeline(incidentId: number): Promise<TimelineEntry[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM incident_timeline WHERE incident_id = $1 ORDER BY COALESCE(sequence_order, 0), event_date
    `, [incidentId]);
    return result.rows.map(formatTimelineEntry);
  } finally {
    client.release();
  }
}

// ============================================
// HELPERS
// ============================================

async function buildIncidentFromRow(client: ReturnType<typeof pool.connect> extends Promise<infer T> ? T : never, row: Record<string, unknown>): Promise<Incident> {
  const id = row.id as number;

  // Get agencies
  const agenciesResult = await client.query(`
    SELECT agency FROM incident_agencies WHERE incident_id = $1
  `, [id]);

  // Get violations
  const violationsResult = await client.query(`
    SELECT violation_type FROM incident_violations WHERE incident_id = $1
  `, [id]);

  // Get details
  const detailsResult = await client.query(`
    SELECT detail_type, details FROM incident_details WHERE incident_id = $1
  `, [id]);

  // Get sources
  const sources = await getIncidentSources(id);

  // Get quotes
  const quotes = await getIncidentQuotes(id);

  // Get timeline
  const timeline = await getIncidentTimeline(id);

  const incident: Incident = {
    id,
    incident_id: row.incident_id as string,
    incident_type: row.incident_type as IncidentType,
    date: row.incident_date ? formatDate(row.incident_date) : '',
    date_precision: (row.date_precision as Incident['date_precision']) || 'exact',
    date_end: row.incident_date_end ? formatDate(row.incident_date_end) : undefined,
    location: {
      city: row.city as string | undefined,
      state: row.state as string | undefined,
      country: (row.country as string) || 'USA',
      facility: row.facility as string | undefined,
      address: row.address as string | undefined,
      coordinates: row.latitude && row.longitude ? {
        latitude: parseFloat(row.latitude as string),
        longitude: parseFloat(row.longitude as string),
      } : undefined,
    },
    subject: {
      name: row.subject_name as string | undefined,
      name_public: (row.subject_name_public as boolean) ?? false,
      age: row.subject_age as number | undefined,
      gender: row.subject_gender as string | undefined,
      nationality: row.subject_nationality as string | undefined,
      immigration_status: row.subject_immigration_status as string | undefined,
      occupation: row.subject_occupation as string | undefined,
      years_in_us: row.subject_years_in_us as number | undefined,
      family_in_us: row.subject_family_in_us as string | undefined,
    },
    summary: (row.summary as string) || '',
    agencies_involved: agenciesResult.rows.map((r: { agency: string }) => r.agency as AgencyType),
    violations_alleged: violationsResult.rows.map((r: { violation_type: string }) => r.violation_type as ViolationType),
    outcome: row.outcome_status ? {
      status: row.outcome_status as Outcome['status'],
      legal_action: row.outcome_legal_action as string | undefined,
      settlement_amount: row.outcome_settlement as string | undefined,
      policy_change: row.outcome_policy_change as string | undefined,
      criminal_charges: row.outcome_criminal_charges as string | undefined,
      internal_investigation: row.outcome_internal_investigation as string | undefined,
      media_coverage_level: row.outcome_media_coverage as Outcome['media_coverage_level'],
    } : undefined,
    verified: (row.verified as boolean) ?? false,
    verification_notes: row.verification_notes as string | undefined,
    tags: row.tags as string[] | undefined,
    created_at: row.created_at ? formatDate(row.created_at) : undefined,
    updated_at: row.updated_at ? formatDate(row.updated_at) : undefined,
    created_by: row.created_by as string | undefined,
    sources,
    quotes,
    timeline,
  };

  // Add type-specific details
  for (const detail of detailsResult.rows) {
    const detailType = detail.detail_type as string;
    const details = detail.details;
    
    switch (detailType) {
      case 'death':
        incident.death_details = details as unknown as DeathDetails;
        break;
      case 'injury':
        incident.injury_details = details as unknown as InjuryDetails;
        break;
      case 'arrest':
        incident.arrest_details = details as unknown as ArrestDetails;
        break;
      case 'rights_violation':
        incident.violation_details = details as unknown as RightsViolationDetails;
        break;
      case 'deportation':
        incident.deportation_details = details as unknown as DeportationDetails;
        break;
      case 'family_separation':
        incident.family_separation_details = details as unknown as FamilySeparationDetails;
        break;
      case 'workplace_raid':
        incident.workplace_raid_details = details as unknown as WorkplaceRaidDetails;
        break;
    }
  }

  return incident;
}

function formatDate(date: unknown): string {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return String(date);
}

function formatSource(row: Record<string, unknown>): IncidentSource {
  return {
    id: row.id as number,
    url: row.url as string,
    title: row.title as string,
    publication: row.publication as string | undefined,
    author: row.author as string | undefined,
    published_date: row.published_date ? formatDate(row.published_date) : undefined,
    accessed_at: row.accessed_at ? formatDate(row.accessed_at) : undefined,
    archived_url: row.archived_url as string | undefined,
    source_type: (row.source_type as IncidentSource['source_type']) || 'news_article',
  };
}

function formatQuote(row: Record<string, unknown>): IncidentQuote {
  return {
    id: row.id as number,
    text: row.quote_text as string,
    category: (row.category as IncidentQuote['category']) || 'context',
    source_id: row.source_id as number | undefined,
    source: row.source_id ? {
      id: row.source_id as number,
      url: row.source_url as string,
      title: row.source_title as string,
      publication: row.source_publication as string | undefined,
      source_type: 'news_article',
    } : undefined,
    page_number: row.page_number as number | undefined,
    paragraph_number: row.paragraph_number as number | undefined,
    confidence: row.confidence ? parseFloat(row.confidence as string) : undefined,
    verified: (row.verified as boolean) ?? false,
    verified_by: row.verified_by as string | undefined,
    verified_at: row.verified_at ? formatDate(row.verified_at) : undefined,
  };
}

function formatTimelineEntry(row: Record<string, unknown>): TimelineEntry {
  return {
    id: row.id as number,
    date: row.event_date ? formatDate(row.event_date) : undefined,
    time: row.event_time as string | undefined,
    description: row.description as string,
    source_id: row.source_id as number | undefined,
    quote_id: row.quote_id as number | undefined,
    sequence_order: row.sequence_order as number | undefined,
  };
}
