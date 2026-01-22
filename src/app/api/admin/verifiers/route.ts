import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/admin/verifiers - List all verifiers
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    
    // Get all verifiers with their stats
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.is_verifier,
        u.verifier_since,
        u.verifier_specialty,
        u.verifier_max_concurrent,
        u.verifier_notes,
        COALESCE(vs.current_assigned, 0) as current_assigned,
        COALESCE(vs.total_verifications_completed, 0) as total_completed,
        COALESCE(vs.avg_completion_time_hours, 0) as avg_hours,
        COALESCE(vs.verifications_passed, 0) as verifications_passed,
        COALESCE(vs.verifications_partial, 0) as verifications_partial,
        COALESCE(vs.verifications_failed, 0) as verifications_failed
      FROM users u
      LEFT JOIN verifier_stats vs ON u.id = vs.user_id
      WHERE u.is_verifier = true
      ORDER BY u.name, u.email
    `);
    
    return NextResponse.json({ verifiers: result.rows });
  } catch (error) {
    console.error('Error fetching verifiers:', error);
    return NextResponse.json({ error: 'Failed to fetch verifiers' }, { status: 500 });
  }
}

// POST /api/admin/verifiers - Add a new verifier
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId, specialties, maxConcurrent, notes } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id, is_verifier FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (userCheck.rows[0].is_verifier) {
      return NextResponse.json({ error: 'User is already a verifier' }, { status: 400 });
    }
    
    // Update user to be a verifier
    await pool.query(`
      UPDATE users 
      SET 
        is_verifier = true,
        verifier_since = NOW(),
        verifier_specialty = $2,
        verifier_max_concurrent = $3,
        verifier_notes = $4
      WHERE id = $1
    `, [userId, specialties || ['general'], maxConcurrent || 5, notes || null]);
    
    // Initialize verifier stats
    await pool.query(`
      INSERT INTO verifier_stats (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding verifier:', error);
    return NextResponse.json({ error: 'Failed to add verifier' }, { status: 500 });
  }
}
