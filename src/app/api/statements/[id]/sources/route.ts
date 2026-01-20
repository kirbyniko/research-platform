import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/statements/[id]/sources - Get all sources for a statement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid statement ID' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT 
        s.id,
        s.url,
        s.title,
        s.priority
      FROM statement_sources s
      WHERE s.statement_id = $1
      ORDER BY s.id`,
      [numericId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

// POST /api/statements/[id]/sources - Add a source
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid statement ID' }, { status: 400 });
    }

    const source = await request.json();
    
    if (!source.url) {
      return NextResponse.json({ error: 'Source URL is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO statement_sources (
        statement_id,
        url,
        title,
        priority
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, url, title, priority`,
      [
        numericId,
        source.url,
        source.title || null,
        source.priority || 'medium'
      ]
    );

    return NextResponse.json({ success: true, source: result.rows[0] });
  } catch (error) {
    console.error('Error adding source:', error);
    return NextResponse.json({ error: 'Failed to add source' }, { status: 500 });
  }
}

// DELETE /api/statements/[id]/sources - Delete a source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { source_id } = await request.json();
    
    if (!source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 });
    }

    await pool.query(
      'DELETE FROM statement_sources WHERE id = $1',
      [source_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
