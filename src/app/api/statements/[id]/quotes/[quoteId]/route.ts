import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// PATCH /api/statements/[id]/quotes/[quoteId] - Update quote verification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id, quoteId } = await params;
    const statementId = parseInt(id);
    const quoteIdNum = parseInt(quoteId);
    
    if (isNaN(statementId) || isNaN(quoteIdNum)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const body = await request.json();
    
    if (body.verified !== undefined) {
      await pool.query(
        `UPDATE statement_quotes
        SET verified = $1
        WHERE id = $2 AND statement_id = $3`,
        [body.verified, quoteIdNum, statementId]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'verified field is required' }, { status: 400 });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

// DELETE /api/statements/[id]/quotes/[quoteId] - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id, quoteId } = await params;
    const statementId = parseInt(id);
    const quoteIdNum = parseInt(quoteId);
    
    if (isNaN(statementId) || isNaN(quoteIdNum)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    await pool.query(
      'DELETE FROM statement_quotes WHERE id = $1 AND statement_id = $2',
      [quoteIdNum, statementId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
  }
}
