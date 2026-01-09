import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import pool from '@/lib/db';

// POST /api/edit-suggestions/[id]/review - Review an edit suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require analyst role
    const authResult = await requireAuth('analyst')(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;
    const suggestionId = parseInt(id);
    
    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const { approved, notes } = await request.json();

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Approved status (boolean) is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current suggestion status
      const suggestionResult = await client.query(
        `SELECT es.*, i.victim_name as incident_victim_name
         FROM edit_suggestions es
         LEFT JOIN incidents i ON es.incident_id = i.id
         WHERE es.id = $1`,
        [suggestionId]
      );

      if (suggestionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
      }

      const suggestion = suggestionResult.rows[0];

      // Check if user is the suggester (can't review own suggestion)
      if (suggestion.suggested_by === authResult.user.id) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You cannot review your own suggestion' },
          { status: 403 }
        );
      }

      // Check if user already reviewed this
      if (suggestion.first_reviewed_by === authResult.user.id) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You have already reviewed this suggestion' },
          { status: 403 }
        );
      }

      if (suggestion.status === 'approved' || suggestion.status === 'rejected') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'This suggestion has already been finalized' },
          { status: 400 }
        );
      }

      // Handle rejection at any stage
      if (!approved) {
        await client.query(
          `UPDATE edit_suggestions 
           SET status = 'rejected',
               first_reviewed_by = COALESCE(first_reviewed_by, $1),
               first_reviewed_at = COALESCE(first_reviewed_at, NOW()),
               first_review_notes = COALESCE(first_review_notes, $2),
               first_review_decision = 'reject',
               updated_at = NOW()
           WHERE id = $3`,
          [authResult.user.id, notes || null, suggestionId]
        );

        // Record the verification
        await client.query(
          `INSERT INTO case_verifications 
           (case_id, verified_by, verification_type, notes)
           VALUES ($1, $2, 'edit_rejected', $3)`,
          [suggestion.incident_id, authResult.user.id, notes || `Rejected edit to ${suggestion.field_name}`]
        );

        await client.query('COMMIT');

        return NextResponse.json({
          message: 'Edit suggestion rejected',
          status: 'rejected'
        });
      }

      // Handle approval
      if (suggestion.status === 'pending') {
        // First review - move to first_review status
        await client.query(
          `UPDATE edit_suggestions 
           SET status = 'first_review',
               first_reviewed_by = $1,
               first_reviewed_at = NOW(),
               first_review_notes = $2,
               first_review_decision = 'approve',
               updated_at = NOW()
           WHERE id = $3`,
          [authResult.user.id, notes || null, suggestionId]
        );

        await client.query('COMMIT');

        return NextResponse.json({
          message: 'First approval recorded. Awaiting second analyst review.',
          status: 'first_review'
        });

      } else if (suggestion.status === 'first_review') {
        // Second review - apply the edit
        await client.query(
          `UPDATE edit_suggestions 
           SET status = 'approved',
               second_reviewed_by = $1,
               second_reviewed_at = NOW(),
               second_review_notes = $2,
               applied_at = NOW(),
               applied_by = $1,
               updated_at = NOW()
           WHERE id = $3`,
          [authResult.user.id, notes || null, suggestionId]
        );

        // Apply the edit to the incident
        // Use parameterized query for the value, but field name is validated
        const updateQuery = `UPDATE incidents SET ${suggestion.field_name} = $1, updated_at = NOW() WHERE id = $2`;
        await client.query(updateQuery, [suggestion.suggested_value, suggestion.incident_id]);

        // Record the verification
        await client.query(
          `INSERT INTO case_verifications 
           (case_id, verified_by, verification_type, notes)
           VALUES ($1, $2, 'edit_approved', $3)`,
          [suggestion.incident_id, authResult.user.id, `Applied edit to ${suggestion.field_name}`]
        );

        await client.query('COMMIT');

        return NextResponse.json({
          message: 'Edit approved and applied to the case',
          status: 'approved',
          appliedEdit: {
            field: suggestion.field_name,
            oldValue: suggestion.current_value,
            newValue: suggestion.suggested_value
          }
        });
      }

      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Invalid suggestion state' }, { status: 400 });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error reviewing edit suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to review edit suggestion' },
      { status: 500 }
    );
  }
}

// GET /api/edit-suggestions/[id]/review - Get suggestion details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const suggestionId = parseInt(id);
    
    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT 
        es.*,
        i.victim_name as incident_victim_name,
        i.incident_date as incident_date,
        u1.email as suggested_by_email,
        u1.name as suggested_by_name,
        u2.email as first_reviewed_by_email,
        u3.email as second_reviewed_by_email
       FROM edit_suggestions es
       LEFT JOIN incidents i ON es.incident_id = i.id
       LEFT JOIN users u1 ON es.suggested_by = u1.id
       LEFT JOIN users u2 ON es.first_reviewed_by = u2.id
       LEFT JOIN users u3 ON es.second_reviewed_by = u3.id
       WHERE es.id = $1`,
      [suggestionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    return NextResponse.json({ suggestion: result.rows[0] });

  } catch (error) {
    console.error('Error fetching edit suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edit suggestion' },
      { status: 500 }
    );
  }
}
