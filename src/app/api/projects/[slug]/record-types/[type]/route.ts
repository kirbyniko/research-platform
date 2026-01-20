import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { 
  getProjectBySlug, 
  hasProjectPermission
} from '@/lib/project-permissions';
import { UpdateRecordTypeRequest } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string; type: string }>;
}

// GET /api/projects/[slug]/record-types/[type] - Get record type details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type } = await params;
    
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
    
    // Get record type
    const recordTypeResult = await pool.query(
      `SELECT * FROM record_types 
       WHERE project_id = $1 AND slug = $2`,
      [project.id, type]
    );
    
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    const recordType = recordTypeResult.rows[0];
    
    // Get field definitions
    const fieldsResult = await pool.query(
      `SELECT fd.*, fg.name as group_name
       FROM field_definitions fd
       LEFT JOIN field_groups fg ON fd.field_group_id = fg.id
       WHERE fd.record_type_id = $1
       ORDER BY fd.sort_order, fd.name`,
      [recordType.id]
    );
    
    // Get field groups
    const groupsResult = await pool.query(
      `SELECT * FROM field_groups 
       WHERE record_type_id = $1 
       ORDER BY sort_order, name`,
      [recordType.id]
    );
    
    // Get record count
    const recordsResult = await pool.query(
      `SELECT COUNT(*) as count FROM records 
       WHERE record_type_id = $1 AND deleted_at IS NULL`,
      [recordType.id]
    );
    
    return NextResponse.json({
      recordType,
      fields: fieldsResult.rows,
      groups: groupsResult.rows,
      recordCount: parseInt(recordsResult.rows[0].count),
      role
    });
  } catch (error) {
    console.error('Error fetching record type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch record type' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/record-types/[type] - Update record type
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type } = await params;
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
    const body: UpdateRecordTypeRequest = await request.json();
    
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
    
    if (body.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(body.icon);
    }
    
    if (body.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(body.color);
    }
    
    if (body.workflow_config !== undefined) {
      updates.push(`workflow_config = $${paramIndex++}`);
      values.push(JSON.stringify(body.workflow_config));
    }
    
    if (body.display_config !== undefined) {
      updates.push(`display_config = $${paramIndex++}`);
      values.push(JSON.stringify(body.display_config));
    }
    
    if (body.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(body.sort_order);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(recordType.id);
    
    const result = await pool.query(
      `UPDATE record_types 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({ recordType: result.rows[0] });
  } catch (error) {
    console.error('Error updating record type:', error);
    return NextResponse.json(
      { error: 'Failed to update record type' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/record-types/[type] - Delete record type
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type } = await params;
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
    
    // Check if there are any records
    const recordsResult = await pool.query(
      'SELECT COUNT(*) as count FROM records WHERE record_type_id = $1 AND deleted_at IS NULL',
      [recordType.id]
    );
    
    if (parseInt(recordsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete record type with existing records. Archive or delete records first.' },
        { status: 400 }
      );
    }
    
    // Delete field definitions first (cascade would handle this, but being explicit)
    await pool.query(
      'DELETE FROM field_definitions WHERE record_type_id = $1',
      [recordType.id]
    );
    
    // Delete field groups
    await pool.query(
      'DELETE FROM field_groups WHERE record_type_id = $1',
      [recordType.id]
    );
    
    // Delete record type
    await pool.query(
      'DELETE FROM record_types WHERE id = $1',
      [recordType.id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting record type:', error);
    return NextResponse.json(
      { error: 'Failed to delete record type' },
      { status: 500 }
    );
  }
}
