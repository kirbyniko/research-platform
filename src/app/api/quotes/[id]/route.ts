import { NextRequest, NextResponse } from 'next/server';
import { requireDescopeAuth } from '@/lib/descope-auth';
import { requireAuth } from '@/lib/auth';
import pool from '@/lib/db';

export const runtime = 'nodejs';

// PATCH: Update quote status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Auth check
    const descopeAuthFn = await requireDescopeAuth('editor');
    const descopeResult = await descopeAuthFn(request);
    let userId: number | null = null;
    
    if ('error' in descopeResult) {
      const legacyAuthFn = requireAuth('editor');
      const legacyResult = await legacyAuthFn(request);
      if ('error' in legacyResult) {
        return NextResponse.json({ error: legacyResult.error }, { status: legacyResult.status });
      }
      userId = legacyResult.user?.id || null;
    } else {
      userId = descopeResult.user?.id || null;
    }

    const body = await request.json();
    const { status, rejectionReason, edits } = body;

    // Validate status
    const validStatuses = ['pending', 'verified', 'rejected', 'edited'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get current quote for feedback logging
    const currentQuote = await pool.query(
      'SELECT * FROM extracted_quotes WHERE id = $1',
      [id]
    );

    if (currentQuote.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quote = currentQuote.rows[0];

    // Update quote
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      
      if (status === 'verified' || status === 'rejected') {
        updates.push(`verified_by = $${paramIndex++}`);
        values.push(userId);
        updates.push(`verified_at = NOW()`);
      }
    }

    if (rejectionReason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex++}`);
      values.push(rejectionReason);
    }

    if (edits) {
      // Handle edits to quote text, date, or category
      if (edits.quote_text) {
        updates.push(`original_quote = quote_text`);
        updates.push(`original_char_start = char_start`);
        updates.push(`original_char_end = char_end`);
        updates.push(`quote_text = $${paramIndex++}`);
        values.push(edits.quote_text);
      }
      if (edits.char_start !== undefined) {
        updates.push(`char_start = $${paramIndex++}`);
        values.push(edits.char_start);
      }
      if (edits.char_end !== undefined) {
        updates.push(`char_end = $${paramIndex++}`);
        values.push(edits.char_end);
      }
      if (edits.event_date) {
        updates.push(`event_date = $${paramIndex++}`);
        values.push(edits.event_date);
      }
      if (edits.category) {
        updates.push(`category = $${paramIndex++}`);
        values.push(edits.category);
      }
      if (edits.edit_reason) {
        updates.push(`edit_reason = $${paramIndex++}`);
        values.push(edits.edit_reason);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE extracted_quotes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);

    // Log feedback for learning system
    try {
      await pool.query(`
        INSERT INTO verification_feedback (
          quote_id, document_id, ai_category, ai_date, ai_confidence,
          human_action, rejection_reason, quote_text, user_id,
          edit_category_changed, edit_date_changed, edit_quote_expanded, edit_quote_trimmed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        id,
        quote.document_id,
        quote.category,
        quote.event_date,
        quote.confidence_score,
        status === 'verified' ? 'accepted' : status,
        rejectionReason || null,
        quote.quote_text,
        userId,
        edits?.category && edits.category !== quote.category,
        edits?.event_date && edits.event_date !== quote.event_date,
        edits?.char_start !== undefined && edits.char_start < quote.char_start,
        edits?.char_end !== undefined && edits.char_end > quote.char_end
      ]);
    } catch (feedbackError) {
      console.error('Failed to log feedback:', feedbackError);
      // Don't fail the request if feedback logging fails
    }

    return NextResponse.json({
      success: true,
      quote: result.rows[0]
    });

  } catch (error) {
    console.error('[quotes] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update quote', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET: Get single quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await pool.query(
      'SELECT * FROM extracted_quotes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      quote: result.rows[0]
    });

  } catch (error) {
    console.error('[quotes] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}

// DELETE: Remove quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Auth check
    const descopeAuthFn = await requireDescopeAuth('editor');
    const descopeResult = await descopeAuthFn(request);
    if ('error' in descopeResult) {
      const legacyAuthFn = requireAuth('editor');
      const legacyResult = await legacyAuthFn(request);
      if ('error' in legacyResult) {
        return NextResponse.json({ error: legacyResult.error }, { status: legacyResult.status });
      }
    }

    await pool.query('DELETE FROM extracted_quotes WHERE id = $1', [id]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[quotes] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}
