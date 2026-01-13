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
    
    console.log('[validate GET] Starting for incident:', incidentId);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }
    
    // Require analyst or admin role
    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      console.log('[validate GET] Auth failed:', authCheck.error);
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    console.log('[validate GET] Auth passed, fetching incident...');
    
    // Get incident details - use simpler query first
    let incident;
    try {
      const incidentResult = await pool.query(`
        SELECT i.*,
          u1.email as submitted_by_email,
          u2.email as first_verified_by_email,
          u3.email as second_verified_by_email
        FROM incidents i
        LEFT JOIN users u1 ON i.submitted_by = u1.id
        LEFT JOIN users u2 ON i.first_verified_by = u2.id
        LEFT JOIN users u3 ON i.second_verified_by = u3.id
        WHERE i.id = $1
      `, [incidentId]);
      
      console.log('[validate GET] Incident result rows:', incidentResult.rows.length);
      
      if (incidentResult.rows.length === 0) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
      
      incident = incidentResult.rows[0];
    } catch (e) {
      console.error('[validate GET] Error fetching incident:', e);
      throw e;
    }
    
    console.log('[validate GET] Incident status:', incident.verification_status);
    
    // Check if case is in validation-ready status
    if (!['second_review', 'first_validation'].includes(incident.verification_status)) {
      return NextResponse.json(
        { error: `Case is not ready for validation. Current status: ${incident.verification_status}` },
        { status: 400 }
      );
    }
    
    // Get quotes
    console.log('[validate GET] Fetching quotes...');
    let quotesRows: any[] = [];
    try {
      const quotesResult = await pool.query(`
        SELECT q.*, s.url as source_url, s.title as source_title, s.publication as source_publication
        FROM incident_quotes q
        LEFT JOIN incident_sources s ON q.source_id = s.id
        WHERE q.incident_id = $1
        ORDER BY q.created_at
      `, [incidentId]);
      quotesRows = quotesResult.rows;
    } catch (e) {
      console.error('[validate GET] Error fetching quotes:', e);
    }
    
    // Get sources
    console.log('[validate GET] Fetching sources...');
    let sourcesRows: any[] = [];
    try {
      const sourcesResult = await pool.query(`
        SELECT * FROM incident_sources
        WHERE incident_id = $1
        ORDER BY created_at
      `, [incidentId]);
      sourcesRows = sourcesResult.rows;
    } catch (e) {
      console.error('[validate GET] Error fetching sources:', e);
    }
    
    // Get timeline
    console.log('[validate GET] Fetching timeline...');
    let timelineRows: any[] = [];
    try {
      const timelineResult = await pool.query(`
        SELECT * FROM incident_timeline
        WHERE incident_id = $1
        ORDER BY event_date ASC NULLS LAST, created_at
      `, [incidentId]);
      timelineRows = timelineResult.rows;
    } catch (e) {
      console.error('[validate GET] Error fetching timeline:', e);
    }
    
    // Get media
    console.log('[validate GET] Fetching media...');
    let mediaRows: any[] = [];
    try {
      const mediaResult = await pool.query(`
        SELECT * FROM incident_media
        WHERE incident_id = $1
        ORDER BY created_at
      `, [incidentId]);
      mediaRows = mediaResult.rows;
    } catch (e) {
      console.error('[validate GET] Error fetching media:', e);
    }
    
    // Get quote-field links (may not exist in all setups)
    console.log('[validate GET] Fetching quote-field links...');
    let linksRows: any[] = [];
    try {
      const linksResult = await pool.query(`
        SELECT * FROM quote_field_links
        WHERE incident_id = $1
      `, [incidentId]);
      linksRows = linksResult.rows;
    } catch (e) {
      // Table may not exist
      console.log('[validate GET] quote_field_links table not available');
    }
    
    // Get previous validation issues (unresolved) - table may not exist
    console.log('[validate GET] Fetching validation issues...');
    let issuesRows: any[] = [];
    try {
      const issuesResult = await pool.query(`
        SELECT vi.*, u.email as created_by_email
        FROM validation_issues vi
        LEFT JOIN users u ON vi.created_by = u.id
        WHERE vi.incident_id = $1 AND vi.resolved_at IS NULL
        ORDER BY vi.created_at DESC
      `, [incidentId]);
      issuesRows = issuesResult.rows;
    } catch (e) {
      // Table may not exist
      console.log('[validate GET] validation_issues table not available');
    }
    
    console.log('[validate GET] Returning response...');
    return NextResponse.json({
      incident,
      quotes: quotesRows,
      sources: sourcesRows,
      timeline: timelineRows,
      media: mediaRows,
      quote_field_links: linksRows,
      previous_issues: issuesRows
    });
    
  } catch (error) {
    console.error('Error fetching validation data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch validation data', details: errorMessage },
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
