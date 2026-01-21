import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; tagId: string }>;
}

// GET /api/projects/[slug]/tags/[tagId] - Get single tag
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, tagId } = await params;
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
    
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const tagResult = await pool.query(
      `SELECT pt.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM record_tags rt WHERE rt.tag_id = pt.id) as usage_count
       FROM project_tags pt
       LEFT JOIN users u ON pt.created_by = u.id
       WHERE pt.id = $1 AND pt.project_id = $2`,
      [tagId, project.id]
    );
    
    if (tagResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    return NextResponse.json({ tag: tagResult.rows[0] });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/tags/[tagId] - Update a tag
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, tagId } = await params;
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
    
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify tag exists and belongs to project
    const existingTag = await pool.query(
      'SELECT id FROM project_tags WHERE id = $1 AND project_id = $2',
      [tagId, project.id]
    );
    
    if (existingTag.rows.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { name, category, color, description, sort_order } = body;
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
      // Also update slug when name changes
      updates.push(`slug = $${paramIndex++}`);
      values.push(name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category?.trim() || null);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sort_order);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    values.push(tagId);
    values.push(project.id);
    
    const updateResult = await pool.query(
      `UPDATE project_tags 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND project_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({ tag: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/tags/[tagId] - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, tagId } = await params;
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
    
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Check usage before deleting
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM record_tags WHERE tag_id = $1',
      [tagId]
    );
    
    const usageCount = parseInt(usageCheck.rows[0].count);
    
    // Delete tag (cascade will remove record_tags entries)
    const deleteResult = await pool.query(
      'DELETE FROM project_tags WHERE id = $1 AND project_id = $2 RETURNING id, name',
      [tagId, project.id]
    );
    
    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      deletedTag: deleteResult.rows[0],
      recordsAffected: usageCount
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
