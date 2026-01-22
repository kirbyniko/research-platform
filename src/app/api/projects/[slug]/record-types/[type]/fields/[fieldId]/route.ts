import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';
import { UpdateFieldDefinitionRequest, FieldType } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string; type: string; fieldId: string }>;
}

const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'textarea', 'number', 'date', 'datetime', 'boolean',
  'select', 'multi_select', 'radio', 'checkbox_group',
  'url', 'email', 'location', 'person', 'file', 'rich_text',
  'record_link', 'user_link'
];

// GET /api/projects/[slug]/record-types/[type]/fields/[fieldId] - Get field
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type, fieldId } = await params;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT * FROM record_types WHERE project_id = $1 AND slug = $2',
      [project.id, type]
    );
    
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    const recordType = recordTypeResult.rows[0];
    
    // Get field
    const fieldResult = await pool.query(
      `SELECT fd.*, fg.name as group_name
       FROM field_definitions fd
       LEFT JOIN field_groups fg ON fd.group_id = fg.id
       WHERE fd.id = $1 AND fd.record_type_id = $2`,
      [parseInt(fieldId), recordType.id]
    );
    
    if (fieldResult.rows.length === 0) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }
    
    return NextResponse.json({ field: fieldResult.rows[0] });
  } catch (error) {
    console.error('Error fetching field:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/record-types/[type]/fields/[fieldId] - Update field
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type, fieldId } = await params;
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
    
    // Get field
    const fieldResult = await pool.query(
      'SELECT * FROM field_definitions WHERE id = $1 AND record_type_id = $2',
      [parseInt(fieldId), recordType.id]
    );
    
    if (fieldResult.rows.length === 0) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }
    
    const field = fieldResult.rows[0];
    const body: UpdateFieldDefinitionRequest = await request.json();
    
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
    
    if (body.field_type !== undefined) {
      if (!VALID_FIELD_TYPES.includes(body.field_type)) {
        return NextResponse.json(
          { error: `Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.push(`field_type = $${paramIndex++}`);
      values.push(body.field_type);
    }
    
    if (body.is_required !== undefined) {
      updates.push(`is_required = $${paramIndex++}`);
      values.push(body.is_required);
    }
    
    if (body.is_array !== undefined) {
      updates.push(`is_array = $${paramIndex++}`);
      values.push(body.is_array);
    }
    
    if (body.default_value !== undefined) {
      updates.push(`default_value = $${paramIndex++}`);
      values.push(body.default_value);
    }
    
    if (body.placeholder !== undefined) {
      updates.push(`placeholder = $${paramIndex++}`);
      values.push(body.placeholder);
    }
    
    if (body.help_text !== undefined) {
      updates.push(`help_text = $${paramIndex++}`);
      values.push(body.help_text);
    }
    
    if (body.validation_rules !== undefined) {
      updates.push(`validation_rules = $${paramIndex++}`);
      values.push(JSON.stringify(body.validation_rules));
    }
    
    if (body.options !== undefined) {
      updates.push(`options = $${paramIndex++}`);
      values.push(JSON.stringify(body.options));
    }
    
    if (body.display_config !== undefined) {
      updates.push(`display_config = $${paramIndex++}`);
      values.push(JSON.stringify(body.display_config));
    }
    
    if (body.visibility !== undefined) {
      updates.push(`visibility = $${paramIndex++}`);
      values.push(JSON.stringify(body.visibility));
    }
    
    if (body.requires_quote !== undefined) {
      updates.push(`requires_quote = $${paramIndex++}`);
      values.push(body.requires_quote);
    }
    
    if (body.requires_source_for_quote !== undefined) {
      updates.push(`requires_source_for_quote = $${paramIndex++}`);
      values.push(body.requires_source_for_quote);
    }
    
    if (body.require_verified_for_publish !== undefined) {
      updates.push(`require_verified_for_publish = $${paramIndex++}`);
      values.push(body.require_verified_for_publish);
    }
    
    // Visibility settings
    if (body.show_in_guest_form !== undefined) {
      updates.push(`show_in_guest_form = $${paramIndex++}`);
      values.push(body.show_in_guest_form);
    }
    
    if (body.show_in_review_form !== undefined) {
      updates.push(`show_in_review_form = $${paramIndex++}`);
      values.push(body.show_in_review_form);
    }
    
    if (body.show_in_validation_form !== undefined) {
      updates.push(`show_in_validation_form = $${paramIndex++}`);
      values.push(body.show_in_validation_form);
    }
    
    if (body.show_in_public_view !== undefined) {
      updates.push(`show_in_public_view = $${paramIndex++}`);
      values.push(body.show_in_public_view);
    }
    
    if (body.show_in_list_view !== undefined) {
      updates.push(`show_in_list_view = $${paramIndex++}`);
      values.push(body.show_in_list_view);
    }
    
    if (body.field_group_id !== undefined) {
      updates.push(`field_group_id = $${paramIndex++}`);
      values.push(body.field_group_id);
    }
    
    if (body.width !== undefined) {
      updates.push(`width = $${paramIndex++}`);
      values.push(body.width);
    }
    
    if (body.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(body.config));
    }
    
    if (body.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(body.sort_order);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(field.id);
    
    const result = await pool.query(
      `UPDATE field_definitions 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({ field: result.rows[0] });
  } catch (error) {
    console.error('Error updating field:', error);
    return NextResponse.json(
      { error: 'Failed to update field' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/record-types/[type]/fields/[fieldId] - Delete field
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type, fieldId } = await params;
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
    
    // Get field
    const fieldResult = await pool.query(
      'SELECT * FROM field_definitions WHERE id = $1 AND record_type_id = $2',
      [parseInt(fieldId), recordType.id]
    );
    
    if (fieldResult.rows.length === 0) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }
    
    // Check if there's data using this field
    // This would need to check the records.data JSONB for the field key
    // For now, we allow deletion but might want to add a warning
    
    // Delete field
    await pool.query(
      'DELETE FROM field_definitions WHERE id = $1',
      [parseInt(fieldId)]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting field:', error);
    return NextResponse.json(
      { error: 'Failed to delete field' },
      { status: 500 }
    );
  }
}
