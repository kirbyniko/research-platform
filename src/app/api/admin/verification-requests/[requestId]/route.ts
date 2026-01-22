import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

// GET /api/admin/verification-requests/[requestId]
// Get details of a specific verification request
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    
    // Get request with full details
    const result = await pool.query(`
      SELECT 
        vr.*,
        r.data as record_data,
        r.status as record_status,
        r.verified_fields,
        rt.name as record_type_name,
        rt.slug as record_type_slug,
        p.name as project_name,
        p.slug as project_slug,
        u.email as requested_by_email,
        u.name as requested_by_name
      FROM verification_requests vr
      JOIN records r ON vr.record_id = r.id
      JOIN record_types rt ON r.record_type_id = rt.id
      JOIN projects p ON vr.project_id = p.id
      LEFT JOIN users u ON vr.requested_by = u.id
      WHERE vr.id = $1
    `, [requestId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }
    
    const verificationRequest = result.rows[0];
    
    // Get quotes for the record
    const quotesResult = await pool.query(
      `SELECT * FROM record_quotes WHERE record_id = $1 ORDER BY id`,
      [verificationRequest.record_id]
    );
    
    // Get sources for the record
    const sourcesResult = await pool.query(
      `SELECT * FROM record_sources WHERE record_id = $1 ORDER BY id`,
      [verificationRequest.record_id]
    );
    
    // Get field definitions for context
    const fieldsResult = await pool.query(
      `SELECT * FROM field_definitions WHERE record_type_id = $1 ORDER BY sort_order`,
      [verificationRequest.record_type_id]
    );
    
    // Get existing verification results for this request
    const resultsResult = await pool.query(
      `SELECT * FROM verification_results WHERE request_id = $1`,
      [requestId]
    );
    
    return NextResponse.json({
      request: verificationRequest,
      quotes: quotesResult.rows,
      sources: sourcesResult.rows,
      field_definitions: fieldsResult.rows,
      existing_results: resultsResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching verification request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification request' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/verification-requests/[requestId]
// Update verification request (assign, start, complete, reject)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    // Get current request
    const requestResult = await pool.query(
      `SELECT * FROM verification_requests WHERE id = $1`,
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }
    
    const verificationRequest = requestResult.rows[0];
    
    switch (action) {
      case 'assign': {
        // Assign to current admin
        await pool.query(
          `UPDATE verification_requests 
           SET assigned_to = $1, assigned_at = NOW(), status = 'in_progress'
           WHERE id = $2`,
          [user.id, requestId]
        );
        
        return NextResponse.json({ success: true, message: 'Request assigned' });
      }
      
      case 'unassign': {
        await pool.query(
          `UPDATE verification_requests 
           SET assigned_to = NULL, assigned_at = NULL, status = 'pending'
           WHERE id = $1`,
          [requestId]
        );
        
        return NextResponse.json({ success: true, message: 'Request unassigned' });
      }
      
      case 'complete': {
        const { 
          verification_result,  // 'passed', 'failed', 'partial'
          verifier_notes,       // Notes for the user (always allowed)
          issues_found,         // Array of issues
          results               // Array of individual verification results
        } = body;
        
        if (!verification_result || !['passed', 'failed', 'partial'].includes(verification_result)) {
          return NextResponse.json(
            { error: 'Valid verification_result required (passed, failed, partial)' },
            { status: 400 }
          );
        }
        
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          // Update request status
          await client.query(
            `UPDATE verification_requests 
             SET 
               status = 'completed',
               completed_at = NOW(),
               verification_result = $1,
               verifier_notes = $2,
               issues_found = $3
             WHERE id = $4`,
            [
              verification_result,
              verifier_notes,
              issues_found ? JSON.stringify(issues_found) : null,
              requestId
            ]
          );
          
          // Insert individual verification results
          if (results && Array.isArray(results)) {
            for (const result of results) {
              await client.query(
                `INSERT INTO verification_results (
                  request_id, item_type, item_id, field_slug,
                  verified, verified_by, notes, caveats, issues
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  requestId,
                  result.item_type,
                  result.item_id || null,
                  result.field_slug || null,
                  result.verified,
                  user.id,
                  result.notes || null,
                  result.caveats || null,
                  result.issues || null
                ]
              );
            }
          }
          
          // If passed, update record verification level
          if (verification_result === 'passed') {
            // Calculate and store hash for record-level verification
            if (verificationRequest.verification_scope === 'record') {
              const hashResult = await client.query(
                `SELECT calculate_record_data_hash($1) as hash`,
                [verificationRequest.record_id]
              );
              
              await client.query(
                `UPDATE records 
                 SET 
                   verification_level = 3,
                   verification_scope = 'record',
                   verification_date = NOW(),
                   verified_data_hash = $1
                 WHERE id = $2`,
                [hashResult.rows[0].hash, verificationRequest.record_id]
              );
            } else {
              // Data-level verification
              await client.query(
                `UPDATE records 
                 SET 
                   verification_level = 3,
                   verification_scope = 'data',
                   verification_date = NOW()
                 WHERE id = $1`,
                [verificationRequest.record_id]
              );
            }
          }
          
          // Log to verification history
          await client.query(
            `INSERT INTO verification_history (record_id, action, details, performed_by)
             VALUES ($1, $2, $3, $4)`,
            [
              verificationRequest.record_id,
              verification_result === 'passed' ? 'verified' : 
              verification_result === 'failed' ? 'verification_rejected' : 'partial_verification',
              JSON.stringify({
                request_id: requestId,
                result: verification_result,
                notes: verifier_notes,
                scope: verificationRequest.verification_scope
              }),
              user.id
            ]
          );
          
          await client.query('COMMIT');
          
          return NextResponse.json({
            success: true,
            message: `Verification ${verification_result}`,
            verification_result
          });
          
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      
      case 'reject': {
        const { rejection_reason, verifier_notes } = body;
        
        if (!rejection_reason) {
          return NextResponse.json(
            { error: 'rejection_reason is required' },
            { status: 400 }
          );
        }
        
        await pool.query(
          `UPDATE verification_requests 
           SET 
             status = 'rejected',
             completed_at = NOW(),
             verification_result = 'failed',
             rejection_reason = $1,
             verifier_notes = $2
           WHERE id = $3`,
          [rejection_reason, verifier_notes, requestId]
        );
        
        // Log to verification history
        await pool.query(
          `INSERT INTO verification_history (record_id, action, details, performed_by)
           VALUES ($1, 'verification_rejected', $2, $3)`,
          [
            verificationRequest.record_id,
            JSON.stringify({
              request_id: requestId,
              rejection_reason,
              notes: verifier_notes
            }),
            user.id
          ]
        );
        
        return NextResponse.json({
          success: true,
          message: 'Verification request rejected'
        });
      }
      
      case 'needs_revision': {
        const { verifier_notes, issues_found } = body;
        
        await pool.query(
          `UPDATE verification_requests 
           SET 
             status = 'needs_revision',
             verifier_notes = $1,
             issues_found = $2
           WHERE id = $3`,
          [verifier_notes, issues_found ? JSON.stringify(issues_found) : null, requestId]
        );
        
        return NextResponse.json({
          success: true,
          message: 'Request marked as needing revision'
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: assign, unassign, complete, reject, needs_revision' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error updating verification request:', error);
    return NextResponse.json(
      { error: 'Failed to update verification request' },
      { status: 500 }
    );
  }
}
