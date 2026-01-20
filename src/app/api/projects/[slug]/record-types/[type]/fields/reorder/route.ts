import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; type: string }>;
}

interface ReorderItem {
  id: number;
  sort_order: number;
}

// POST /api/projects/[slug]/record-types/[type]/fields/reorder - Reorder fields
export async function POST(
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
    
    const body: { fields: ReorderItem[] } = await request.json();
    
    if (!body.fields || !Array.isArray(body.fields)) {
      return NextResponse.json(
        { error: 'fields array is required' },
        { status: 400 }
      );
    }
    
    // Validate all fields belong to this record type
    const fieldIds = body.fields.map(f => f.id);
    const existingFields = await pool.query(
      'SELECT id FROM field_definitions WHERE record_type_id = $1 AND id = ANY($2)',
      [recordType.id, fieldIds]
    );
    
    if (existingFields.rows.length !== fieldIds.length) {
      return NextResponse.json(
        { error: 'Some field IDs do not belong to this record type' },
        { status: 400 }
      );
    }
    
    // Update sort orders in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const item of body.fields) {
        await client.query(
          'UPDATE field_definitions SET sort_order = $1, updated_at = NOW() WHERE id = $2',
          [item.sort_order, item.id]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    // Return updated fields
    const updatedFields = await pool.query(
      `SELECT * FROM field_definitions 
       WHERE record_type_id = $1 
       ORDER BY sort_order, name`,
      [recordType.id]
    );
    
    return NextResponse.json({ fields: updatedFields.rows });
  } catch (error) {
    console.error('Error reordering fields:', error);
    return NextResponse.json(
      { error: 'Failed to reorder fields' },
      { status: 500 }
    );
  }
}
