import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

interface CreateQuoteRequest {
  quote_text: string;
  source?: string;
  source_url?: string;
  source_date?: string;
  source_type?: string;
  linked_fields?: string[];
}

// GET /api/projects/[slug]/records/[recordId]/quotes - List quotes
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
    
    // Get quotes
    const quotesResult = await pool.query(
      `SELECT rq.*, u.name as created_by_name
       FROM record_quotes rq
       LEFT JOIN users u ON rq.created_by = u.id
       WHERE rq.record_id = $1
       ORDER BY rq.created_at`,
      [parseInt(recordId)]
    );
    
    return NextResponse.json({ quotes: quotesResult.rows });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/records/[recordId]/quotes - Create quote
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
    
    const body: CreateQuoteRequest = await request.json();
    
    if (!body.quote_text || body.quote_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Quote text is required' },
        { status: 400 }
      );
    }
    
    // Create quote
    const result = await pool.query(
      `INSERT INTO record_quotes (
        record_id, project_id, quote_text, source, source_url,
        source_date, source_type, linked_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        parseInt(recordId),
        project.id,
        body.quote_text.trim(),
        body.source || null,
        body.source_url || null,
        body.source_date || null,
        body.source_type || null,
        body.linked_fields || [],
        userId
      ]
    );
    
    return NextResponse.json({ quote: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
