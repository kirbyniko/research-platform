import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; type: string }>;
}

// GET /api/projects/[slug]/record-types/[type]/groups - List all groups
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

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

    // Get groups
    const groupsResult = await pool.query(
      `SELECT * FROM field_groups
       WHERE record_type_id = $1
       ORDER BY sort_order, name`,
      [recordType.id]
    );

    return NextResponse.json({ groups: groupsResult.rows });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/record-types/[type]/groups - Create a new group
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
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Auto-generate slug from name if not provided
    const groupSlug = (body.slug?.trim() || body.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100));

    if (!groupSlug) {
      return NextResponse.json({ error: 'Could not generate slug from name' }, { status: 400 });
    }

    // Check for duplicate slug
    const existingResult = await pool.query(
      'SELECT id FROM field_groups WHERE record_type_id = $1 AND slug = $2',
      [recordType.id, groupSlug]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'A group with this slug already exists' }, { status: 400 });
    }

    // Get max sort_order
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM field_groups WHERE record_type_id = $1',
      [recordType.id]
    );

    const sortOrder = body.sort_order ?? (maxOrderResult.rows[0].max_order + 1);

    // Create group
    console.log('Creating group with:', { recordTypeId: recordType.id, name: body.name.trim(), groupSlug, sortOrder });
    const result = await pool.query(
      `INSERT INTO field_groups (record_type_id, name, slug, description, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        recordType.id,
        body.name.trim(),
        groupSlug,
        body.description?.trim() || null,
        sortOrder,
      ]
    );

    return NextResponse.json({ group: result.rows[0] });
  } catch (error) {
    console.error('Error creating group:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create group', details: errorMessage },
      { status: 500 }
    );
  }
}
