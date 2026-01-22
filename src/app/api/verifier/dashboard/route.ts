import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/verifier/dashboard - Get verifier's dashboard data
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    // Check if user is a verifier
    const verifierCheck = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.verifier_specialty,
        u.verifier_max_concurrent,
        COALESCE(vs.current_assigned, 0) as current_assigned,
        COALESCE(vs.total_verifications_completed, 0) as total_completed
      FROM users u
      LEFT JOIN verifier_stats vs ON u.id = vs.user_id
      WHERE u.id = $1 AND u.is_verifier = true
    `, [user.id]);
    
    if (verifierCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Verifier access required' }, { status: 403 });
    }
    
    const verifier = verifierCheck.rows[0];
    
    // Get requests assigned to this verifier
    const myRequestsResult = await pool.query(`
      SELECT 
        vr.id,
        vr.project_id,
        vr.record_id,
        vr.requested_at,
        vr.priority,
        vr.verification_scope,
        vr.status,
        vr.assigned_to,
        p.name as project_name,
        p.slug as project_slug,
        rt.name as record_type_name,
        u.email as requester_email,
        u.name as requester_name
      FROM verification_requests vr
      JOIN records r ON vr.record_id = r.id
      JOIN record_types rt ON r.record_type_id = rt.id
      JOIN projects p ON vr.project_id = p.id
      LEFT JOIN users u ON vr.requested_by = u.id
      WHERE vr.assigned_to = $1 AND vr.status = 'in_progress'
      ORDER BY 
        CASE vr.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2 
          WHEN 'normal' THEN 3 
          WHEN 'low' THEN 4 
        END,
        vr.requested_at ASC
    `, [user.id]);
    
    // Get available requests (unassigned)
    const availableResult = await pool.query(`
      SELECT 
        vr.id,
        vr.project_id,
        vr.record_id,
        vr.requested_at,
        vr.priority,
        vr.verification_scope,
        vr.status,
        vr.assigned_to,
        p.name as project_name,
        p.slug as project_slug,
        rt.name as record_type_name,
        u.email as requester_email,
        u.name as requester_name
      FROM verification_requests vr
      JOIN records r ON vr.record_id = r.id
      JOIN record_types rt ON r.record_type_id = rt.id
      JOIN projects p ON vr.project_id = p.id
      LEFT JOIN users u ON vr.requested_by = u.id
      WHERE vr.status = 'pending' AND vr.assigned_to IS NULL
      ORDER BY 
        CASE vr.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2 
          WHEN 'normal' THEN 3 
          WHEN 'low' THEN 4 
        END,
        vr.requested_at ASC
      LIMIT 50
    `);
    
    return NextResponse.json({
      verifier,
      myRequests: myRequestsResult.rows,
      availableRequests: availableResult.rows
    });
  } catch (error) {
    console.error('Error fetching verifier dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
