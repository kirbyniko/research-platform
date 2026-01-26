import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug } from '@/lib/project-permissions';
import { UpdateInfographicRequest, ROLE_PERMISSIONS, ProjectRole, Permission } from '@/types/platform';

// Helper to check role-based permission
function hasRolePermission(role: ProjectRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

// GET /api/projects/[slug]/infographics/[id] - Get single infographic
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, id } = await params;
    const infographicId = parseInt(id);
    
    if (isNaN(infographicId)) {
      return NextResponse.json({ error: 'Invalid infographic ID' }, { status: 400 });
    }
    
    // Try to get auth (optional for public infographics)
    let userId: number | undefined;
    try {
      const authResult = await requireServerAuth(request);
      if (!('error' in authResult)) {
        userId = authResult.user.id;
      }
    } catch {
      // No auth, continue for public infographics
    }
    
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project, role } = result;
    
    // Fetch infographic
    const infographicResult = await pool.query(
      `SELECT 
        i.*,
        rt.slug as record_type_slug,
        rt.name as record_type_name,
        u.name as creator_name,
        u.email as creator_email,
        v.name as verifier_name
       FROM infographics i
       LEFT JOIN record_types rt ON i.record_type_id = rt.id
       LEFT JOIN users u ON i.created_by = u.id
       LEFT JOIN users v ON i.verified_by = v.id
       WHERE i.id = $1 AND i.project_id = $2 AND i.deleted_at IS NULL`,
      [infographicId, project.id]
    );
    
    if (infographicResult.rows.length === 0) {
      return NextResponse.json({ error: 'Infographic not found' }, { status: 404 });
    }
    
    const row = infographicResult.rows[0];
    
    // Check if user can view this infographic
    const isPublished = row.status === 'published' && row.is_public;
    if (!isPublished && (!userId || !hasRolePermission(role, 'view_infographics'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    const infographic = {
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      scope_type: row.scope_type,
      record_id: row.record_id,
      record_type_id: row.record_type_id,
      component_type: row.component_type,
      config: row.config,
      narrative_content: row.narrative_content || [],
      status: row.status,
      is_public: row.is_public,
      published_at: row.published_at,
      verification_status: row.verification_status,
      verified_by: row.verified_by,
      verified_at: row.verified_at,
      verification_notes: row.verification_notes,
      allow_embed: row.allow_embed,
      embed_domains: row.embed_domains,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      record_type: row.record_type_id ? {
        id: row.record_type_id,
        slug: row.record_type_slug,
        name: row.record_type_name
      } : undefined,
      creator: {
        id: row.created_by,
        name: row.creator_name,
        email: row.creator_email
      },
      verifier: row.verified_by ? {
        id: row.verified_by,
        name: row.verifier_name
      } : undefined
    };
    
    return NextResponse.json({ infographic });
  } catch (error) {
    console.error('Error fetching infographic:', error);
    return NextResponse.json(
      { error: 'Failed to fetch infographic' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[slug]/infographics/[id] - Update infographic
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, id } = await params;
    const infographicId = parseInt(id);
    
    if (isNaN(infographicId)) {
      return NextResponse.json({ error: 'Invalid infographic ID' }, { status: 400 });
    }
    
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { user } = authResult;
    
    const result = await getProjectBySlug(slug, user.id);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project, role } = result;
    
    // Check permission
    if (!hasRolePermission(role, 'edit_infographics')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Fetch current infographic
    const currentResult = await pool.query(
      `SELECT * FROM infographics WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`,
      [infographicId, project.id]
    );
    
    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Infographic not found' }, { status: 404 });
    }
    
    const current = currentResult.rows[0];
    const body: UpdateInfographicRequest = await request.json();
    
    // Check if trying to change status to published
    if (body.status === 'published' && current.status !== 'published') {
      if (!hasRolePermission(role, 'publish_infographics')) {
        return NextResponse.json(
          { error: 'Permission denied: cannot publish' },
          { status: 403 }
        );
      }
    }
    
    // Check slug uniqueness if changing
    if (body.slug && body.slug !== current.slug) {
      const existingSlug = await pool.query(
        `SELECT id FROM infographics WHERE project_id = $1 AND slug = $2 AND id != $3 AND deleted_at IS NULL`,
        [project.id, body.slug, infographicId]
      );
      
      if (existingSlug.rows.length > 0) {
        return NextResponse.json(
          { error: 'An infographic with this slug already exists' },
          { status: 409 }
        );
      }
    }
    
    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(body.slug);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.component_type !== undefined) {
      updates.push(`component_type = $${paramIndex++}`);
      values.push(body.component_type);
    }
    if (body.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(body.config));
    }
    if (body.narrative_content !== undefined) {
      updates.push(`narrative_content = $${paramIndex++}`);
      values.push(JSON.stringify(body.narrative_content));
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
      
      // Set published_at if publishing
      if (body.status === 'published' && current.status !== 'published') {
        updates.push(`published_at = NOW()`);
      }
    }
    if (body.is_public !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(body.is_public);
    }
    if (body.allow_embed !== undefined) {
      updates.push(`allow_embed = $${paramIndex++}`);
      values.push(body.allow_embed);
    }
    if (body.embed_domains !== undefined) {
      updates.push(`embed_domains = $${paramIndex++}`);
      values.push(body.embed_domains);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ infographic: current });
    }
    
    // Update infographic
    values.push(infographicId, project.id);
    const updateResult = await pool.query(
      `UPDATE infographics SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND project_id = $${paramIndex++}
       RETURNING *`,
      values
    );
    
    const updated = updateResult.rows[0];
    
    // Create new version if config or narrative changed
    if (body.config !== undefined || body.narrative_content !== undefined) {
      // Get current max version number
      const versionResult = await pool.query(
        `SELECT COALESCE(MAX(version_number), 0) as max_version FROM infographic_versions WHERE infographic_id = $1`,
        [infographicId]
      );
      const nextVersion = parseInt(versionResult.rows[0].max_version) + 1;
      
      await pool.query(
        `INSERT INTO infographic_versions (
          infographic_id, version_number, config, narrative_content, changed_by, change_note
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          infographicId,
          nextVersion,
          JSON.stringify(updated.config),
          JSON.stringify(updated.narrative_content),
          user.id,
          'Updated via editor'
        ]
      );
    }
    
    return NextResponse.json({ infographic: updated });
  } catch (error) {
    console.error('Error updating infographic:', error);
    return NextResponse.json(
      { error: 'Failed to update infographic' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/infographics/[id] - Soft delete infographic
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, id } = await params;
    const infographicId = parseInt(id);
    
    if (isNaN(infographicId)) {
      return NextResponse.json({ error: 'Invalid infographic ID' }, { status: 400 });
    }
    
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { user } = authResult;
    
    const result = await getProjectBySlug(slug, user.id);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project, role } = result;
    
    // Only admin/owner can delete
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Soft delete
    const deleteResult = await pool.query(
      `UPDATE infographics SET deleted_at = NOW()
       WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [infographicId, project.id]
    );
    
    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Infographic not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting infographic:', error);
    return NextResponse.json(
      { error: 'Failed to delete infographic' },
      { status: 500 }
    );
  }
}
