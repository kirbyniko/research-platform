import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string; sourceId: string }>;
}

interface UpdateSourceRequest {
  url?: string;
  title?: string;
  source_type?: string;
  accessed_date?: string;
  archived_url?: string;
  notes?: string;
  linked_fields?: string[];
}

// GET /api/projects/[slug]/records/[recordId]/sources/[sourceId]
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, sourceId } = await params;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Get source
    const sourceResult = await pool.query(
      `SELECT rs.*, u.name as created_by_name
       FROM record_sources rs
       LEFT JOIN users u ON rs.created_by = u.id
       WHERE rs.id = $1 AND rs.record_id = $2 AND rs.project_id = $3`,
      [parseInt(sourceId), parseInt(recordId), project.id]
    );
    
    if (sourceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    
    return NextResponse.json({ source: sourceResult.rows[0] });
  } catch (error) {
    console.error('Error fetching source:', error);
    return NextResponse.json(
      { error: 'Failed to fetch source' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/records/[recordId]/sources/[sourceId]
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, sourceId } = await params;
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
    
    // Verify source exists
    const sourceResult = await pool.query(
      'SELECT * FROM record_sources WHERE id = $1 AND record_id = $2 AND project_id = $3',
      [parseInt(sourceId), parseInt(recordId), project.id]
    );
    
    if (sourceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    
    const body: UpdateSourceRequest = await request.json();
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (body.url !== undefined) {
      // Validate URL
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
      updates.push(`url = $${paramIndex++}`);
      values.push(body.url.trim());
    }
    
    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(body.title);
    }
    
    if (body.source_type !== undefined) {
      updates.push(`source_type = $${paramIndex++}`);
      values.push(body.source_type);
    }
    
    if (body.accessed_date !== undefined) {
      updates.push(`accessed_date = $${paramIndex++}`);
      values.push(body.accessed_date);
    }
    
    if (body.archived_url !== undefined) {
      updates.push(`archived_url = $${paramIndex++}`);
      values.push(body.archived_url);
    }
    
    if (body.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(body.notes);
    }
    
    if (body.linked_fields !== undefined) {
      updates.push(`linked_fields = $${paramIndex++}`);
      values.push(body.linked_fields);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(parseInt(sourceId));
    
    const result = await pool.query(
      `UPDATE record_sources 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({ source: result.rows[0] });
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/records/[recordId]/sources/[sourceId]
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, sourceId } = await params;
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
    
    // Delete source
    const result = await pool.query(
      'DELETE FROM record_sources WHERE id = $1 AND record_id = $2 AND project_id = $3 RETURNING id',
      [parseInt(sourceId), parseInt(recordId), project.id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}
