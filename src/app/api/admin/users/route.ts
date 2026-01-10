import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const authResult = await requireServerAuth(request, 'admin');
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const result = await pool.query(`
      SELECT id, email, name, role, email_verified, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
