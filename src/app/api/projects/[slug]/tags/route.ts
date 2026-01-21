import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/projects/[slug]/tags - List all project tags
export async function GET(
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
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    // Check view permission
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all tags for project, grouped by category
    const tagsResult = await pool.query(
      `SELECT pt.*, u.name as created_by_name
       FROM project_tags pt
       LEFT JOIN users u ON pt.created_by = u.id
       WHERE pt.project_id = $1
       ORDER BY pt.category NULLS LAST, pt.sort_order, pt.name`,
      [project.id]
    );
    
    // Group by category for convenience
    const tags = tagsResult.rows;
    const categories: Record<string, typeof tags> = {};
    const uncategorized: typeof tags = [];
    
    tags.forEach(tag => {
      if (tag.category) {
        if (!categories[tag.category]) {
          categories[tag.category] = [];
        }
        categories[tag.category].push(tag);
      } else {
        uncategorized.push(tag);
      }
    });
    
    return NextResponse.json({ 
      tags,
      byCategory: { ...categories, uncategorized },
      tagsEnabled: project.tags_enabled ?? true
    });
  } catch (error) {
    console.error('Error fetching project tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/tags - Create a new tag
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
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    // Check manage permission (admin or owner)
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden - requires admin access' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, category, color, description, sort_order } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }
    
    const tagSlug = generateSlug(name.trim());
    
    // Check for duplicate slug
    const existing = await pool.query(
      'SELECT id FROM project_tags WHERE project_id = $1 AND slug = $2',
      [project.id, tagSlug]
    );
    
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
    }
    
    // Insert new tag
    const insertResult = await pool.query(
      `INSERT INTO project_tags (project_id, name, slug, category, color, description, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        project.id,
        name.trim(),
        tagSlug,
        category?.trim() || null,
        color || '#6b7280',
        description?.trim() || null,
        sort_order || 0,
        userId
      ]
    );
    
    return NextResponse.json({ tag: insertResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/tags - Bulk update tags (for reordering)
export async function PATCH(
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
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    // Check manage permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { tags } = body;
    
    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: 'Tags array is required' }, { status: 400 });
    }
    
    // Update sort_order for each tag
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const tag of tags) {
        if (tag.id && typeof tag.sort_order === 'number') {
          await client.query(
            `UPDATE project_tags 
             SET sort_order = $1, category = COALESCE($2, category)
             WHERE id = $3 AND project_id = $4`,
            [tag.sort_order, tag.category, tag.id, project.id]
          );
        }
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tags:', error);
    return NextResponse.json(
      { error: 'Failed to update tags' },
      { status: 500 }
    );
  }
}
