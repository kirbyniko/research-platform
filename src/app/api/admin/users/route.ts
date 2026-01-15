import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const authResult = await requireServerAuth(request, 'admin');
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    // First check which columns exist in the users table
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    
    // Build SELECT dynamically based on available columns
    const selectCols = ['id', 'email', 'name', 'role', 'created_at'];
    if (columns.includes('email_verified')) selectCols.push('email_verified');
    if (columns.includes('last_login')) selectCols.push('last_login');
    
    const result = await pool.query(`
      SELECT ${selectCols.join(', ')}
      FROM users
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
