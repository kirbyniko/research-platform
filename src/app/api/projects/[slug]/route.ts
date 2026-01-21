import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { 
  getProjectBySlug, 
  hasProjectPermission
} from '@/lib/project-permissions';
import { UpdateProjectRequest } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug] - Get project details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    
    // Try to get auth (optional for public projects)
    let userId: number | undefined;
    try {
      const authResult = await requireServerAuth(request);
      if (!('error' in authResult)) {
        userId = authResult.user.id;
      }
    } catch {
      // No auth, continue for public projects
    }
    
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project, role } = result;
    
    // Get record types for this project
    const recordTypesResult = await pool.query(
      `SELECT * FROM record_types 
       WHERE project_id = $1 
       ORDER BY sort_order, name`,
      [project.id]
    );
    
    // Get team member count
    const membersResult = await pool.query(
      `SELECT COUNT(*) as count FROM project_members WHERE project_id = $1`,
      [project.id]
    );
    
    // Get record count
    const recordsResult = await pool.query(
      `SELECT COUNT(*) as count FROM records 
       WHERE project_id = $1 AND deleted_at IS NULL`,
      [project.id]
    );
    
    return NextResponse.json({
      project,
      role,
      recordTypes: recordTypesResult.rows,
      stats: {
        memberCount: parseInt(membersResult.rows[0].count),
        recordCount: parseInt(recordsResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug] - Update project
export async function PATCH(
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
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body: UpdateProjectRequest = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    
    if (body.is_public !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(body.is_public);
    }
    
    if (body.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(body.settings));
    }
    
    if (body.tags_enabled !== undefined) {
      updates.push(`tags_enabled = $${paramIndex++}`);
      values.push(body.tags_enabled);
    }
    
    if (body.guest_upload_enabled !== undefined) {
      updates.push(`guest_upload_enabled = $${paramIndex++}`);
      values.push(body.guest_upload_enabled);
    }
    
    if (body.guest_upload_quota_bytes !== undefined) {
      updates.push(`guest_upload_quota_bytes = $${paramIndex++}`);
      values.push(body.guest_upload_quota_bytes);
    }
    
    if (body.guest_upload_max_file_size !== undefined) {
      updates.push(`guest_upload_max_file_size = $${paramIndex++}`);
      values.push(body.guest_upload_max_file_size);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(project.id);
    
    const result = await pool.query(
      `UPDATE projects 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug] - Delete project (soft delete)
export async function DELETE(
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
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Only owner can delete
    if (project.created_by !== userId) {
      return NextResponse.json(
        { error: 'Only the project owner can delete the project' },
        { status: 403 }
      );
    }
    
    // Soft delete
    await pool.query(
      `UPDATE projects SET deleted_at = NOW() WHERE id = $1`,
      [project.id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
