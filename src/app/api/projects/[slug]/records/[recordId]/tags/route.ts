import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

// GET /api/projects/[slug]/records/[recordId]/tags - Get tags on a record
export async function GET(
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
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get tags for this record
    const tagsResult = await pool.query(
      `SELECT pt.*, rt.added_at, u.name as added_by_name
       FROM record_tags rt
       JOIN project_tags pt ON rt.tag_id = pt.id
       LEFT JOIN users u ON rt.added_by = u.id
       WHERE rt.record_id = $1 AND pt.project_id = $2
       ORDER BY pt.category NULLS LAST, pt.sort_order, pt.name`,
      [recordId, project.id]
    );
    
    return NextResponse.json({ tags: tagsResult.rows });
  } catch (error) {
    console.error('Error fetching record tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/records/[recordId]/tags - Add tags to a record
export async function POST(
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
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    // Need manage_records permission to add tags
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify record exists and belongs to project
    const recordCheck = await pool.query(
      `SELECT r.id FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       WHERE r.id = $1 AND rt.project_id = $2`,
      [recordId, project.id]
    );
    
    if (recordCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { tagIds } = body; // Array of tag IDs to add
    
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ error: 'tagIds array is required' }, { status: 400 });
    }
    
    // Verify all tags belong to this project
    const validTags = await pool.query(
      'SELECT id FROM project_tags WHERE id = ANY($1) AND project_id = $2',
      [tagIds, project.id]
    );
    
    const validTagIds = validTags.rows.map(t => t.id);
    
    if (validTagIds.length === 0) {
      return NextResponse.json({ error: 'No valid tags provided' }, { status: 400 });
    }
    
    // Insert tags (ignore duplicates)
    const insertPromises = validTagIds.map(tagId =>
      pool.query(
        `INSERT INTO record_tags (record_id, tag_id, added_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (record_id, tag_id) DO NOTHING
         RETURNING *`,
        [recordId, tagId, userId]
      )
    );
    
    await Promise.all(insertPromises);
    
    // Return updated tags list
    const updatedTags = await pool.query(
      `SELECT pt.*, rt.added_at, u.name as added_by_name
       FROM record_tags rt
       JOIN project_tags pt ON rt.tag_id = pt.id
       LEFT JOIN users u ON rt.added_by = u.id
       WHERE rt.record_id = $1
       ORDER BY pt.category NULLS LAST, pt.sort_order, pt.name`,
      [recordId]
    );
    
    return NextResponse.json({ 
      success: true,
      tags: updatedTags.rows,
      addedCount: validTagIds.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding tags to record:', error);
    return NextResponse.json(
      { error: 'Failed to add tags' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/records/[recordId]/tags - Remove tags from a record
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
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { tagIds } = body;
    
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ error: 'tagIds array is required' }, { status: 400 });
    }
    
    // Delete the record_tags entries
    const deleteResult = await pool.query(
      `DELETE FROM record_tags 
       WHERE record_id = $1 AND tag_id = ANY($2)
       RETURNING tag_id`,
      [recordId, tagIds]
    );
    
    // Return updated tags list
    const updatedTags = await pool.query(
      `SELECT pt.*, rt.added_at, u.name as added_by_name
       FROM record_tags rt
       JOIN project_tags pt ON rt.tag_id = pt.id
       LEFT JOIN users u ON rt.added_by = u.id
       WHERE rt.record_id = $1
       ORDER BY pt.category NULLS LAST, pt.sort_order, pt.name`,
      [recordId]
    );
    
    return NextResponse.json({ 
      success: true,
      tags: updatedTags.rows,
      removedCount: deleteResult.rowCount
    });
  } catch (error) {
    console.error('Error removing tags from record:', error);
    return NextResponse.json(
      { error: 'Failed to remove tags' },
      { status: 500 }
    );
  }
}
