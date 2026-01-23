import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/members/me - Get current user's membership
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
    
    const { project, role } = result;
    
    if (!role) {
      return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }
    
    // Get full membership details
    const memberResult = await pool.query(
      `SELECT pm.id, pm.role, pm.permissions, 
        pm.can_upload, pm.can_manage_appearances,
        pm.upload_quota_bytes, pm.invited_at, pm.accepted_at
       FROM project_members pm
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [project.id, userId]
    );
    
    // Check if user is owner
    const isOwner = project.created_by === userId;
    
    if (memberResult.rows.length === 0 && !isOwner) {
      return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }
    
    const membership = memberResult.rows[0] || {};
    
    return NextResponse.json({
      role: isOwner ? 'owner' : membership.role,
      permissions: membership.permissions || {},
      can_upload: isOwner || membership.can_upload || false,
      can_manage_appearances: isOwner || membership.can_manage_appearances || false,
      upload_quota_bytes: membership.upload_quota_bytes,
      invited_at: membership.invited_at,
      accepted_at: membership.accepted_at,
      is_owner: isOwner,
    });
  } catch (error) {
    console.error('Error fetching membership:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership' },
      { status: 500 }
    );
  }
}
