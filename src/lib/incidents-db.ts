import pool from './db';
import type { PoolClient } from 'pg';
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

    // Handle incident_types array - use provided array or fall back to single type
    const incidentTypes: string[] = incident.incident_types?.length 
      ? incident.incident_types 
      : (incident.incident_type ? [incident.incident_type] : []);
    
    // Primary type for backward compatibility
    const primaryType = incidentTypes[0] || incident.incident_type || 'unknown';

    // Insert main incident
    const result = await client.query(`
      INSERT INTO incidents (
        incident_id, incident_type, incident_types, incident_date, date_precision, incident_date_end,
        city, state, country, facility, address, latitude, longitude,
        subject_name, subject_name_public, subject_age, subject_gender,
        subject_nationality, subject_immigration_status, subject_occupation,
        subject_years_in_us, subject_family_in_us,
        summary, verified, verification_notes, tags, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING id
    `, [
      incident.incident_id,
      primaryType,
      incidentTypes,
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

    // Insert type-specific details for EACH selected incident type
    const detailsMap: Record<string, unknown> = {
      death: incident.death_details,
      death_in_custody: incident.death_details,
      death_during_operation: incident.death_details,
      death_at_protest: incident.death_details,
      detention_death: incident.death_details,
      injury: incident.injury_details,
      arrest: incident.arrest_details,
      rights_violation: incident.violation_details,
      deportation: incident.deportation_details,
      family_separation: incident.family_separation_details,
      workplace_raid: incident.workplace_raid_details,
      shooting: incident.shooting_details,
      excessive_force: incident.excessive_force_details,
      protest_suppression: incident.protest_details,
      medical_neglect: incident.death_details, // Medical neglect uses death details
    };

    // Insert details for each incident type (multi-type support)
    for (const iType of incidentTypes) {
      const details = detailsMap[iType];
      if (details) {
        await client.query(`
          INSERT INTO incident_details (incident_id, detail_type, details)
          VALUES ($1, $2, $3)
          ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = $3
        `, [incidentId, iType, JSON.stringify(details)]);
      }
    }

    // Insert violation_details_map (case law per violation)
    if (incident.violation_details_map && Object.keys(incident.violation_details_map).length > 0) {
      await client.query(`
        INSERT INTO incident_details (incident_id, detail_type, details)
        VALUES ($1, 'violation_legal_basis', $2)
      `, [incidentId, JSON.stringify(incident.violation_details_map)]);
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

export async function getIncidentById(id: number | string, includeUnverified: boolean = false): Promise<Incident | null> {
  const client = await pool.connect();
  try {
    const idColumn = typeof id === 'number' ? 'id' : 'incident_id';
    // SECURITY: Only return publicly verified incidents by default (for public access)
    // includeUnverified allows analysts to see pending/first_review incidents
    const verifiedCondition = includeUnverified ? '' : "AND verification_status = 'verified'";
    const result = await client.query(`
      SELECT * FROM incidents WHERE ${idColumn} = $1 ${verifiedCondition}
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

    // SECURITY: Only show double-verified incidents by default (for public access)
    // Analysts can set includeUnverified=true to see all incidents
    if (!filters.includeUnverified) {
      conditions.push(`verification_status = 'verified'`);
    }

    // Legacy verified filter (for backward compatibility with boolean column)
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

export async function getIncidentStats(includeUnverified: boolean = false): Promise<IncidentStats> {
  const client = await pool.connect();
  try {
    // SECURITY: By default, only count double-verified incidents for public display
    const verifiedCondition = includeUnverified ? '' : "WHERE verification_status = 'verified'";
    const verifiedJoinCondition = includeUnverified ? '' : "AND i.verification_status = 'verified'";
    
    const totalResult = await client.query(`SELECT COUNT(*) as count FROM incidents ${verifiedCondition}`);
    const verifiedResult = await client.query(`SELECT COUNT(*) as count FROM incidents WHERE verification_status = 'verified'`);
    
    const byTypeResult = await client.query(`
      SELECT incident_type, COUNT(*) as count FROM incidents ${verifiedCondition} GROUP BY incident_type
    `);
    
    const byAgencyResult = await client.query(`
      SELECT agency, COUNT(*) as count FROM incident_agencies ia
      JOIN incidents i ON ia.incident_id = i.id ${verifiedJoinCondition ? 'WHERE 1=1 ' + verifiedJoinCondition : ''}
      GROUP BY agency
    `);
    
    const byStateResult = await client.query(`
      SELECT state, COUNT(*) as count FROM incidents 
      WHERE state IS NOT NULL ${includeUnverified ? '' : "AND verification_status = 'verified'"} 
      GROUP BY state
    `);
    
    const byYearResult = await client.query(`
      SELECT EXTRACT(YEAR FROM incident_date)::int as year, COUNT(*) as count 
      FROM incidents 
      WHERE incident_date IS NOT NULL ${includeUnverified ? '' : "AND verification_status = 'verified'"} 
      GROUP BY year ORDER BY year
    `);

    const allTotal = includeUnverified 
      ? parseInt(totalResult.rows[0].count)
      : parseInt(verifiedResult.rows[0].count);

    return {
      total_incidents: allTotal,
      verified_count: parseInt(verifiedResult.rows[0].count),
      unverified_count: includeUnverified ? allTotal - parseInt(verifiedResult.rows[0].count) : 0,
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
      verification_status: updates.verified ? 'verified' : undefined,
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
// TWO-ANALYST REVIEW WORKFLOW
// ============================================

export async function submitIncidentReview(
  incidentId: number,
  userId: number,
  userRole?: string
): Promise<{ success: boolean; verification_status?: string; message?: string; error?: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('[submitIncidentReview] Starting review for incident:', incidentId, 'user:', userId);
    
    // Get current incident status and check if it's from a guest submission
    const incidentResult = await client.query(`
      SELECT 
        i.verification_status, 
        i.first_verified_by, 
        i.verified,
        gs.id as guest_submission_id
      FROM incidents i
      LEFT JOIN guest_submissions gs ON gs.submission_data::jsonb->>'victimName' = i.victim_name 
        AND gs.status = 'reviewed'
        AND gs.created_at > (i.created_at - INTERVAL '1 day')
        AND gs.created_at < (i.created_at + INTERVAL '1 hour')
      WHERE i.id = $1
      LIMIT 1
    `, [incidentId]);
    
    console.log('[submitIncidentReview] Query result rows:', incidentResult.rows.length);
    
    if (incidentResult.rows.length === 0) {
      return { success: false, error: 'Incident not found' };
    }
    
    const incident = incidentResult.rows[0];
    const currentStatus = incident.verification_status;
    const firstVerifiedBy = incident.first_verified_by;
    const guestSubmissionId = incident.guest_submission_id;
    const isAdmin = userRole === 'admin';
    
    // Handle workflow based on current status
    // New simplified flow: pending → first_review → first_validation → verified
    // No more second_review step - after first_review, case goes directly to validation
    if (currentStatus === 'pending') {
      // First review - case goes directly to validation queue after this
      await client.query(`
        UPDATE incidents
        SET 
          verification_status = 'first_review',
          first_verified_by = $1,
          first_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [userId, incidentId]);
      
      // If this came from a guest submission, mark it as accepted
      if (guestSubmissionId) {
        await client.query(`
          UPDATE guest_submissions
          SET status = 'accepted', notes = 'Review completed'
          WHERE id = $1
        `, [guestSubmissionId]);
      }
      
      await client.query('COMMIT');
      return {
        success: true,
        verification_status: 'first_review',
        message: 'Review submitted successfully. Case is now in the validation queue.'
      };
      
    } else if (currentStatus === 'first_review') {
      // Case is already reviewed and in validation queue
      // If returned from validation, allow re-review
      await client.query(`
        UPDATE incidents
        SET 
          first_verified_by = $1,
          first_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [userId, incidentId]);
      
      await client.query('COMMIT');
      return {
        success: true,
        verification_status: 'first_review',
        message: 'Re-review submitted successfully. Case is in the validation queue.'
      };
      
    } else if (currentStatus === 'rejected') {
      // Case was rejected - re-review moves it back to first_review (validation queue)
      await client.query(`
        UPDATE incidents
        SET 
          verification_status = 'first_review',
          first_verified_by = $1,
          first_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [userId, incidentId]);
      
      await client.query('COMMIT');
      return {
        success: true,
        verification_status: 'first_review',
        message: 'Re-review submitted successfully. Case has been moved back to the validation queue.'
      };
      
    } else {
      // Already verified or other status - allow update
      await client.query(`
        UPDATE incidents
        SET 
          first_verified_by = $1,
          first_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [userId, incidentId]);
      
      await client.query('COMMIT');
      return {
        success: true,
        verification_status: currentStatus,
        message: 'Verification updated'
      };
    }
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
// MEDIA (Images/Videos)
// ============================================

export interface IncidentMedia {
  id?: number;
  incident_id?: number;
  url: string;
  media_type: 'image' | 'video';
  title?: string;
  description?: string;
  credit?: string;
  license?: string;
  source_url?: string;
  source_publication?: string;
  media_date?: string;
  verified?: boolean;
  verified_by?: number;
  is_primary?: boolean;
  display_order?: number;
}

export async function addIncidentMedia(incidentId: number, media: Omit<IncidentMedia, 'id' | 'incident_id'>): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO incident_media (
        incident_id, url, media_type, title, description, credit, license,
        source_url, source_publication, media_date, is_primary, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      incidentId,
      media.url,
      media.media_type,
      media.title || null,
      media.description || null,
      media.credit || null,
      media.license || null,
      media.source_url || null,
      media.source_publication || null,
      media.media_date || null,
      media.is_primary ?? false,
      media.display_order ?? 0,
    ]);
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function getIncidentMedia(incidentId: number): Promise<IncidentMedia[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM incident_media WHERE incident_id = $1 ORDER BY is_primary DESC, display_order ASC
    `, [incidentId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function updateIncidentMedia(mediaId: number, updates: Partial<IncidentMedia>): Promise<void> {
  const client = await pool.connect();
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, unknown> = {
      url: updates.url,
      media_type: updates.media_type,
      title: updates.title,
      description: updates.description,
      credit: updates.credit,
      license: updates.license,
      source_url: updates.source_url,
      source_publication: updates.source_publication,
      media_date: updates.media_date,
      is_primary: updates.is_primary,
      display_order: updates.display_order,
    };

    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(mediaId);
      await client.query(`
        UPDATE incident_media SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
      `, params);
    }
  } finally {
    client.release();
  }
}

export async function deleteIncidentMedia(mediaId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM incident_media WHERE id = $1', [mediaId]);
  } finally {
    client.release();
  }
}

// ============================================
// QUOTES
// ============================================

export async function addIncidentQuote(incidentId: number, quote: Omit<IncidentQuote, 'id'>): Promise<number> {
  // Validate: quotes must have text and source
  if (!quote.text || quote.text.trim() === '') {
    throw new Error('Quote text is required');
  }
  if (!quote.source_id) {
    throw new Error('Quote must be linked to a source (source_id required)');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
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
    
    const quoteId = result.rows[0].id;
    
    // Store linked fields if provided
    if (quote.linked_fields && quote.linked_fields.length > 0) {
      for (const fieldName of quote.linked_fields) {
        await client.query(`
          INSERT INTO quote_field_links (incident_id, quote_id, field_name)
          VALUES ($1, $2, $3)
          ON CONFLICT (incident_id, quote_id, field_name) DO NOTHING
        `, [incidentId, quoteId, fieldName]);
      }
    }
    
    await client.query('COMMIT');
    return quoteId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
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
      (entry as any).event_date || entry.date || null,
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
      SELECT 
        it.*,
        q.quote_text,
        q.source_id as quote_source_id,
        s.title as source_title,
        s.url as source_url
      FROM incident_timeline it
      LEFT JOIN incident_quotes q ON it.quote_id = q.id
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE it.incident_id = $1 
      ORDER BY COALESCE(it.sequence_order, 0), it.event_date
    `, [incidentId]);
    return result.rows.map(formatTimelineEntry);
  } finally {
    client.release();
  }
}

// Get field-quote mappings for an incident (which quotes support which fields)
export async function getIncidentFieldQuoteMappings(incidentId: number): Promise<Record<string, { quote_id: number; quote_text: string; source_id: number; source_title?: string; source_url?: string }[]>> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        qfl.field_name,
        qfl.quote_id,
        q.quote_text,
        q.source_id,
        s.title as source_title,
        s.url as source_url
      FROM quote_field_links qfl
      JOIN incident_quotes q ON qfl.quote_id = q.id
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE qfl.incident_id = $1
      ORDER BY qfl.field_name, qfl.quote_id
    `, [incidentId]);
    
    // Group by field_name
    const mappings: Record<string, { quote_id: number; quote_text: string; source_id: number; source_title?: string; source_url?: string }[]> = {};
    for (const row of result.rows) {
      const fieldName = row.field_name as string;
      if (!mappings[fieldName]) {
        mappings[fieldName] = [];
      }
      mappings[fieldName].push({
        quote_id: row.quote_id as number,
        quote_text: row.quote_text as string,
        source_id: row.source_id as number,
        source_title: row.source_title as string | undefined,
        source_url: row.source_url as string | undefined,
      });
    }
    // Keep victim_name and subject_name in sync for evidence lookups
    if (mappings.victim_name && !mappings.subject_name) {
      mappings.subject_name = mappings.victim_name;
    } else if (mappings.subject_name && !mappings.victim_name) {
      mappings.victim_name = mappings.subject_name;
    }
    return mappings;
  } finally {
    client.release();
  }
}

// ============================================
// HELPERS
// ============================================

async function buildIncidentFromRow(client: PoolClient, row: Record<string, unknown>): Promise<Incident> {
  const id = row.id as number;
  // Prioritize subject_name (correct format) over victim_name (legacy "Last, First" format)
  const subjectName = (row as any).subject_name as string | undefined;
  const victimName = (row as any).victim_name as string | undefined;
  const displayName = subjectName || victimName;

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

  // Get field-quote mappings
  const fieldQuoteMappings = await getIncidentFieldQuoteMappings(id);

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
      name: subjectName || displayName,
      name_public: (row.subject_name_public as boolean) ?? false,
      age: row.subject_age as number | undefined,
      gender: row.subject_gender as string | undefined,
      nationality: row.subject_nationality as string | undefined,
      immigration_status: row.subject_immigration_status as string | undefined,
      occupation: row.subject_occupation as string | undefined,
      years_in_us: row.subject_years_in_us as number | undefined,
      family_in_us: row.subject_family_in_us as string | undefined,
    },
    victim_name: displayName,
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
    verification_status: row.verification_status as 'verified' | 'pending' | 'first_review' | undefined,
    verification_notes: row.verification_notes as string | undefined,
    tags: row.tags as string[] | undefined,
    created_at: row.created_at ? formatDate(row.created_at) : undefined,
    updated_at: row.updated_at ? formatDate(row.updated_at) : undefined,
    created_by: row.created_by as string | undefined,
    sources,
    quotes,
    timeline,
    field_quote_map: fieldQuoteMappings,
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
      case 'shooting':
        incident.shooting_details = details as unknown as import('@/types/incident').ShootingDetails;
        break;
      case 'excessive_force':
        incident.excessive_force_details = details as unknown as import('@/types/incident').ExcessiveForceDetails;
        break;
      case 'protest_suppression':
      case 'protest':
        incident.protest_details = details as unknown as import('@/types/incident').ProtestDetails;
        break;
      case 'death_in_custody':
      case 'death_during_operation':
      case 'death_at_protest':
      case 'detention_death':
      case 'medical_neglect':
        incident.death_details = details as unknown as DeathDetails;
        break;
      case 'violation_legal_basis':
        incident.violation_details_map = details as unknown as Record<string, import('@/types/incident').ViolationBasis>;
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
  const entry: TimelineEntry = {
    id: row.id as number,
    date: row.event_date ? formatDate(row.event_date) : undefined,
    time: row.event_time as string | undefined,
    description: row.description as string,
    source_id: row.source_id as number | undefined,
    quote_id: row.quote_id as number | undefined,
    sequence_order: row.sequence_order as number | undefined,
  };
  
  // Add quote text and source info if available (from JOIN)
  if (row.quote_text) {
    entry.quote = {
      id: row.quote_id as number,
      quote_text: row.quote_text as string,
      source_id: row.quote_source_id as number | undefined,
      verified: false, // default, not from this query
      category: undefined,
    } as any; // Allow partial quote for display purposes
    
    if (row.source_title || row.source_url) {
      entry.source = {
        id: row.quote_source_id as number,
        title: row.source_title as string || '',
        url: row.source_url as string || '',
        source_type: 'news',
        source_priority: 'secondary',
      } as any; // Allow partial source for display purposes
    }
  }
  
  return entry;
}

// ============================================
// AGENCY CRUD
// ============================================

export async function addIncidentAgency(incidentId: number, agency: string, role?: string): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO incident_agencies (incident_id, agency, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (incident_id, agency) DO UPDATE SET role = EXCLUDED.role
      RETURNING id
    `, [incidentId, agency, role || null]);
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function updateIncidentAgency(agencyId: number, agency: string, role?: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE incident_agencies SET agency = $2, role = $3 WHERE id = $1
    `, [agencyId, agency, role || null]);
  } finally {
    client.release();
  }
}

export async function deleteIncidentAgency(agencyId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM incident_agencies WHERE id = $1`, [agencyId]);
  } finally {
    client.release();
  }
}

export async function getIncidentAgencies(incidentId: number): Promise<{ id: number; agency: string; role: string | null }[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, agency, role FROM incident_agencies WHERE incident_id = $1 ORDER BY agency
    `, [incidentId]);
    return result.rows;
  } finally {
    client.release();
  }
}

// ============================================
// VIOLATION CRUD
// ============================================

export async function addIncidentViolation(
  incidentId: number, 
  violationType: string, 
  description?: string, 
  constitutionalBasis?: string
): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO incident_violations (incident_id, violation_type, description, constitutional_basis)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (incident_id, violation_type) DO UPDATE 
        SET description = EXCLUDED.description, constitutional_basis = EXCLUDED.constitutional_basis
      RETURNING id
    `, [incidentId, violationType, description || null, constitutionalBasis || null]);
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function updateIncidentViolation(
  violationId: number, 
  violationType: string, 
  description?: string, 
  constitutionalBasis?: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE incident_violations 
      SET violation_type = $2, description = $3, constitutional_basis = $4 
      WHERE id = $1
    `, [violationId, violationType, description || null, constitutionalBasis || null]);
  } finally {
    client.release();
  }
}

export async function deleteIncidentViolation(violationId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM incident_violations WHERE id = $1`, [violationId]);
  } finally {
    client.release();
  }
}

export async function getIncidentViolations(incidentId: number): Promise<{ 
  id: number; 
  violation_type: string; 
  description: string | null;
  constitutional_basis: string | null;
}[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, violation_type, description, constitutional_basis 
      FROM incident_violations WHERE incident_id = $1 ORDER BY violation_type
    `, [incidentId]);
    return result.rows;
  } finally {
    client.release();
  }
}

// ============================================
// SOURCE CRUD (Enhanced)
// ============================================

export async function updateIncidentSource(sourceId: number, source: Partial<IncidentSource>): Promise<void> {
  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (source.url !== undefined) { fields.push(`url = $${paramIndex++}`); values.push(source.url); }
    if (source.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(source.title); }
    if (source.publication !== undefined) { fields.push(`publication = $${paramIndex++}`); values.push(source.publication); }
    if (source.author !== undefined) { fields.push(`author = $${paramIndex++}`); values.push(source.author); }
    if (source.published_date !== undefined) { fields.push(`published_date = $${paramIndex++}`); values.push(source.published_date); }
    if (source.archived_url !== undefined) { fields.push(`archived_url = $${paramIndex++}`); values.push(source.archived_url); }
    if (source.source_type !== undefined) { fields.push(`source_type = $${paramIndex++}`); values.push(source.source_type); }
    
    if (fields.length === 0) return;
    
    values.push(sourceId);
    await client.query(`UPDATE incident_sources SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  } finally {
    client.release();
  }
}

export async function deleteIncidentSource(sourceId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM incident_sources WHERE id = $1`, [sourceId]);
  } finally {
    client.release();
  }
}

// ============================================
// QUOTE CRUD (Enhanced)
// ============================================

export async function updateIncidentQuote(quoteId: number, quote: Partial<IncidentQuote>): Promise<void> {
  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (quote.text !== undefined) { fields.push(`quote_text = $${paramIndex++}`); values.push(quote.text); }
    if (quote.category !== undefined) { fields.push(`category = $${paramIndex++}`); values.push(quote.category); }
    if (quote.source_id !== undefined) { fields.push(`source_id = $${paramIndex++}`); values.push(quote.source_id); }
    if (quote.page_number !== undefined) { fields.push(`page_number = $${paramIndex++}`); values.push(quote.page_number); }
    if (quote.paragraph_number !== undefined) { fields.push(`paragraph_number = $${paramIndex++}`); values.push(quote.paragraph_number); }
    if (quote.confidence !== undefined) { fields.push(`confidence = $${paramIndex++}`); values.push(quote.confidence); }
    
    if (fields.length === 0) return;
    
    values.push(quoteId);
    await client.query(`UPDATE incident_quotes SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  } finally {
    client.release();
  }
}

export async function deleteIncidentQuote(quoteId: number): Promise<void> {
  const client = await pool.connect();
  try {
    // Also delete quote_field_links
    await client.query(`DELETE FROM quote_field_links WHERE quote_id = $1`, [quoteId]);
    await client.query(`DELETE FROM incident_quotes WHERE id = $1`, [quoteId]);
  } finally {
    client.release();
  }
}

export async function updateQuoteFieldLinks(quoteId: number, incidentId: number, fieldNames: string[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Remove existing links
    await client.query(`DELETE FROM quote_field_links WHERE quote_id = $1`, [quoteId]);
    // Add new links
    for (const fieldName of fieldNames) {
      await client.query(`
        INSERT INTO quote_field_links (incident_id, quote_id, field_name)
        VALUES ($1, $2, $3)
      `, [incidentId, quoteId, fieldName]);
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
// TIMELINE CRUD (Enhanced)
// ============================================

export async function updateTimelineEntry(entryId: number, entry: Partial<TimelineEntry>): Promise<void> {
  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (entry.date !== undefined) { fields.push(`event_date = $${paramIndex++}`); values.push(entry.date); }
    if (entry.time !== undefined) { fields.push(`event_time = $${paramIndex++}`); values.push(entry.time); }
    if (entry.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(entry.description); }
    if (entry.source_id !== undefined) { fields.push(`source_id = $${paramIndex++}`); values.push(entry.source_id); }
    if (entry.quote_id !== undefined) { fields.push(`quote_id = $${paramIndex++}`); values.push(entry.quote_id); }
    if (entry.sequence_order !== undefined) { fields.push(`sequence_order = $${paramIndex++}`); values.push(entry.sequence_order); }
    
    if (fields.length === 0) return;
    
    values.push(entryId);
    await client.query(`UPDATE incident_timeline SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  } finally {
    client.release();
  }
}

export async function deleteTimelineEntry(entryId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM incident_timeline WHERE id = $1`, [entryId]);
  } finally {
    client.release();
  }
}

// ============================================
// TYPE DETAILS CRUD
// ============================================

export async function updateIncidentDetails(incidentId: number, detailType: string, details: Record<string, unknown>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, $2, $3)
      ON CONFLICT (incident_id, detail_type) DO UPDATE SET details = EXCLUDED.details
    `, [incidentId, detailType, JSON.stringify(details)]);
  } finally {
    client.release();
  }
}
