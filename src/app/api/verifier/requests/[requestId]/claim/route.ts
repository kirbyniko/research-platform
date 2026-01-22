import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

// POST /api/verifier/requests/[requestId]/claim - Claim a verification request
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
    const verifierCheck = await pool.query(`
      SELECT 
        u.id,
        u.verifier_max_concurrent,
        COALESCE(vs.current_assigned, 0) as current_assigned
      FROM users u
      LEFT JOIN verifier_stats vs ON u.id = vs.user_id
      WHERE u.id = $1 AND u.is_verifier = true
    `, [user.id]);
    
    if (verifierCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Verifier access required' }, { status: 403 });
    }
    
    const verifier = verifierCheck.rows[0];
    
    // Check if at capacity
    if (verifier.current_assigned >= verifier.verifier_max_concurrent) {
      return NextResponse.json({ 
        error: 'You have reached your maximum concurrent assignments' 
      }, { status: 400 });
    }
    
    // Check if request exists and is available
    const requestCheck = await pool.query(`
      SELECT id, status, assigned_to 
      FROM verification_requests 
      WHERE id = $1
    `, [requestId]);
    
    if (requestCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const req = requestCheck.rows[0];
    
    if (req.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not available' }, { status: 400 });
    }
    
    if (req.assigned_to) {
      return NextResponse.json({ error: 'Request is already assigned' }, { status: 400 });
    }
    
    // Claim the request
    await pool.query(`
      UPDATE verification_requests
      SET 
        assigned_to = $2,
        assigned_at = NOW(),
        status = 'in_progress'
      WHERE id = $1
    `, [requestId, user.id]);
    
    // Log to verification history
    await pool.query(`
      INSERT INTO verification_history (request_id, action, performed_by, details)
      VALUES ($1, 'assigned', $2, $3)
    `, [requestId, user.id, JSON.stringify({ self_claimed: true })]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error claiming request:', error);
    return NextResponse.json({ error: 'Failed to claim request' }, { status: 500 });
  }
}
