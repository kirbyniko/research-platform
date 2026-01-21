import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';
import { UpdateRecordRequest, RecordStatus, Permission } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

// GET /api/projects/[slug]/records/[recordId] - Get single record
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
    
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
    
    // Get record with related data
    const recordResult = await pool.query(
      `SELECT r.*, 
        rt.slug as record_type_slug,
        rt.name as record_type_name,
        rt.workflow_config,
        u.name as submitted_by_name,
        u.email as submitted_by_email,
        rev.name as reviewed_by_name,
        val.name as validated_by_name
       FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       LEFT JOIN users u ON r.submitted_by = u.id
       LEFT JOIN users rev ON r.reviewed_by = rev.id
       LEFT JOIN users val ON r.validated_by = val.id
       WHERE r.id = $1 AND r.project_id = $2 AND r.deleted_at IS NULL`,
      [parseInt(recordId), project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const record = recordResult.rows[0];
    
    // For non-authenticated users or viewers, only show verified records
    if ((!userId || role === 'viewer') && record.status !== 'verified') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    // Get field definitions for this record type
    const fieldsResult = await pool.query(
      `SELECT fd.*, fg.name as group_name, fg.sort_order as group_sort_order
       FROM field_definitions fd
       LEFT JOIN field_groups fg ON fd.group_id = fg.id
       WHERE fd.record_type_id = $1
       ORDER BY fg.sort_order NULLS FIRST, fd.sort_order, fd.name`,
      [record.record_type_id]
    );
    
    // Get quotes
    const quotesResult = await pool.query(
      `SELECT * FROM record_quotes 
       WHERE record_id = $1 
       ORDER BY created_at`,
      [record.id]
    );
    
    // Get sources
    const sourcesResult = await pool.query(
      `SELECT * FROM record_sources 
       WHERE record_id = $1 
       ORDER BY created_at`,
      [record.id]
    );
    
    return NextResponse.json({
      record,
      fields: fieldsResult.rows,
      quotes: quotesResult.rows,
      sources: sourcesResult.rows,
      role
    });
  } catch (error) {
    console.error('Error fetching record:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/records/[recordId] - Update record
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
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
    
    // Get record
    const recordResult = await pool.query(
      `SELECT r.*, rt.slug as record_type_slug
       FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       WHERE r.id = $1 AND r.project_id = $2 AND r.deleted_at IS NULL`,
      [parseInt(recordId), project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const record = recordResult.rows[0];
    
    // Check permission based on record status and requested action
    const body: UpdateRecordRequest = await request.json();
    
    // Determine required permission
    let requiredPermission: Permission = 'manage_records';
    if (body.status === 'pending_validation') {
      requiredPermission = 'review';
    } else if (body.status === 'verified') {
      requiredPermission = 'validate';
    }
    
    if (!(await hasProjectPermission(userId, project.id, requiredPermission))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (body.data !== undefined) {
      // Merge new data with existing
      const mergedData = { ...record.data, ...body.data };
      updates.push(`data = $${paramIndex++}`);
      values.push(JSON.stringify(mergedData));
    }
    
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
      
      // Update workflow timestamps
      if (body.status === 'pending_validation') {
        updates.push(`reviewed_by = $${paramIndex++}`);
        values.push(userId);
        updates.push(`reviewed_at = NOW()`);
      } else if (body.status === 'verified') {
        updates.push(`validated_by = $${paramIndex++}`);
        values.push(userId);
        updates.push(`validated_at = NOW()`);
      }
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(parseInt(recordId));
    
    const result = await pool.query(
      `UPDATE records 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/records/[recordId] - Soft delete record
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
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
    if (!(await hasProjectPermission(userId, project.id, 'delete_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Soft delete
    const result = await pool.query(
      `UPDATE records 
       SET deleted_at = NOW(), deleted_by = $1
       WHERE id = $2 AND project_id = $3 AND deleted_at IS NULL
       RETURNING id`,
      [userId, parseInt(recordId), project.id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { error: 'Failed to delete record' },
      { status: 500 }
    );
  }
}
