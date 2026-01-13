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
  try {
    // Require analyst role
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const excludeId = searchParams.get('exclude');

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name parameter required (min 2 characters)' }, { status: 400 });
    }

    const normalizedName = name.toLowerCase().trim();
    
    // Skip generic names
    const genericNames = ['unknown', 'unnamed', 'n/a', 'na', 'none', 'anonymous', 'john doe', 'jane doe'];
    if (genericNames.includes(normalizedName)) {
      return NextResponse.json({ 
        cases: [],
        message: 'Generic name - search skipped' 
      });
    }

    const results: SearchResult[] = [];

    // 1. Search verified incidents
    const verifiedQuery = `
      SELECT 
        i.id,
        i.incident_id,
        COALESCE(i.victim_name, i.subject_name) as name,
        i.incident_type,
        i.incident_date,
        i.city,
        i.state,
        i.facility,
        i.summary,
        i.verified,
        i.verification_status,
        json_agg(
          json_build_object('id', s.id, 'url', s.url, 'title', s.title)
        ) FILTER (WHERE s.id IS NOT NULL) as sources
      FROM incidents i
      LEFT JOIN incident_sources s ON s.incident_id = i.id
      WHERE 
        i.deleted_at IS NULL
        AND (
          LOWER(i.victim_name) LIKE $1
          OR LOWER(i.subject_name) LIKE $1
          OR LOWER(i.victim_name) ILIKE $2
          OR LOWER(i.subject_name) ILIKE $2
        )
        ${excludeId ? 'AND i.id != $3' : ''}
      GROUP BY i.id
      ORDER BY 
        CASE WHEN LOWER(COALESCE(i.victim_name, i.subject_name)) = $4 THEN 0 ELSE 1 END,
        i.verified DESC,
        i.created_at DESC
      LIMIT 20
    `;

    const verifiedParams: (string | number)[] = [
      `%${normalizedName}%`,  // $1: Contains
      `${normalizedName.split(' ')[0]}%`,  // $2: Starts with first name
    ];
    if (excludeId) {
      verifiedParams.push(parseInt(excludeId));  // $3: Exclude ID
    }
    verifiedParams.push(normalizedName);  // $4: Exact match priority

    const verifiedResult = await pool.query(verifiedQuery, verifiedParams);

    for (const row of verifiedResult.rows) {
      let type: 'verified' | 'unverified' | 'in_review' = 'unverified';
      
      if (row.verified) {
        type = 'verified';
      } else if (row.verification_status === 'in_progress' || row.verification_status === 'pending_review') {
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

    // 2. Search guest submissions (pending and reviewed, exclude rejected/deleted)
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
        deleted_at IS NULL
        AND status NOT IN ('rejected')
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

    // Sort results: verified first, then in_review, then unverified, then guest_reports
    const typeOrder = { verified: 0, in_review: 1, unverified: 2, guest_report: 3 };
    results.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

    return NextResponse.json({
      cases: results,
      query: name,
      totalResults: results.length,
    });

  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json(
      { error: 'Failed to search for duplicates' },
      { status: 500 }
    );
  }
}
