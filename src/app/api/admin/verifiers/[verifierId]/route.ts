import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ verifierId: string }>;
}

// PATCH /api/admin/verifiers/[verifierId] - Update verifier
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { verifierId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { specialties, maxConcurrent, notes } = body;
    
    // Check if user exists and is a verifier
    const userCheck = await pool.query(
      'SELECT id, is_verifier FROM users WHERE id = $1', 
      [verifierId]
    );
    
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!userCheck.rows[0].is_verifier) {
      return NextResponse.json({ error: 'User is not a verifier' }, { status: 400 });
    }
    
    // Update verifier settings
    await pool.query(`
      UPDATE users 
      SET 
        verifier_specialty = COALESCE($2, verifier_specialty),
        verifier_max_concurrent = COALESCE($3, verifier_max_concurrent),
        verifier_notes = $4
      WHERE id = $1
    `, [verifierId, specialties, maxConcurrent, notes]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating verifier:', error);
    return NextResponse.json({ error: 'Failed to update verifier' }, { status: 500 });
  }
}

// DELETE /api/admin/verifiers/[verifierId] - Remove verifier access
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { verifierId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    
    // Check if verifier has active assignments
    const activeCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM verification_requests 
      WHERE assigned_to = $1 AND status IN ('pending', 'in_progress')
    `, [verifierId]);
    
    if (parseInt(activeCheck.rows[0].count) > 0) {
      return NextResponse.json({ 
        error: 'Cannot remove verifier with active assignments. Reassign or complete their requests first.' 
      }, { status: 400 });
    }
    
    // Remove verifier access (but keep stats for history)
    await pool.query(`
      UPDATE users 
      SET 
        is_verifier = false,
        verifier_specialty = NULL,
        verifier_max_concurrent = 5,
        verifier_notes = NULL
      WHERE id = $1
    `, [verifierId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing verifier:', error);
    return NextResponse.json({ error: 'Failed to remove verifier' }, { status: 500 });
  }
}
