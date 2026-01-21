import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/members - List project members
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all project members
    const membersResult = await pool.query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.permissions, 
        pm.invited_by, pm.invited_at, pm.accepted_at, 
        COALESCE(pm.can_upload, false) as can_upload, 
        pm.upload_quota_bytes,
        u.name, u.email,
        inviter.name as invited_by_name
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       LEFT JOIN users inviter ON pm.invited_by = inviter.id
       WHERE pm.project_id = $1
       ORDER BY 
         CASE pm.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           WHEN 'analyst' THEN 3
           WHEN 'validator' THEN 4
           WHEN 'reviewer' THEN 5
           WHEN 'viewer' THEN 6
         END,
         pm.invited_at DESC`,
      [project.id]
    );
    
    // Format members with nested user object
    const members = membersResult.rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      role: row.role,
      permissions: row.permissions || {},
      invited_by: row.invited_by,
      invited_at: row.invited_at,
      accepted_at: row.accepted_at,
      can_upload: row.can_upload,
      upload_quota_bytes: row.upload_quota_bytes,
      user: {
        id: row.user_id,
        name: row.name,
        email: row.email
      }
    }));
    
    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching project members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/members - Invite a member
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_members'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { email, role = 'viewer' } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    if (!['viewer', 'reviewer', 'editor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'User not found. They must sign in to the platform first.' 
      }, { status: 404 });
    }
    
    const invitedUserId = userResult.rows[0].id;
    
    // Check if already a member
    const existingMember = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [project.id, invitedUserId]
    );
    
    if (existingMember.rows.length > 0) {
      return NextResponse.json({ 
        error: 'User is already a member of this project' 
      }, { status: 400 });
    }
    
    // Add member
    const memberResult = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, invited_by, invited_at, accepted_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [project.id, invitedUserId, role, userId]
    );
    
    return NextResponse.json({ member: memberResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
