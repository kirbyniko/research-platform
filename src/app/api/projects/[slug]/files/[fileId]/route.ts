import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; fileId: string }>;
}

// GET /api/projects/[slug]/files/[fileId] - Get file details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, fileId } = await params;
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
    
    const fileResult = await pool.query(
      `SELECT pf.*, u.name as uploaded_by_name
       FROM project_files pf
       LEFT JOIN users u ON pf.uploaded_by = u.id
       WHERE pf.id = $1 AND pf.project_id = $2`,
      [fileId, project.id]
    );
    
    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    return NextResponse.json({ file: fileResult.rows[0] });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/files/[fileId] - Confirm upload or update metadata
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, fileId } = await params;
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
    
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { status, cdnUrl, checksum, width, height, duration_seconds, metadata } = body;
    
    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    
    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
      
      // If confirming upload (pending -> active), update storage usage
      if (status === 'active') {
        const fileCheck = await pool.query(
          `SELECT size_bytes, status FROM project_files WHERE id = $1 AND project_id = $2`,
          [fileId, project.id]
        );
        
        if (fileCheck.rows.length > 0 && fileCheck.rows[0].status === 'pending') {
          const sizeBytes = fileCheck.rows[0].size_bytes;
          
          // Upsert storage usage
          await pool.query(
            `INSERT INTO project_storage_usage (project_id, bytes_used, file_count, last_updated)
             VALUES ($1, $2, 1, NOW())
             ON CONFLICT (project_id) 
             DO UPDATE SET 
               bytes_used = project_storage_usage.bytes_used + $2,
               file_count = project_storage_usage.file_count + 1,
               last_updated = NOW()`,
            [project.id, sizeBytes]
          );
          
          // Update bandwidth
          const periodStart = new Date();
          periodStart.setDate(1);
          periodStart.setHours(0, 0, 0, 0);
          
          await pool.query(
            `INSERT INTO project_bandwidth_usage (project_id, period_start, bytes_uploaded)
             VALUES ($1, $2, $3)
             ON CONFLICT (project_id, period_start) 
             DO UPDATE SET bytes_uploaded = project_bandwidth_usage.bytes_uploaded + $3`,
            [project.id, periodStart.toISOString().split('T')[0], sizeBytes]
          );
        }
      }
    }
    
    if (cdnUrl !== undefined) {
      updates.push(`cdn_url = $${idx++}`);
      values.push(cdnUrl);
    }
    
    if (checksum !== undefined) {
      updates.push(`checksum = $${idx++}`);
      values.push(checksum);
    }
    
    if (width !== undefined) {
      updates.push(`width = $${idx++}`);
      values.push(width);
    }
    
    if (height !== undefined) {
      updates.push(`height = $${idx++}`);
      values.push(height);
    }
    
    if (duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${idx++}`);
      values.push(duration_seconds);
    }
    
    if (metadata !== undefined) {
      updates.push(`metadata = $${idx++}`);
      values.push(JSON.stringify(metadata));
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    values.push(fileId);
    values.push(project.id);
    
    const updateResult = await pool.query(
      `UPDATE project_files 
       SET ${updates.join(', ')}
       WHERE id = $${idx++} AND project_id = $${idx}
       RETURNING *`,
      values
    );
    
    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    return NextResponse.json({ file: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/files/[fileId] - Soft delete file
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, fileId } = await params;
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
    
    if (!(await hasProjectPermission(userId, project.id, 'delete_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get file info before deleting
    const fileCheck = await pool.query(
      `SELECT id, size_bytes, status FROM project_files 
       WHERE id = $1 AND project_id = $2 AND status != 'deleted'`,
      [fileId, project.id]
    );
    
    if (fileCheck.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const file = fileCheck.rows[0];
    
    // Soft delete
    await pool.query(
      `UPDATE project_files 
       SET status = 'deleted', deleted_at = NOW(), deleted_by = $1
       WHERE id = $2`,
      [userId, fileId]
    );
    
    // Update storage usage if file was active
    if (file.status === 'active') {
      await pool.query(
        `UPDATE project_storage_usage 
         SET bytes_used = GREATEST(0, bytes_used - $1),
             file_count = GREATEST(0, file_count - 1),
             last_updated = NOW()
         WHERE project_id = $2`,
        [file.size_bytes, project.id]
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'File deleted',
      bytesFreed: file.status === 'active' ? file.size_bytes : 0
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
