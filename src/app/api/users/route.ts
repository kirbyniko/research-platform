import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET - Fetch all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request, 'admin');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        auth_provider, 
        email_verified, 
        created_at
      FROM users 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH - Update user role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request, 'admin');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['guest', 'viewer', 'user', 'editor', 'analyst', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user is trying to modify the super admin
    const userCheck = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetEmail = userCheck.rows[0].email;
    if (targetEmail === process.env.ADMIN_EMAIL) {
      return NextResponse.json({ 
        error: 'Cannot modify super admin role' 
      }, { status: 403 });
    }

    // Update the role
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, userId]
    );

    console.log(`[User Management] Admin ${authResult.user.email} changed user ${targetEmail} role to ${role}`);

    return NextResponse.json({ 
      success: true,
      message: 'User role updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
