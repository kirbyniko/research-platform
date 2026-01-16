import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

/**
 * POST /api/incidents/[id]/unpublish
 * Unpublish a verified case, sending it back to review
 * Admin only
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
    
    // Require admin role
    const authCheck = await requireServerAuth(request, 'admin');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const user = authCheck.user;
    
    const body = await request.json();
    const { reason } = body;
    
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason for unpublishing is required' },
        { status: 400 }
      );
    }
    
    // Get current case status
    const caseResult = await pool.query(
      'SELECT id, incident_id, verification_status, victim_name FROM incidents WHERE id = $1',
      [incidentId]
    );
    
    if (caseResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    
    const incident = caseResult.rows[0];
    
    // Only allow unpublishing verified cases
    if (incident.verification_status !== 'verified') {
      return NextResponse.json(
        { error: `Cannot unpublish case with status: ${incident.verification_status}. Only verified cases can be unpublished.` },
        { status: 400 }
      );
    }
    
    // Update incident status back to pending for review
    // Increment review_cycle to track that this is a returned case
    // Keep verification history but reset current status
    const updateResult = await pool.query(
      `UPDATE incidents 
       SET 
         verification_status = 'pending',
         review_cycle = COALESCE(review_cycle, 1) + 1,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [incidentId]
    );
    
    // Log the unpublish action (if table exists, otherwise skip gracefully)
    try {
      await pool.query(
        `INSERT INTO incident_audit_log 
         (incident_id, action, performed_by, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          incidentId,
          'unpublish',
          user.id,
          JSON.stringify({
            reason: reason.trim(),
            previous_status: 'verified',
            new_status: 'pending',
            unpublished_at: new Date().toISOString(),
            unpublished_by: user.email
          })
        ]
      );
    } catch (auditError) {
      console.log('Audit log note: could not create audit entry (table may not exist)', auditError);
      // Don't fail the unpublish if audit logging fails
    }
    
    return NextResponse.json({
      success: true,
      message: `Case "${incident.victim_name || incident.incident_id}" has been unpublished and returned to review queue`,
      incident: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error unpublishing incident:', error);
    return NextResponse.json(
      { error: 'Failed to unpublish incident' },
      { status: 500 }
    );
  }
}
