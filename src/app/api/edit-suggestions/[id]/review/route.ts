import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// POST /api/edit-suggestions/[id]/review - Review an edit suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      console.error('[Review API] Auth failed:', authResult.error, authResult.status);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    const { id } = await params;
    const suggestionId = parseInt(id);
    
    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const { approved, notes, quote_id, new_quote_text, new_source_url, new_source_title } = await request.json();

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

      console.log('[Review API] Suggestion:', {
        id: suggestion.id,
        suggested_by: suggestion.suggested_by,
        first_reviewed_by: suggestion.first_reviewed_by,
        status: suggestion.status
      });
      console.log('[Review API] Current user ID:', user.id);

      // Check if user is the suggester (can't review own suggestion unless admin)
      if (suggestion.suggested_by === user.id && user.role !== 'admin') {
        console.log('[Review API] BLOCKED: User is the suggester');
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You cannot review your own suggestion' },
          { status: 403 }
        );
      }

      // Check if user already reviewed this (unless admin)
      if (suggestion.first_reviewed_by === user.id && user.role !== 'admin') {
        console.log('[Review API] BLOCKED: User already reviewed');
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
        const nextVerificationNumberResult = await client.query(
          'SELECT COALESCE(MAX(verification_number), 0) + 1 AS next_number FROM case_verifications WHERE case_id = $1',
          [suggestion.incident_id]
        );
        const nextVerificationNumber = nextVerificationNumberResult.rows[0].next_number;

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
           (case_id, verified_by, verification_number, verification_type, notes)
           VALUES ($1, $2, $3, 'edit_rejected', $4)`,
          [suggestion.incident_id, authResult.user.id, nextVerificationNumber, notes || `Rejected edit to ${suggestion.field_name}`]
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
          [user.id, notes || null, suggestionId]
        );

        // If admin, they can immediately do second approval
        if (user.role === 'admin') {
          await client.query('COMMIT');
          return NextResponse.json({
            message: 'First approval recorded. As admin, you can now provide second approval.',
            status: 'first_review',
            canDoSecondReview: true
          });
        }

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

        // Handle quote/source linking
        let finalQuoteId = quote_id as number | null;

        // If analyst provided new evidence in this review, create it
        if (!finalQuoteId && new_quote_text && new_source_url) {
          // Upsert source by URL
          let sourceId: number;
          const sourceCheck = await client.query(
            `SELECT id FROM incident_sources WHERE url = $1 AND incident_id = $2`,
            [new_source_url, suggestion.incident_id]
          );
          if (sourceCheck.rows.length > 0) {
            sourceId = sourceCheck.rows[0].id;
          } else {
            const sourceResult = await client.query(
              `INSERT INTO incident_sources (incident_id, url, title)
               VALUES ($1, $2, $3)
               RETURNING id`,
              [suggestion.incident_id, new_source_url, new_source_title || 'Analyst-provided source']
            );
            sourceId = sourceResult.rows[0].id;
          }
          const quoteResult = await client.query(
            `INSERT INTO incident_quotes (incident_id, source_id, quote_text, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id`,
            [suggestion.incident_id, sourceId, new_quote_text]
          );
          finalQuoteId = quoteResult.rows[0].id;
        }
        
        // If user provided supporting evidence with the suggestion, create/link it (only if we still need a quote)
        if (!finalQuoteId && suggestion.supporting_quote && suggestion.source_url) {
          // Check if source already exists
          let sourceId;
          const sourceCheck = await client.query(
            `SELECT id FROM incident_sources WHERE url = $1 AND incident_id = $2`,
            [suggestion.source_url, suggestion.incident_id]
          );
          
          if (sourceCheck.rows.length > 0) {
            sourceId = sourceCheck.rows[0].id;
          } else {
            // Create new source
            const sourceResult = await client.query(
              `INSERT INTO incident_sources (incident_id, url, title)
               VALUES ($1, $2, $3)
               RETURNING id`,
              [suggestion.incident_id, suggestion.source_url, suggestion.source_title || 'User-provided source']
            );
            sourceId = sourceResult.rows[0].id;
          }
          
          // Create the quote
          const quoteResult = await client.query(
            `INSERT INTO incident_quotes (incident_id, source_id, quote_text, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id`,
            [suggestion.incident_id, sourceId, suggestion.supporting_quote]
          );
          finalQuoteId = quoteResult.rows[0].id;
        }
        
        // Create quote-field link to maintain evidence chain
        if (finalQuoteId) {
          await client.query(
            `INSERT INTO quote_field_links (incident_id, quote_id, field_name, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (incident_id, quote_id, field_name) DO NOTHING`,
            [suggestion.incident_id, finalQuoteId, suggestion.field_name]
          );
        } else {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Evidence is required to approve an edit' }, { status: 400 });
        }

        // Record the verification
        const nextVerificationNumberResult = await client.query(
          'SELECT COALESCE(MAX(verification_number), 0) + 1 AS next_number FROM case_verifications WHERE case_id = $1',
          [suggestion.incident_id]
        );
        const nextVerificationNumber = nextVerificationNumberResult.rows[0].next_number;

        await client.query(
          `INSERT INTO case_verifications 
           (case_id, verified_by, verification_number, verification_type, notes)
           VALUES ($1, $2, $3, 'edit_approved', $4)`,
          [suggestion.incident_id, user.id, nextVerificationNumber, `Applied edit to ${suggestion.field_name} with quote evidence`]
        );

        await client.query('COMMIT');

        return NextResponse.json({
          message: 'Edit approved and applied to the case',
          status: 'approved',
          appliedEdit: {
            field: suggestion.field_name,
            oldValue: suggestion.current_value,
            newValue: suggestion.suggested_value,
            quoteLinked: true
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
