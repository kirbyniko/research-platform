import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireServerAuth(request, 'admin');
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await params;
  const { role } = await request.json();

  // Prevent users from changing their own role
  if (authResult.user.id === parseInt(id)) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
  }

  const validRoles = ['guest', 'viewer', 'user', 'editor', 'analyst', 'admin'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, parseInt(id)]
    );

    // Log the action if activity_log table exists
    try {
      await pool.query(
        `INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)`,
        [authResult.user.id, 'role_change', { target_user_id: parseInt(id), new_role: role }]
      );
    } catch (logError) {
      // Silently fail if activity_log doesn't exist yet
      console.log('Activity log not available:', logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
