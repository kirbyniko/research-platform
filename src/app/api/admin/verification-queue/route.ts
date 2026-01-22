import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/admin/verification-queue
// Get all pending verification requests (platform admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    // Check if user is a platform admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    
    // Get filter params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const assignedTo = searchParams.get('assigned_to');
    
    // Build query
    let query = `
      SELECT 
        vr.*,
        r.data as record_data,
        r.status as record_status,
        rt.name as record_type_name,
        rt.slug as record_type_slug,
        p.name as project_name,
        p.slug as project_slug,
        u.email as requested_by_email,
        u.name as requested_by_name,
        assigned.email as assigned_to_email
      FROM verification_requests vr
      JOIN records r ON vr.record_id = r.id
      JOIN record_types rt ON r.record_type_id = rt.id
      JOIN projects p ON vr.project_id = p.id
      LEFT JOIN users u ON vr.requested_by = u.id
      LEFT JOIN users assigned ON vr.assigned_to = assigned.id
      WHERE 1=1
    `;
    
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (status !== 'all') {
      query += ` AND vr.status = $${paramIndex++}`;
      values.push(status);
    }
    
    if (assignedTo) {
      if (assignedTo === 'me') {
        query += ` AND vr.assigned_to = $${paramIndex++}`;
        values.push(user.id);
      } else if (assignedTo === 'unassigned') {
        query += ` AND vr.assigned_to IS NULL`;
      }
    }
    
    query += ` ORDER BY 
      CASE vr.priority WHEN 'urgent' THEN 0 ELSE 1 END,
      vr.requested_at ASC`;
    
    const result = await pool.query(query, values);
    
    // Get counts by status
    const countsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM verification_requests
      GROUP BY status
    `);
    
    const counts = countsResult.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      requests: result.rows,
      counts
    });
    
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification queue' },
      { status: 500 }
    );
  }
}
