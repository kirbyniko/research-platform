import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug } from '@/lib/project-permissions';
import { CreateInfographicRequest, InfographicStatus, ROLE_PERMISSIONS, ProjectRole, Permission } from '@/types/platform';

// Helper to check role-based permission
function hasRolePermission(role: ProjectRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/infographics - List infographics
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const status = searchParams.get('status') as InfographicStatus | null;
    const scopeType = searchParams.get('scope_type');
    const recordTypeId = searchParams.get('record_type_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;
    
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
    
    // Check permission for viewing infographics
    if (!hasRolePermission(role, 'view_infographics')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Build query
    let whereClause = 'i.project_id = $1 AND i.deleted_at IS NULL';
    const queryParams: unknown[] = [project.id];
    let paramIndex = 2;
    
    // Filter by status
    if (status) {
      whereClause += ` AND i.status = $${paramIndex++}`;
      queryParams.push(status);
    }
    
    // Filter by scope type
    if (scopeType) {
      whereClause += ` AND i.scope_type = $${paramIndex++}`;
      queryParams.push(scopeType);
    }
    
    // Filter by record type
    if (recordTypeId) {
      whereClause += ` AND i.record_type_id = $${paramIndex++}`;
      queryParams.push(parseInt(recordTypeId));
    }
    
    // For non-authenticated users or viewers, only show published public infographics
    if (!userId || role === 'viewer') {
      whereClause += ` AND i.status = 'published' AND i.is_public = true`;
    }
    
    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM infographics i
       WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Fetch infographics with joined data
    const infographicsResult = await pool.query(
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
       WHERE ${whereClause}
       ORDER BY i.updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );
    
    const infographics = infographicsResult.rows.map(row => ({
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
      // Joined data
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
    }));
    
    return NextResponse.json({
      infographics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing infographics:', error);
    return NextResponse.json(
      { error: 'Failed to list infographics' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/infographics - Create infographic
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    
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
    if (!hasRolePermission(role, 'create_infographics')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    const body: CreateInfographicRequest = await request.json();
    
    // Validate required fields
    if (!body.name || !body.component_type || !body.scope_type) {
      return NextResponse.json(
        { error: 'Name, component_type, and scope_type are required' },
        { status: 400 }
      );
    }
    
    // Validate scope
    if (body.scope_type === 'record' && !body.record_id) {
      return NextResponse.json(
        { error: 'record_id is required for record scope' },
        { status: 400 }
      );
    }
    if (body.scope_type === 'record_type' && !body.record_type_id) {
      return NextResponse.json(
        { error: 'record_type_id is required for record_type scope' },
        { status: 400 }
      );
    }
    
    // Generate slug if not provided
    const infographicSlug = body.slug || body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check slug uniqueness within project
    const existingSlug = await pool.query(
      `SELECT id FROM infographics WHERE project_id = $1 AND slug = $2 AND deleted_at IS NULL`,
      [project.id, infographicSlug]
    );
    
    if (existingSlug.rows.length > 0) {
      return NextResponse.json(
        { error: 'An infographic with this slug already exists' },
        { status: 409 }
      );
    }
    
    // Default config based on component type
    const defaultConfig = getDefaultConfig(body.component_type);
    const config = body.config ? { ...defaultConfig, ...body.config } : defaultConfig;
    
    // Insert infographic
    const insertResult = await pool.query(
      `INSERT INTO infographics (
        project_id, name, slug, description,
        scope_type, record_id, record_type_id,
        component_type, config, narrative_content,
        status, is_public, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        project.id,
        body.name,
        infographicSlug,
        body.description || null,
        body.scope_type,
        body.record_id || null,
        body.record_type_id || null,
        body.component_type,
        JSON.stringify(config),
        JSON.stringify(body.narrative_content || []),
        'draft',
        false,
        user.id
      ]
    );
    
    const infographic = insertResult.rows[0];
    
    // Create initial version
    await pool.query(
      `INSERT INTO infographic_versions (
        infographic_id, version_number, config, narrative_content, changed_by, change_note
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        infographic.id,
        1,
        JSON.stringify(config),
        JSON.stringify(body.narrative_content || []),
        user.id,
        'Initial creation'
      ]
    );
    
    return NextResponse.json({
      infographic: {
        ...infographic,
        creator: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating infographic:', error);
    
    // Return detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Failed to create infographic';
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to get default config for component types
function getDefaultConfig(componentType: string): Record<string, unknown> {
  const configs: Record<string, Record<string, unknown>> = {
    'dot-grid': {
      dotSize: 8,
      dotSpacing: 4,
      dotColor: '#dc2626',
      dotShape: 'circle',
      showLegend: true,
      legendPosition: 'bottom',
      showCount: true,
      animation: {
        enabled: true,
        type: 'scatter',
        duration: 1500,
        staggerDelay: 10
      }
    },
    'counter': {
      fontSize: 72,
      fontWeight: 'bold',
      color: '#dc2626',
      prefix: '',
      suffix: '',
      animateOnScroll: true,
      duration: 2000,
      animation: {
        enabled: true,
        type: 'fade',
        duration: 500
      }
    },
    'scrollytelling': {
      scenes: [],
      stickyContent: 'visualization',
      transitionType: 'fade',
      animation: {
        enabled: true,
        type: 'fade',
        duration: 500
      }
    },
    'timeline': {
      dateField: 'date',
      orientation: 'vertical',
      showDots: true,
      showLines: true,
      dotColor: '#dc2626',
      lineColor: '#e5e7eb',
      animation: {
        enabled: true,
        type: 'slide',
        duration: 800
      }
    },
    'bar-chart': {
      groupBy: '',
      aggregation: 'count',
      orientation: 'horizontal',
      barColor: '#dc2626',
      showLabels: true,
      showValues: true,
      sortBy: 'value',
      sortDirection: 'desc',
      animation: {
        enabled: true,
        type: 'scale',
        duration: 800
      }
    },
    'comparison': {
      leftPanel: {
        label: 'Group A',
        config: { dotSize: 8, dotColor: '#dc2626' }
      },
      rightPanel: {
        label: 'Group B',
        config: { dotSize: 8, dotColor: '#2563eb' }
      },
      showDifference: true,
      animation: {
        enabled: true,
        type: 'fade',
        duration: 800
      }
    },
    'map': {
      backgroundColor: '#f3f4f6',
      animation: {
        enabled: true,
        type: 'fade',
        duration: 500
      }
    }
  };
  
  return configs[componentType] || {};
}
