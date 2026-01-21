import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; memberId: string }>;
}

// PATCH /api/projects/[slug]/members/[memberId] - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, memberId } = await params;
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
    const { role } = body;
    
    if (!['viewer', 'reviewer', 'editor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Check if member exists
    const memberResult = await pool.query(
      'SELECT * FROM project_members WHERE id = $1 AND project_id = $2',
      [parseInt(memberId), project.id]
    );
    
    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    const member = memberResult.rows[0];
    
    // Prevent changing owner role
    if (member.role === 'owner') {
      return NextResponse.json({ 
        error: 'Cannot change owner role' 
      }, { status: 403 });
    }
    
    // Update role
    const updateResult = await pool.query(
      'UPDATE project_members SET role = $1 WHERE id = $2 RETURNING *',
      [role, parseInt(memberId)]
    );
    
    return NextResponse.json({ member: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/members/[memberId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, memberId } = await params;
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
    
    // Check if member exists
    const memberResult = await pool.query(
      'SELECT * FROM project_members WHERE id = $1 AND project_id = $2',
      [parseInt(memberId), project.id]
    );
    
    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    const member = memberResult.rows[0];
    
    // Prevent removing owner
    if (member.role === 'owner') {
      return NextResponse.json({ 
        error: 'Cannot remove project owner' 
      }, { status: 403 });
    }
    
    // Remove member
    await pool.query(
      'DELETE FROM project_members WHERE id = $1',
      [parseInt(memberId)]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
