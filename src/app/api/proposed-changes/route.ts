import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// Fields that are related entities stored in separate tables, not columns in the main entity
const RELATED_ENTITY_FIELDS = [
  'quotes', 'sources', 'media', 'timeline', 'agencies', 'violations',
  'field_quote_map', 'verified_fields', 'verified_sources', 
  'verified_quotes', 'verified_timeline', 'verified_media'
];

// Fields to skip when comparing changes
const SKIP_FIELDS = [
  'id', 'created_at', 'updated_at', 'submitted_at', 'reviewed_at', 'validated_at',
  // victim_name is deprecated - subject_name is the canonical field
  // The review form displays subject_name but stores it confusingly, causing false positives
  'victim_name',
  // These don't exist in the DB as columns, so skip them in change detection
  ...RELATED_ENTITY_FIELDS
];

// Helper to check if two values are effectively equal (handling common edge cases)
function areValuesEffectivelyEqual(origVal: any, propVal: any): boolean {
  // Both null/undefined/empty
  if (origVal === null && propVal === null) return true;
  if (origVal === undefined && propVal === undefined) return true;
  if (origVal === null && propVal === '') return true;
  if (origVal === '' && propVal === null) return true;
  if (origVal === undefined && propVal === null) return true;
  if (origVal === null && propVal === undefined) return true;
  if (origVal === '' && propVal === undefined) return true;
  if (origVal === undefined && propVal === '') return true;
  
  // Empty arrays vs null
  if (origVal === null && Array.isArray(propVal) && propVal.length === 0) return true;
  if (Array.isArray(origVal) && origVal.length === 0 && propVal === null) return true;
  if (origVal === undefined && Array.isArray(propVal) && propVal.length === 0) return true;
  if (Array.isArray(origVal) && origVal.length === 0 && propVal === undefined) return true;
  
  // Both are arrays - compare sorted JSON
  if (Array.isArray(origVal) && Array.isArray(propVal)) {
    // For simple arrays (strings, numbers), sort before comparing
    const sortedOrig = [...origVal].sort();
    const sortedProp = [...propVal].sort();
    return JSON.stringify(sortedOrig) === JSON.stringify(sortedProp);
  }
  
  // Date comparison - handle different string formats
  // If both look like dates/timestamps, compare as dates
  if (typeof origVal === 'string' && typeof propVal === 'string') {
    // Check if they might be dates (ISO format or similar)
    const origDate = Date.parse(origVal);
    const propDate = Date.parse(propVal);
    if (!isNaN(origDate) && !isNaN(propDate)) {
      // Both are valid dates - compare by value
      return origDate === propDate;
    }
    // Just compare strings
    return origVal === propVal;
  }
  
  // Compare as JSON strings for other complex types
  return JSON.stringify(origVal) === JSON.stringify(propVal);
}

// Helper to detect which fields changed - ONLY compares fields that exist in original entity
function getChangedFields(original: any, proposed: any): string[] {
  const changed: string[] = [];
  
  // Only iterate over keys that exist in the ORIGINAL entity (the DB record)
  // This prevents false positives from proposed data having extra client-side fields
  for (const key of Object.keys(original)) {
    if (SKIP_FIELDS.includes(key)) continue;
    
    const origVal = original[key];
    const propVal = proposed[key];
    
    // Check if values are effectively equal (handling edge cases)
    if (!areValuesEffectivelyEqual(origVal, propVal)) {
      changed.push(key);
    }
  }
  
  return changed;;
}

// Normalize a quote for comparison - only compare meaningful fields
function normalizeQuote(q: any): any {
  return {
    id: q.id,
    quote_text: q.quote_text,
    category: q.category,
    source_id: q.source_id,
    linked_fields: q.linked_fields || [],
    verified: q.verified
  };
}

// Normalize a source for comparison - only compare meaningful fields
function normalizeSource(s: any): any {
  return {
    id: s.id,
    url: s.url,
    title: s.title,
    publication: s.publication,
    source_type: s.source_type
  };
}

// Helper to detect changes in related entities (quotes, sources, etc.)
function getRelatedEntityChanges(
  originalQuotes: any[], 
  originalSources: any[], 
  proposed: any
): string[] {
  const changes: string[] = [];
  
  // Check if quotes changed - compare normalized versions
  const proposedQuotes = proposed.quotes || [];
  const normalizedOriginalQuotes = originalQuotes.map(normalizeQuote);
  const normalizedProposedQuotes = proposedQuotes.map(normalizeQuote);
  
  // Compare counts and content
  if (normalizedOriginalQuotes.length !== normalizedProposedQuotes.length) {
    changes.push('quotes');
  } else if (JSON.stringify(normalizedOriginalQuotes) !== JSON.stringify(normalizedProposedQuotes)) {
    changes.push('quotes');
  }
  
  // Check if sources changed - compare normalized versions
  const proposedSources = proposed.sources || [];
  const normalizedOriginalSources = originalSources.map(normalizeSource);
  const normalizedProposedSources = proposedSources.map(normalizeSource);
  
  // Compare counts and content
  if (normalizedOriginalSources.length !== normalizedProposedSources.length) {
    changes.push('sources');
  } else if (JSON.stringify(normalizedOriginalSources) !== JSON.stringify(normalizedProposedSources)) {
    changes.push('sources');
  }
  
  return changes;
}

// GET /api/proposed-changes - List proposed changes
export async function GET(request: NextRequest) {
  try {
    // Require analyst access to view proposed changes
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: 'Analyst access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    let query = `
      SELECT pc.*
      FROM proposed_changes pc
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Filter by status
    const status = searchParams.get('status');
    if (status) {
      conditions.push(`pc.status = $${paramIndex++}`);
      params.push(status);
    }
    
    // Filter by entity type
    const entityType = searchParams.get('entity_type');
    if (entityType) {
      conditions.push(`pc.entity_type = $${paramIndex++}`);
      params.push(entityType);
    }
    
    // Filter by entity id
    const entityId = searchParams.get('entity_id');
    if (entityId) {
      conditions.push(`pc.entity_id = $${paramIndex++}`);
      params.push(parseInt(entityId));
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY pc.submitted_at DESC`;
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM proposed_changes pc`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    return NextResponse.json({
      proposals: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Error listing proposed changes:', error);
    return NextResponse.json(
      { error: 'Failed to list proposed changes' },
      { status: 500 }
    );
  }
}

// POST /api/proposed-changes - Create a new proposed change
export async function POST(request: NextRequest) {
  try {
    // Require analyst access to create proposed changes
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      console.error('[ProposedChanges] Auth failed:', authResult.error);
      return NextResponse.json(
        { error: 'Analyst access required', details: authResult.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entity_type, entity_id, proposed_data, change_summary, submitted_by } = body;
    
    console.log('[ProposedChanges] Request:', { entity_type, entity_id, has_proposed_data: !!proposed_data, change_summary });
    
    // Validate required fields
    if (!entity_type || !entity_id || !proposed_data) {
      console.error('[ProposedChanges] Missing fields:', { entity_type: !!entity_type, entity_id: !!entity_id, proposed_data: !!proposed_data });
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, entity_id, proposed_data' },
        { status: 400 }
      );
    }
    
    // Validate entity type
    if (!['incident', 'statement'].includes(entity_type)) {
      return NextResponse.json(
        { error: 'Invalid entity_type. Must be "incident" or "statement"' },
        { status: 400 }
      );
    }
    
    // Fetch the original record to compare
    let originalQuery: string;
    if (entity_type === 'incident') {
      originalQuery = `SELECT * FROM incidents WHERE id = $1`;
    } else {
      originalQuery = `SELECT * FROM statements WHERE id = $1`;
    }
    
    const originalResult = await pool.query(originalQuery, [entity_id]);
    
    if (originalResult.rows.length === 0) {
      console.error('[ProposedChanges] Entity not found:', { entity_type, entity_id });
      return NextResponse.json(
        { error: `${entity_type} with id ${entity_id} not found` },
        { status: 404 }
      );
    }
    
    const original = originalResult.rows[0];
    console.log('[ProposedChanges] Original record keys:', Object.keys(original).slice(0, 10).join(', '));
    
    // Fetch original quotes and sources for proper comparison
    let originalQuotes: any[] = [];
    let originalSources: any[] = [];
    
    if (entity_type === 'incident') {
      const quotesResult = await pool.query(
        `SELECT * FROM incident_quotes WHERE incident_id = $1 ORDER BY id`,
        [entity_id]
      );
      originalQuotes = quotesResult.rows;
      
      const sourcesResult = await pool.query(
        `SELECT * FROM incident_sources WHERE incident_id = $1 ORDER BY id`,
        [entity_id]
      );
      originalSources = sourcesResult.rows;
    } else {
      const quotesResult = await pool.query(
        `SELECT * FROM statement_quotes WHERE statement_id = $1 ORDER BY id`,
        [entity_id]
      );
      originalQuotes = quotesResult.rows;
      
      const sourcesResult = await pool.query(
        `SELECT * FROM statement_sources WHERE statement_id = $1 ORDER BY id`,
        [entity_id]
      );
      originalSources = sourcesResult.rows;
    }
    
    // Detect changed fields in main entity
    const changed_fields = getChangedFields(original, proposed_data);
    console.log('[ProposedChanges] Main entity changed fields:', changed_fields);
    
    // Detect changed related entities (quotes, sources)
    const relatedChanges = getRelatedEntityChanges(originalQuotes, originalSources, proposed_data);
    console.log('[ProposedChanges] Related entity changes:', relatedChanges);
    
    // Combine all changes
    const all_changed_fields = [...changed_fields, ...relatedChanges];
    console.log('[ProposedChanges] All changed fields:', all_changed_fields);
    
    if (all_changed_fields.length === 0) {
      return NextResponse.json(
        { error: 'No changes detected. Proposed data is identical to original.' },
        { status: 400 }
      );
    }
    
    // Create the proposal
    const insertResult = await pool.query(
      `INSERT INTO proposed_changes 
        (entity_type, entity_id, proposed_data, changed_fields, change_summary, submitted_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending_review')
       RETURNING *`,
      [
        entity_type,
        entity_id,
        JSON.stringify(proposed_data),
        all_changed_fields,
        change_summary || null,
        submitted_by || authResult.user?.email || null
      ]
    );
    
    return NextResponse.json({
      message: 'Proposed change created successfully',
      proposal: insertResult.rows[0],
      changed_fields: all_changed_fields
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating proposed change:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to create proposed change', details: errorMessage },
      { status: 500 }
    );
  }
}
