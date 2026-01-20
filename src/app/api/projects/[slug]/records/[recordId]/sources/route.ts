import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

interface CreateSourceRequest {
  url: string;
  title?: string;
  source_type?: string;
  accessed_date?: string;
  archived_url?: string;
  notes?: string;
  linked_fields?: string[];
}

// GET /api/projects/[slug]/records/[recordId]/sources - List sources
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Verify record exists
    const recordResult = await pool.query(
      'SELECT id FROM records WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL',
      [parseInt(recordId), project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    // Get sources
    const sourcesResult = await pool.query(
      `SELECT rs.*, u.name as created_by_name
       FROM record_sources rs
       LEFT JOIN users u ON rs.created_by = u.id
       WHERE rs.record_id = $1
       ORDER BY rs.created_at`,
      [parseInt(recordId)]
    );
    
    return NextResponse.json({ sources: sourcesResult.rows });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/records/[recordId]/sources - Create source
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify record exists
    const recordResult = await pool.query(
      'SELECT id FROM records WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL',
      [parseInt(recordId), project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const body: CreateSourceRequest = await request.json();
    
    if (!body.url || body.url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Basic URL validation
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Create source
    const result = await pool.query(
      `INSERT INTO record_sources (
        record_id, project_id, url, title, source_type,
        accessed_date, archived_url, notes, linked_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        parseInt(recordId),
        project.id,
        body.url.trim(),
        body.title || null,
        body.source_type || null,
        body.accessed_date || null,
        body.archived_url || null,
        body.notes || null,
        body.linked_fields || [],
        userId
      ]
    );
    
    return NextResponse.json({ source: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    );
  }
}
