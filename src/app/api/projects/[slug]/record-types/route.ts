import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { 
  getProjectBySlug, 
  hasProjectPermission
} from '@/lib/project-permissions';
import { CreateRecordTypeRequest } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/record-types - List record types
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    
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
    
    const { project } = result;
    
    const recordTypesResult = await pool.query(
      `SELECT rt.*, 
        (SELECT COUNT(*) FROM records r WHERE r.record_type_id = rt.id AND r.deleted_at IS NULL) as record_count
       FROM record_types rt
       WHERE rt.project_id = $1
       ORDER BY rt.sort_order, rt.name`,
      [project.id]
    );
    
    return NextResponse.json({ recordTypes: recordTypesResult.rows });
  } catch (error) {
    console.error('Error fetching record types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch record types' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/record-types - Create record type
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
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
    
    const body: CreateRecordTypeRequest = await request.json();
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }
    
    // Check slug uniqueness within project
    const existingSlug = await pool.query(
      'SELECT id FROM record_types WHERE project_id = $1 AND slug = $2',
      [project.id, body.slug]
    );
    
    if (existingSlug.rows.length > 0) {
      return NextResponse.json(
        { error: 'A record type with this slug already exists in this project' },
        { status: 409 }
      );
    }
    
    // Get next sort order
    const maxSortResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_sort FROM record_types WHERE project_id = $1',
      [project.id]
    );
    const sortOrder = maxSortResult.rows[0].next_sort;
    
    // Create record type
    const result = await pool.query(
      `INSERT INTO record_types (
        project_id, name, slug, description, icon, color, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        project.id,
        body.name,
        body.slug,
        body.description || null,
        body.icon || null,
        body.color || null,
        sortOrder
      ]
    );
    
    return NextResponse.json({ recordType: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating record type:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to create record type',
        detail: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
