import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

// GET /api/projects/[slug]/record-types/[type]/templates/[templateId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; type: string; templateId: string }> }
) {
  try {
    const { slug, type, templateId } = await params;

    // Get project
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1',
      [slug]
    );
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectId = projectResult.rows[0].id;

    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT id FROM record_types WHERE project_id = $1 AND slug = $2',
      [projectId, type]
    );
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }

    // Get template
    const result = await pool.query(
      `SELECT dt.*, u.name as created_by_name
       FROM display_templates dt
       LEFT JOIN users u ON dt.created_by = u.id
       WHERE dt.id = $1 AND dt.record_type_id = $2`,
      [templateId, recordTypeResult.rows[0].id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[slug]/record-types/[type]/templates/[templateId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; type: string; templateId: string }> }
) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const userId = authResult.user.id;

    const { slug, type, templateId } = await params;
    const body = await request.json();

    // Get project
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1',
      [slug]
    );
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectId = projectResult.rows[0].id;

    // Check permission
    const memberResult = await pool.query(
      `SELECT role, can_manage_appearances FROM project_members 
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }
    const member = memberResult.rows[0];
    if (!member.can_manage_appearances && member.role !== 'admin' && member.role !== 'owner') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT id FROM record_types WHERE project_id = $1 AND slug = $2',
      [projectId, type]
    );
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    const recordTypeId = recordTypeResult.rows[0].id;

    // Verify template exists
    const existingResult = await pool.query(
      'SELECT id FROM display_templates WHERE id = $1 AND record_type_id = $2',
      [templateId, recordTypeId]
    );
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // If setting as default, unset any existing default
    if (body.is_default) {
      await pool.query(
        `UPDATE display_templates SET is_default = false 
         WHERE record_type_id = $1 AND is_default = true AND id != $2`,
        [recordTypeId, templateId]
      );
    }

    // Build update query
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
    if (body.template !== undefined) {
      updates.push(`template = $${paramIndex++}`);
      values.push(JSON.stringify(body.template));
    }
    if (body.is_default !== undefined) {
      updates.push(`is_default = $${paramIndex++}`);
      values.push(body.is_default);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(templateId);

    const result = await pool.query(
      `UPDATE display_templates 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return NextResponse.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[slug]/record-types/[type]/templates/[templateId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; type: string; templateId: string }> }
) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const userId = authResult.user.id;

    const { slug, type, templateId } = await params;

    // Get project
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1',
      [slug]
    );
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectId = projectResult.rows[0].id;

    // Check permission
    const memberResult = await pool.query(
      `SELECT role, can_manage_appearances FROM project_members 
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }
    const member = memberResult.rows[0];
    if (!member.can_manage_appearances && member.role !== 'admin' && member.role !== 'owner') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT id FROM record_types WHERE project_id = $1 AND slug = $2',
      [projectId, type]
    );
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }

    // Delete template
    const result = await pool.query(
      `DELETE FROM display_templates 
       WHERE id = $1 AND record_type_id = $2
       RETURNING id`,
      [templateId, recordTypeResult.rows[0].id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
