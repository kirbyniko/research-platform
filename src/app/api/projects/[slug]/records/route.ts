import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';
import { CreateRecordRequest, RecordStatus } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/records - List records
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const recordTypeSlug = searchParams.get('type');
    const status = searchParams.get('status') as RecordStatus | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;
    const search = searchParams.get('search');
    
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
    
    // Build query
    let whereClause = 'r.project_id = $1 AND r.deleted_at IS NULL';
    const queryParams: any[] = [project.id];
    let paramIndex = 2;
    
    // Filter by record type
    if (recordTypeSlug) {
      whereClause += ` AND rt.slug = $${paramIndex++}`;
      queryParams.push(recordTypeSlug);
    }
    
    // Filter by status
    if (status) {
      whereClause += ` AND r.status = $${paramIndex++}`;
      queryParams.push(status);
    }
    
    // Search in data (basic JSONB search)
    if (search) {
      whereClause += ` AND r.data::text ILIKE $${paramIndex++}`;
      queryParams.push(`%${search}%`);
    }
    
    // For non-authenticated users or viewers, only show verified records
    if (!userId || role === 'viewer') {
      whereClause += ` AND r.status = 'verified'`;
    }
    
    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Fetch records
    const recordsResult = await pool.query(
      `SELECT r.*, 
        rt.slug as record_type_slug,
        rt.name as record_type_name,
        u.name as submitted_by_name,
        u.email as submitted_by_email
       FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       LEFT JOIN users u ON r.submitted_by = u.id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );
    
    return NextResponse.json({
      records: recordsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      role
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/records - Create record
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const body: CreateRecordRequest = await request.json();
    
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
      [project.id, body.record_type_slug]
    );
    
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    const recordType = recordTypeResult.rows[0];
    
    // Check if guest submissions are enabled for this record type
    const isGuestSubmission = body.is_guest_submission === true;
    
    let userId: number | null = null;
    
    if (!isGuestSubmission) {
      // Require auth for non-guest submissions
      const authResult = await requireServerAuth(request);
      
      if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
      
      userId = authResult.user.id;
      
      // Check permission - manage_records allows creating records
      if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // Check if guest form is enabled
      const workflowConfig = recordType.workflow_config || {};
      if (workflowConfig.guest_form_enabled === false) {
        return NextResponse.json(
          { error: 'Guest submissions are not enabled for this record type' },
          { status: 403 }
        );
      }
    }
    
    // Validate required fields based on field definitions
    const fieldsResult = await pool.query(
      `SELECT * FROM field_definitions 
       WHERE record_type_id = $1 AND is_required = true`,
      [recordType.id]
    );
    
    const requiredFields = fieldsResult.rows;
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      // For guest submissions, only check fields visible in guest form
      if (isGuestSubmission) {
        const visibility = field.visibility || {};
        if (!visibility.guest_form) continue;
      }
      
      const value = body.data[field.key];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field.name);
      }
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Determine initial status based on workflow
    const workflowConfig = recordType.workflow_config || {};
    let initialStatus: RecordStatus = 'pending_review';
    
    if (!workflowConfig.requires_review && !workflowConfig.requires_validation) {
      initialStatus = 'verified';
    }
    
    // Create record
    const result = await pool.query(
      `INSERT INTO records (
        record_type_id, project_id, data, status,
        submitted_by, is_guest_submission, guest_email, guest_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        recordType.id,
        project.id,
        JSON.stringify(body.data),
        initialStatus,
        userId,
        isGuestSubmission,
        body.guest_email || null,
        body.guest_name || null
      ]
    );
    
    const record = result.rows[0];
    
    return NextResponse.json({ 
      record,
      message: isGuestSubmission 
        ? 'Thank you for your submission. It will be reviewed shortly.'
        : 'Record created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { error: 'Failed to create record' },
      { status: 500 }
    );
  }
}
