import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; type: string; groupId: string }>;
}

// PATCH /api/projects/[slug]/record-types/[type]/groups/[groupId] - Update group
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type, groupId } = await params;
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
    if (!(await hasProjectPermission(userId, project.id, 'manage_record_types'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT * FROM record_types WHERE project_id = $1 AND slug = $2',
      [project.id, type]
    );

    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }

    const recordType = recordTypeResult.rows[0];

    // Get group
    const groupResult = await pool.query(
      'SELECT * FROM field_groups WHERE id = $1 AND record_type_id = $2',
      [groupId, recordType.id]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name.trim());
    }

    if (body.slug !== undefined) {
      if (!body.slug?.trim()) {
        return NextResponse.json({ error: 'Slug cannot be empty' }, { status: 400 });
      }
      // Check for duplicate slug
      const existingResult = await pool.query(
        'SELECT id FROM field_groups WHERE record_type_id = $1 AND slug = $2 AND id != $3',
        [recordType.id, body.slug, groupId]
      );
      if (existingResult.rows.length > 0) {
        return NextResponse.json({ error: 'A group with this slug already exists' }, { status: 400 });
      }
      updates.push(`slug = $${paramIndex++}`);
      values.push(body.slug.trim());
    }

    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description?.trim() || null);
    }

    if (body.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(body.sort_order);
    }

    if (body.show_when !== undefined) {
      updates.push(`show_when = $${paramIndex++}`);
      values.push(body.show_when ? JSON.stringify(body.show_when) : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(groupId);

    const result = await pool.query(
      `UPDATE field_groups
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return NextResponse.json({ group: result.rows[0] });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/record-types/[type]/groups/[groupId] - Delete group
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type, groupId } = await params;
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
    if (!(await hasProjectPermission(userId, project.id, 'manage_record_types'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT * FROM record_types WHERE project_id = $1 AND slug = $2',
      [project.id, type]
    );

    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }

    const recordType = recordTypeResult.rows[0];

    // Check if group has fields
    const fieldsResult = await pool.query(
      'SELECT COUNT(*) as count FROM field_definitions WHERE field_group_id = $1',
      [groupId]
    );

    if (parseInt(fieldsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete group with fields. Move or delete fields first.' },
        { status: 400 }
      );
    }

    // Delete group
    await pool.query(
      'DELETE FROM field_groups WHERE id = $1 AND record_type_id = $2',
      [groupId, recordType.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
