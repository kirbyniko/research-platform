import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/statements/[id]/quotes - Get all quotes for a statement
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
        q.id,
        q.text,
        q.source_url,
        q.source_title,
        q.verified,
        q.linked_fields
      FROM statement_quotes q
      WHERE q.statement_id = $1
      ORDER BY q.id`,
      [numericId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

// POST /api/statements/[id]/quotes - Add a quote
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

    const quote = await request.json();
    
    if (!quote.text) {
      return NextResponse.json({ error: 'Quote text is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO statement_quotes (
        statement_id,
        text,
        source_url,
        source_title,
        verified,
        linked_fields
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, text, source_url, source_title, verified, linked_fields`,
      [
        numericId,
        quote.text,
        quote.source_url || null,
        quote.source_title || null,
        quote.verified || false,
        quote.linked_fields || []
      ]
    );

    return NextResponse.json({ success: true, quote: result.rows[0] });
  } catch (error) {
    console.error('Error adding quote:', error);
    return NextResponse.json({ error: 'Failed to add quote' }, { status: 500 });
  }
}

// PUT /api/statements/[id]/quotes - Update a quote
export async function PUT(
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
    const { quote_id, text, source_url, source_title, linked_fields } = await request.json();
    
    if (!quote_id) {
      return NextResponse.json({ error: 'quote_id is required' }, { status: 400 });
    }

    await pool.query(
      `UPDATE statement_quotes
      SET text = COALESCE($1, text),
          source_url = COALESCE($2, source_url),
          source_title = COALESCE($3, source_title),
          linked_fields = COALESCE($4, linked_fields)
      WHERE id = $5 AND statement_id = $6`,
      [text, source_url, source_title, linked_fields, quote_id, numericId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

// DELETE /api/statements/[id]/quotes - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { quote_id } = await request.json();
    
    if (!quote_id) {
      return NextResponse.json({ error: 'quote_id is required' }, { status: 400 });
    }

    await pool.query(
      'DELETE FROM statement_quotes WHERE id = $1',
      [quote_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
  }
}
