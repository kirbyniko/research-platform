import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

/**
 * GET /api/incidents/[id]/validate
 * Get case data for validation (read-only view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }
    
    // Require analyst or admin role
    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    // Get incident details
    const incidentResult = await pool.query(`
      SELECT i.*,
        u1.email as submitted_by_email,
        u2.email as first_verified_by_email,
        u3.email as second_verified_by_email,
        u4.email as first_validated_by_email,
        u5.email as second_validated_by_email
      FROM incidents i
      LEFT JOIN users u1 ON i.submitted_by = u1.id
      LEFT JOIN users u2 ON i.first_verified_by = u2.id
      LEFT JOIN users u3 ON i.second_verified_by = u3.id
      LEFT JOIN users u4 ON i.first_validated_by = u4.id
      LEFT JOIN users u5 ON i.second_validated_by = u5.id
      WHERE i.id = $1
    `, [incidentId]);
    
    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    
    const incident = incidentResult.rows[0];
    
    // Check if case is in validation-ready status
    if (!['second_review', 'first_validation'].includes(incident.verification_status)) {
      return NextResponse.json(
        { error: `Case is not ready for validation. Current status: ${incident.verification_status}` },
        { status: 400 }
      );
    }
    
    // Get quotes
    const quotesResult = await pool.query(`
      SELECT q.*, s.url as source_url, s.title as source_title, s.publication as source_publication
      FROM incident_quotes q
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE q.incident_id = $1
      ORDER BY q.created_at
    `, [incidentId]);
    
    // Get sources
    const sourcesResult = await pool.query(`
      SELECT * FROM incident_sources
      WHERE incident_id = $1
      ORDER BY priority ASC NULLS LAST, created_at
    `, [incidentId]);
    
    // Get timeline
    const timelineResult = await pool.query(`
      SELECT * FROM incident_timeline
      WHERE incident_id = $1
      ORDER BY event_date ASC NULLS LAST, created_at
    `, [incidentId]);
    
    // Get quote-field links
    const linksResult = await pool.query(`
      SELECT * FROM quote_field_links
      WHERE incident_id = $1
    `, [incidentId]);
    
    // Get previous validation issues (unresolved)
    const issuesResult = await pool.query(`
      SELECT vi.*, u.email as created_by_email
      FROM validation_issues vi
      LEFT JOIN users u ON vi.created_by = u.id
      WHERE vi.incident_id = $1 AND vi.resolved_at IS NULL
      ORDER BY vi.created_at DESC
    `, [incidentId]);
    
    return NextResponse.json({
      incident,
      quotes: quotesResult.rows,
      sources: sourcesResult.rows,
      timeline: timelineResult.rows,
      quote_field_links: linksResult.rows,
      previous_issues: issuesResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching validation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validation data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incidents/[id]/validate
 * Submit validation decision for a case
 * 
 * Actions:
 * - 'validate': All items verified, advance status
 * - 'return_to_review': Issues found, send back for review
 * - 'reject': Case is not publishable
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }
    
    // Require analyst or admin role
    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const user = authCheck.user;
    
    const body = await request.json();
    const { action, issues = [], rejection_reason } = body;
    
    if (!['validate', 'return_to_review', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: validate, return_to_review, or reject' },
        { status: 400 }
      );
    }
    
    // Get current case status
    const caseResult = await pool.query(
      `SELECT verification_status, first_validated_by, second_validated_by, submitted_by 
       FROM incidents WHERE id = $1`,
      [incidentId]
    );
    
    if (caseResult.rows.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    
    const currentCase = caseResult.rows[0];
    const currentStatus = currentCase.verification_status;
    
    // Only allow validation on cases that have completed review
    if (!['second_review', 'first_validation'].includes(currentStatus)) {
      return NextResponse.json(
        { error: `Cannot validate case with status '${currentStatus}'. Case must complete review first.` },
        { status: 400 }
      );
    }
    
    // Can't validate your own case
    if (currentCase.submitted_by === user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot validate your own submission' },
        { status: 403 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      if (action === 'validate') {
        // All items must be checked (issues array empty)
        if (issues.length > 0) {
          return NextResponse.json(
            { error: 'Cannot validate: there are unchecked items. All items must be verified to validate.' },
            { status: 400 }
          );
        }
        
        if (currentStatus === 'second_review') {
          // First validation
          await client.query(`
            UPDATE incidents 
            SET 
              verification_status = 'first_validation',
              first_validated_by = $1,
              first_validated_at = NOW(),
              updated_at = NOW()
            WHERE id = $2
          `, [user.id, incidentId]);
          
          await client.query('COMMIT');
          
          return NextResponse.json({
            success: true,
            message: 'First validation complete. Case requires one more validation.',
            verification_status: 'first_validation'
          });
          
        } else if (currentStatus === 'first_validation') {
          // Second validation - check if same person
          if (currentCase.first_validated_by === user.id && user.role !== 'admin') {
            return NextResponse.json(
              { error: 'Cannot provide both validations. A different analyst must validate.' },
              { status: 403 }
            );
          }
          
          // Publish the case
          await client.query(`
            UPDATE incidents 
            SET 
              verification_status = 'verified',
              verified = true,
              second_validated_by = $1,
              second_validated_at = NOW(),
              updated_at = NOW()
            WHERE id = $2
          `, [user.id, incidentId]);
          
          await client.query('COMMIT');
          
          return NextResponse.json({
            success: true,
            message: 'Second validation complete. Case is now published!',
            verification_status: 'verified'
          });
        }
        
      } else if (action === 'return_to_review') {
        // Must have at least one issue
        if (issues.length === 0) {
          return NextResponse.json(
            { error: 'At least one issue must be specified when returning to review' },
            { status: 400 }
          );
        }
        
        // Validate issues array
        for (const issue of issues) {
          if (!issue.field_type || !issue.field_name || !issue.reason) {
            return NextResponse.json(
              { error: 'Each issue must have field_type, field_name, and reason' },
              { status: 400 }
            );
          }
          if (!['field', 'quote', 'timeline', 'source'].includes(issue.field_type)) {
            return NextResponse.json(
              { error: 'field_type must be: field, quote, timeline, or source' },
              { status: 400 }
            );
          }
        }
        
        // Generate a session ID for this batch of issues
        const sessionResult = await client.query(
          'SELECT COALESCE(MAX(validation_session_id), 0) + 1 as next_session FROM validation_issues'
        );
        const sessionId = sessionResult.rows[0].next_session;
        
        // Insert all issues
        for (const issue of issues) {
          await client.query(`
            INSERT INTO validation_issues 
            (incident_id, validation_session_id, field_type, field_name, issue_reason, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [incidentId, sessionId, issue.field_type, issue.field_name, issue.reason, user.id]);
        }
        
        // Reset to first_review status (needs re-review to fix issues)
        // Increment review_cycle to track this is a returned case
        await client.query(`
          UPDATE incidents 
          SET 
            verification_status = 'first_review',
            first_validated_by = NULL,
            first_validated_at = NULL,
            second_validated_by = NULL,
            second_validated_at = NULL,
            review_cycle = COALESCE(review_cycle, 1) + 1,
            updated_at = NOW()
          WHERE id = $1
        `, [incidentId]);
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: `Case returned to review with ${issues.length} issue(s) to fix.`,
          verification_status: 'first_review',
          issues_count: issues.length
        });
        
      } else if (action === 'reject') {
        // Rejection reason required
        if (!rejection_reason?.trim()) {
          return NextResponse.json(
            { error: 'Rejection reason is required' },
            { status: 400 }
          );
        }
        
        await client.query(`
          UPDATE incidents 
          SET 
            verification_status = 'rejected',
            verified = false,
            rejection_reason = $1,
            rejected_by = $2,
            rejected_at = NOW(),
            updated_at = NOW()
          WHERE id = $3
        `, [rejection_reason, user.id, incidentId]);
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'Case has been rejected.',
          verification_status: 'rejected'
        });
      }
      
      // Shouldn't reach here
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error validating case:', error);
    return NextResponse.json({ error: 'Failed to validate case' }, { status: 500 });
  }
}

/**
 * GET /api/incidents/[id]/validate
 * Get case data for validation (read-only view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }
    
    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    // Get incident with all validation-related data
    const incidentResult = await pool.query(`
      SELECT 
        i.*,
        u1.name as submitter_name,
        u1.email as submitter_email,
        u2.name as first_reviewer_name,
        u2.email as first_reviewer_email,
        u3.name as second_reviewer_name,
        u3.email as second_reviewer_email,
        u4.name as first_validator_name,
        u4.email as first_validator_email,
        u5.name as rejector_name,
        u5.email as rejector_email
      FROM incidents i
      LEFT JOIN users u1 ON i.submitted_by = u1.id
      LEFT JOIN users u2 ON i.first_verified_by = u2.id
      LEFT JOIN users u3 ON i.second_verified_by = u3.id
      LEFT JOIN users u4 ON i.first_validated_by = u4.id
      LEFT JOIN users u5 ON i.rejected_by = u5.id
      WHERE i.id = $1
    `, [incidentId]);
    
    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    
    const incident = incidentResult.rows[0];
    
    // Get sources
    const sourcesResult = await pool.query(`
      SELECT * FROM incident_sources
      WHERE incident_id = $1
      ORDER BY id
    `, [incidentId]);
    
    // Get quotes with source info
    const quotesResult = await pool.query(`
      SELECT 
        q.*,
        s.title as source_title,
        s.publication as source_publication,
        s.url as source_url,
        COALESCE(
          (SELECT array_agg(qfl.field_name) FROM quote_field_links qfl WHERE qfl.quote_id = q.id),
          ARRAY[]::text[]
        ) as linked_fields
      FROM incident_quotes q
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE q.incident_id = $1
      ORDER BY q.id
    `, [incidentId]);
    
    // Get timeline with quote info
    const timelineResult = await pool.query(`
      SELECT 
        t.*,
        q.quote_text,
        q.source_id as quote_source_id,
        s.title as quote_source_title,
        s.url as quote_source_url
      FROM incident_timeline t
      LEFT JOIN incident_quotes q ON t.quote_id = q.id
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE t.incident_id = $1
      ORDER BY t.event_date, t.id
    `, [incidentId]);
    
    // Get type-specific details
    const detailsResult = await pool.query(`
      SELECT detail_type, details 
      FROM incident_details 
      WHERE incident_id = $1
    `, [incidentId]);
    
    // Get agencies
    const agenciesResult = await pool.query(`
      SELECT * FROM incident_agencies
      WHERE incident_id = $1
    `, [incidentId]);
    
    // Get violations
    const violationsResult = await pool.query(`
      SELECT * FROM incident_violations
      WHERE incident_id = $1
    `, [incidentId]);
    
    // Get unresolved validation issues (from previous return-to-review)
    const issuesResult = await pool.query(`
      SELECT 
        vi.*,
        u.name as created_by_name,
        u.email as created_by_email
      FROM validation_issues vi
      LEFT JOIN users u ON vi.created_by = u.id
      WHERE vi.incident_id = $1 AND vi.resolved_at IS NULL
      ORDER BY vi.created_at DESC
    `, [incidentId]);
    
    // Get quote-field links for field validation
    const quoteLinksResult = await pool.query(`
      SELECT qfl.*, q.quote_text, s.title as source_title, s.url as source_url
      FROM quote_field_links qfl
      LEFT JOIN incident_quotes q ON qfl.quote_id = q.id
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE qfl.incident_id = $1
    `, [incidentId]);
    
    return NextResponse.json({
      incident,
      sources: sourcesResult.rows,
      quotes: quotesResult.rows,
      timeline: timelineResult.rows,
      details: detailsResult.rows.reduce((acc, row) => {
        acc[row.detail_type] = row.details;
        return acc;
      }, {} as Record<string, unknown>),
      agencies: agenciesResult.rows,
      violations: violationsResult.rows,
      previous_issues: issuesResult.rows,
      quote_field_links: quoteLinksResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching case for validation:', error);
    return NextResponse.json({ error: 'Failed to fetch case' }, { status: 500 });
  }
}
