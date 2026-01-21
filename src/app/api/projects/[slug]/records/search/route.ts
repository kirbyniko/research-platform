import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;
    
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const recordType = url.searchParams.get('type');
    const excludeId = url.searchParams.get('exclude');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ records: [] });
    }
    
    // Get project and verify access
    const projectResult = await pool.query(
      `SELECT p.id FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE p.slug = $1 AND pm.user_id = $2`,
      [slug, user.id]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const projectId = projectResult.rows[0].id;
    
    // Search records by name (case-insensitive)
    // First try to find records where 'name' or 'victim_name' fields match
    let sqlQuery = `
      SELECT DISTINCT 
        r.id,
        r.name,
        r.status,
        r.created_at,
        rt.name as record_type,
        rt.slug as record_type_slug,
        r.data->>'incident_date' as incident_date,
        r.data->>'city' as city,
        r.data->>'state' as state
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.project_id = $1
        AND (
          r.name ILIKE $2
          OR r.data->>'name' ILIKE $2
          OR r.data->>'victim_name' ILIKE $2
          OR r.data->>'subject_name' ILIKE $2
        )
    `;
    
    const queryParams: (string | number)[] = [projectId, `%${query}%`];
    let paramIndex = 3;
    
    // Filter by record type if specified
    if (recordType) {
      sqlQuery += ` AND rt.slug = $${paramIndex}`;
      queryParams.push(recordType);
      paramIndex++;
    }
    
    // Exclude specific record ID
    if (excludeId) {
      sqlQuery += ` AND r.id != $${paramIndex}`;
      queryParams.push(parseInt(excludeId));
      paramIndex++;
    }
    
    // Order by relevance and date
    sqlQuery += `
      ORDER BY 
        CASE 
          WHEN r.name ILIKE $2 THEN 1
          WHEN r.data->>'name' ILIKE $2 THEN 2
          ELSE 3
        END,
        r.created_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(sqlQuery, queryParams);
    
    return NextResponse.json({
      records: result.rows.map((row: {
        id: number;
        name: string;
        status: string;
        record_type: string;
        record_type_slug: string;
        incident_date: string;
        city: string;
        state: string;
        created_at: string;
        data?: { name?: string };
      }) => ({
        id: row.id,
        name: row.name || row.data?.name || 'Unnamed Record',
        status: row.status,
        record_type: row.record_type,
        record_type_slug: row.record_type_slug,
        incident_date: row.incident_date,
        city: row.city,
        state: row.state,
        created_at: row.created_at
      }))
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search records' },
      { status: 500 }
    );
  }
}
