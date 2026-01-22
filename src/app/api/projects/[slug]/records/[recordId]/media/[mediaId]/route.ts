import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string; mediaId: string }>;
}

// PATCH /api/projects/[slug]/records/[recordId]/media/[mediaId] - Update media
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, mediaId } = await params;
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
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify media belongs to record
    const mediaResult = await pool.query(
      'SELECT * FROM record_media WHERE id = $1 AND record_id = $2 AND project_id = $3',
      [parseInt(mediaId), parseInt(recordId), project.id]
    );
    
    if (mediaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Build dynamic UPDATE query
    const allowedFields = ['title', 'description', 'thumbnail_url', 'linked_fields'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(body[field]);
      }
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(parseInt(mediaId));
    
    const result = await pool.query(
      `UPDATE record_media SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    // Update record's updated_at
    await pool.query(
      'UPDATE records SET updated_at = NOW() WHERE id = $1',
      [parseInt(recordId)]
    );
    
    return NextResponse.json({ media: result.rows[0] });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/records/[recordId]/media/[mediaId] - Delete media
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, mediaId } = await params;
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
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete media
    const result = await pool.query(
      'DELETE FROM record_media WHERE id = $1 AND record_id = $2 AND project_id = $3 RETURNING id',
      [parseInt(mediaId), parseInt(recordId), project.id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    // Update record's updated_at
    await pool.query(
      'UPDATE records SET updated_at = NOW() WHERE id = $1',
      [parseInt(recordId)]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
