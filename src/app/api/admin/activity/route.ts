import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const authResult = await requireServerAuth(request, 'admin');
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    // Check if activity_log table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_log'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({ activity: [] });
    }

    const result = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        u.email as user_email,
        a.action,
        a.incident_id,
        a.details,
        a.created_at as timestamp
      FROM activity_log a
      JOIN users u ON a.user_id = u.id
      WHERE u.role IN ('analyst', 'editor', 'admin')
      ORDER BY a.created_at DESC
      LIMIT 500
    `);

    return NextResponse.json({ activity: result.rows });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
