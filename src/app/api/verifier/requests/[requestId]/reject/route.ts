import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

// POST /api/verifier/requests/[requestId]/reject - Reject verification request
export async function POST(
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
    
    // Check if user is a verifier
    const verifierCheck = await pool.query(
      'SELECT is_verifier FROM users WHERE id = $1',
      [user.id]
    );
    
    if (!verifierCheck.rows[0]?.is_verifier) {
      return NextResponse.json({ error: 'Verifier access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { rejection_reason, verifier_notes } = body;
    
    if (!rejection_reason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
    }
    
    // Get request - must be assigned to this verifier
    const reqResult = await pool.query(`
      SELECT id, assigned_to, status
      FROM verification_requests
      WHERE id = $1 AND assigned_to = $2 AND status = 'in_progress'
    `, [requestId, user.id]);
    
    if (reqResult.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found or not assigned to you' }, { status: 404 });
    }
    
    // Update request
    await pool.query(`
      UPDATE verification_requests
      SET 
        status = 'rejected',
        completed_at = NOW(),
        rejection_reason = $2,
        verifier_notes = $3
      WHERE id = $1
    `, [requestId, rejection_reason, verifier_notes]);
    
    // Log to verification history
    await pool.query(`
      INSERT INTO verification_history (request_id, action, performed_by, details)
      VALUES ($1, 'rejected', $2, $3)
    `, [requestId, user.id, JSON.stringify({ reason: rejection_reason })]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting verification:', error);
    return NextResponse.json({ error: 'Failed to reject verification' }, { status: 500 });
  }
}
