import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireServerAuth } from '@/lib/server-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface SearchResult {
  id: number;
  incident_id?: string;
  name: string;
  type: 'verified' | 'unverified' | 'in_review' | 'guest_report';
  incident_type?: string;
  incident_date?: string;
  city?: string;
  state?: string;
  facility?: string;
  sources?: { id: number; url: string; title?: string }[];
  summary?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const excludeId = searchParams.get('exclude');
  
  console.log('[duplicate-check] START - name:', name, 'excludeId:', excludeId);
  
  try {
    // Require analyst role
    console.log('[duplicate-check] Checking auth...');
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      console.log('[duplicate-check] Auth failed:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    console.log('[duplicate-check] Auth passed');

    // Test database connectivity
    try {
      console.log('[duplicate-check] Testing database connection...');
      await pool.query('SELECT 1');
      console.log('[duplicate-check] Database connection OK');
    } catch (dbError: any) {
      console.error('[duplicate-check] Database connection FAILED:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: dbError.message },
        { status: 500 }
      );
    }

    if (!name || name.trim().length < 2) {
      console.log('[duplicate-check] Name validation failed');
      return NextResponse.json({ error: 'Name parameter required (min 2 characters)' }, { status: 400 });
    }

    const normalizedName = name.toLowerCase().trim();
    console.log('[duplicate-check] Normalized name:', normalizedName);
    
    const includeGeneric = searchParams.get('includeGeneric') === 'true';
    
    // Skip generic names unless explicitly requested
    const genericNames = ['unknown', 'unnamed', 'n/a', 'na', 'none', 'anonymous'];
    if (!includeGeneric && genericNames.includes(normalizedName)) {
      console.log('[duplicate-check] Generic name skipped');
      return NextResponse.json({ 
        cases: [],
        message: 'Generic name - search skipped. Use includeGeneric=true to search anyway.' 
      });
    }

    const results: SearchResult[] = [];
    console.log('[duplicate-check] Starting incident search...');

    // 1. Search incidents - use simple COALESCE for compatibility
    const searchPattern = `%${normalizedName}%`;
    const firstNamePattern = `${normalizedName.split(' ')[0]}%`;
    
    let incidentQuery: string;
    let incidentParams: (string | number)[];
    
    if (excludeId) {
      incidentQuery = `
        SELECT 
          i.id,
          i.incident_id,
          COALESCE(i.victim_name, i.subject_name, 'Unknown') as name,
          i.incident_type,
          i.incident_date,
          i.city,
          i.state,
          i.facility,
          i.summary,
          i.verified,
          COALESCE(i.verification_status, 'unknown') as verification_status,
          json_agg(
            json_build_object('id', s.id, 'url', s.url, 'title', s.title)
          ) FILTER (WHERE s.id IS NOT NULL) as sources
        FROM incidents i
        LEFT JOIN incident_sources s ON s.incident_id = i.id
        WHERE 
          i.id != $1
          AND (
            LOWER(COALESCE(i.victim_name, '')) LIKE $2
            OR LOWER(COALESCE(i.subject_name, '')) LIKE $2
            OR LOWER(COALESCE(i.victim_name, '')) LIKE $3
            OR LOWER(COALESCE(i.subject_name, '')) LIKE $3
          )
        GROUP BY i.id
        ORDER BY 
          CASE WHEN LOWER(COALESCE(i.victim_name, i.subject_name, '')) = $4 THEN 0 ELSE 1 END,
          i.verified DESC,
          i.created_at DESC
        LIMIT 20
      `;
      incidentParams = [parseInt(excludeId), searchPattern, firstNamePattern, normalizedName];
    } else {
      incidentQuery = `
        SELECT 
          i.id,
          i.incident_id,
          COALESCE(i.victim_name, i.subject_name, 'Unknown') as name,
          i.incident_type,
          i.incident_date,
          i.city,
          i.state,
          i.facility,
          i.summary,
          i.verified,
          COALESCE(i.verification_status, 'unknown') as verification_status,
          json_agg(
            json_build_object('id', s.id, 'url', s.url, 'title', s.title)
          ) FILTER (WHERE s.id IS NOT NULL) as sources
        FROM incidents i
        LEFT JOIN incident_sources s ON s.incident_id = i.id
        WHERE 
          (
            LOWER(COALESCE(i.victim_name, '')) LIKE $1
            OR LOWER(COALESCE(i.subject_name, '')) LIKE $1
            OR LOWER(COALESCE(i.victim_name, '')) LIKE $2
            OR LOWER(COALESCE(i.subject_name, '')) LIKE $2
          )
        GROUP BY i.id
        ORDER BY 
          CASE WHEN LOWER(COALESCE(i.victim_name, i.subject_name, '')) = $3 THEN 0 ELSE 1 END,
          i.verified DESC,
          i.created_at DESC
        LIMIT 20
      `;
      incidentParams = [searchPattern, firstNamePattern, normalizedName];
    }

    console.log('[duplicate-check] Building query with params:', { searchPattern, firstNamePattern, excludeId });
    
    let incidentResult;
    try {
      console.log('[duplicate-check] Executing incident query...');
      incidentResult = await pool.query(incidentQuery, incidentParams);
      console.log('[duplicate-check] Incident query returned', incidentResult.rows.length, 'rows');
    } catch (queryError: any) {
      console.error('[duplicate-check] Incident query FAILED:', queryError);
      console.error('[duplicate-check] Query params:', incidentParams);
      console.error('[duplicate-check] Error details:', {
        message: queryError.message,
        code: queryError.code,
        detail: queryError.detail,
        hint: queryError.hint
      });
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    for (const row of incidentResult.rows) {
      let type: 'verified' | 'unverified' | 'in_review' = 'unverified';
      
      if (row.verified) {
        type = 'verified';
      } else if (row.verification_status && ['pending', 'first_review', 'first_validation'].includes(row.verification_status)) {
        type = 'in_review';
      }

      results.push({
        id: row.id,
        incident_id: row.incident_id,
        name: row.name || 'Unknown',
        type,
        incident_type: row.incident_type,
        incident_date: row.incident_date,
        city: row.city,
        state: row.state,
        facility: row.facility,
        summary: row.summary,
        sources: row.sources || [],
      });
    }

    console.log('[duplicate-check] Processed', results.length, 'incident results');

    // 2. Search guest submissions (pending and reviewed, exclude rejected/deleted)
    console.log('[duplicate-check] Starting guest submissions search...');
    
    // Check if deleted_at column exists
    const guestColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guest_submissions' 
      AND column_name = 'deleted_at'
    `);
    const hasDeletedAt = guestColumnCheck.rows.length > 0;
    console.log('[duplicate-check] Guest submissions has deleted_at column:', hasDeletedAt);
    
    try {
      const guestQuery = `
        SELECT 
          id,
          submission_data->>'victimName' as name,
          submission_data->>'incidentType' as incident_type,
          submission_data->>'dateOfDeath' as incident_date,
          submission_data->>'city' as city,
          submission_data->>'state' as state,
          submission_data->>'facility' as facility,
          submission_data->>'description' as summary,
          submission_data->'sourceUrls' as source_urls,
          status
        FROM guest_submissions
        WHERE 
          ${hasDeletedAt ? 'deleted_at IS NULL AND ' : ''}status NOT IN ('rejected')
          AND (
            LOWER(submission_data->>'victimName') LIKE $1
            OR LOWER(submission_data->>'victimName') ILIKE $2
          )
        ORDER BY 
          CASE WHEN LOWER(submission_data->>'victimName') = $3 THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT 10
      `;

      const guestResult = await pool.query(guestQuery, [
        `%${normalizedName}%`,
        `${normalizedName.split(' ')[0]}%`,
        normalizedName
      ]);
      
      console.log('[duplicate-check] Guest query returned', guestResult.rows.length, 'rows');

      for (const row of guestResult.rows) {
        // Parse source URLs if they exist
        let sources: { id: number; url: string; title?: string }[] = [];
        if (row.source_urls) {
          try {
            const urls = typeof row.source_urls === 'string' 
              ? JSON.parse(row.source_urls) 
              : row.source_urls;
            
            sources = (Array.isArray(urls) ? urls : []).map((s: any, idx: number) => ({
              id: idx,
              url: typeof s === 'string' ? s : s.url,
              title: typeof s === 'object' ? s.title : undefined,
            }));
          } catch (e) {
            // Ignore parsing errors
          }
        }

        results.push({
          id: row.id,
          name: row.name || 'Unknown',
          type: 'guest_report',
          incident_type: row.incident_type,
          incident_date: row.incident_date,
          city: row.city,
          state: row.state,
          facility: row.facility,
          summary: row.summary,
          sources,
          status: row.status,
        });
      }
    } catch (guestError: any) {
      console.error('[duplicate-check] Guest submissions query error (non-fatal):', guestError);
      console.error('[duplicate-check] Error details:', {
        message: guestError.message,
        code: guestError.code
      });
      // Continue without guest submissions if there's an error
    }

    console.log('[duplicate-check] Total results:', results.length);

    // Sort results: verified first, then in_review, then unverified, then guest_reports
    const typeOrder = { verified: 0, in_review: 1, unverified: 2, guest_report: 3 };
    results.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

    console.log('[duplicate-check] SUCCESS - returning', results.length, 'cases');
    return NextResponse.json({
      cases: results,
      query: name,
      totalResults: results.length,
    });

  } catch (error: any) {
    console.error('[duplicate-check] TOP-LEVEL ERROR:', error);
    console.error('[duplicate-check] Error stack:', error.stack);
    console.error('[duplicate-check] Search params - name:', name, 'excludeId:', excludeId);
    
    return NextResponse.json(
      { 
        error: 'Failed to search for duplicates', 
        details: error.message,
        type: error.constructor.name,
        // Include more debug info in non-production
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}
