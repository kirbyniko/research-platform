import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lock duration in minutes
const LOCK_DURATION_MINUTES = 30;

// GET /api/incidents/[id]/lock - Check lock status
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

    // Check authentication (any editor+ can check lock status)
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Get lock info
    const result = await pool.query(`
      SELECT 
        i.locked_by,
        i.locked_at,
        i.lock_expires_at,
        u.email as locked_by_email,
        u.name as locked_by_name
      FROM incidents i
      LEFT JOIN users u ON i.locked_by = u.id
      WHERE i.id = $1
    `, [incidentId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const incident = result.rows[0];
    const now = new Date();
    const isLocked = incident.locked_by && 
                     incident.lock_expires_at && 
                     new Date(incident.lock_expires_at) > now;

    return NextResponse.json({
      isLocked,
      lockedBy: isLocked ? incident.locked_by : null,
      lockedByEmail: isLocked ? incident.locked_by_email : null,
      lockedByName: isLocked ? incident.locked_by_name : null,
      lockedAt: isLocked ? incident.locked_at : null,
      expiresAt: isLocked ? incident.lock_expires_at : null,
      remainingMinutes: isLocked 
        ? Math.ceil((new Date(incident.lock_expires_at).getTime() - now.getTime()) / 60000)
        : null
    });
  } catch (error) {
    console.error('Error checking lock status:', error);
    return NextResponse.json(
      { error: 'Failed to check lock status' },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/lock - Acquire or extend lock
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

    // Check authentication (any editor+ can acquire locks)
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;
    const body = await request.json().catch(() => ({}));
    const extend = body.extend === true; // If true, just extend existing lock

    // Check current lock status
    const checkResult = await pool.query(`
      SELECT locked_by, lock_expires_at
      FROM incidents
      WHERE id = $1
    `, [incidentId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const incident = checkResult.rows[0];
    const now = new Date();
    const isLocked = incident.locked_by && 
                     incident.lock_expires_at && 
                     new Date(incident.lock_expires_at) > now;

    // If locked by someone else, deny
    if (isLocked && incident.locked_by !== user.id && user.role !== 'admin') {
      // Get lock holder's info
      const lockerResult = await pool.query(`
        SELECT email, name FROM users WHERE id = $1
      `, [incident.locked_by]);
      
      const locker = lockerResult.rows[0];
      const remainingMinutes = Math.ceil(
        (new Date(incident.lock_expires_at).getTime() - now.getTime()) / 60000
      );

      return NextResponse.json({
        error: 'Case is currently locked',
        lockedBy: incident.locked_by,
        lockedByEmail: locker?.email,
        lockedByName: locker?.name,
        expiresAt: incident.lock_expires_at,
        remainingMinutes
      }, { status: 423 }); // 423 Locked
    }

    // If extending, make sure user owns the lock
    if (extend && incident.locked_by !== user.id) {
      return NextResponse.json({
        error: 'Cannot extend lock you do not own'
      }, { status: 403 });
    }

    // Acquire or extend lock
    const expiresAt = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000);
    
    await pool.query(`
      UPDATE incidents
      SET 
        locked_by = $1,
        locked_at = COALESCE(locked_at, $2),
        lock_expires_at = $3
      WHERE id = $4
    `, [user.id, now, expiresAt, incidentId]);

    return NextResponse.json({
      success: true,
      message: extend ? 'Lock extended' : 'Lock acquired',
      lockedBy: user.id,
      lockedByEmail: user.email,
      lockedAt: now,
      expiresAt,
      remainingMinutes: LOCK_DURATION_MINUTES
    });
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return NextResponse.json(
      { error: 'Failed to acquire lock' },
      { status: 500 }
    );
  }
}

// DELETE /api/incidents/[id]/lock - Release lock
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    // Check authentication
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Check current lock status
    const checkResult = await pool.query(`
      SELECT locked_by FROM incidents WHERE id = $1
    `, [incidentId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const incident = checkResult.rows[0];

    // Only lock owner or admin can release
    if (incident.locked_by && incident.locked_by !== user.id && user.role !== 'admin') {
      return NextResponse.json({
        error: 'You can only release your own locks'
      }, { status: 403 });
    }

    // Release lock
    await pool.query(`
      UPDATE incidents
      SET 
        locked_by = NULL,
        locked_at = NULL,
        lock_expires_at = NULL
      WHERE id = $1
    `, [incidentId]);

    return NextResponse.json({
      success: true,
      message: 'Lock released'
    });
  } catch (error) {
    console.error('Error releasing lock:', error);
    return NextResponse.json(
      { error: 'Failed to release lock' },
      { status: 500 }
    );
  }
}
