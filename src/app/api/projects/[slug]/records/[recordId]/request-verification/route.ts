import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission, getProjectBySlug } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

// POST /api/projects/[slug]/records/[recordId]/request-verification
// Request 3rd party verification for a record
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
    
    // Get project with verification settings
    const projectData = await getProjectBySlug(slug, userId);
    
    if (!projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = projectData;
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Check if member can request verification
    const memberResult = await pool.query(
      `SELECT can_request_verification, verification_quota_override
       FROM project_members 
       WHERE project_id = $1 AND user_id = $2`,
      [project.id, userId]
    );
    
    // Owners can always request
    const isOwner = project.created_by === userId;
    const member = memberResult.rows[0];
    
    if (!isOwner && (!member || !member.can_request_verification)) {
      return NextResponse.json(
        { error: 'You do not have permission to request verification' },
        { status: 403 }
      );
    }
    
    // Check verification quota
    const quotaUsed = project.verification_quota_used ?? 0;
    const quotaLimit = member?.verification_quota_override ?? project.verification_quota_monthly ?? 5;
    
    if (quotaUsed >= quotaLimit) {
      return NextResponse.json(
        { error: 'Verification quota exceeded for this month' },
        { status: 429 }
      );
    }
    
    // Get record
    const recordResult = await pool.query(
      `SELECT r.*, rt.name as record_type_name
       FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       WHERE r.id = $1 AND r.project_id = $2 AND r.deleted_at IS NULL`,
      [recordId, project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const record = recordResult.rows[0];
    
    // Record should be at least self-verified (passed review/validation)
    if (record.status !== 'verified') {
      return NextResponse.json(
        { error: 'Record must be verified before requesting 3rd party verification' },
        { status: 400 }
      );
    }
    
    // Check if there's already a pending verification request
    const existingRequest = await pool.query(
      `SELECT id FROM verification_requests 
       WHERE record_id = $1 AND status IN ('pending', 'in_progress')`,
      [recordId]
    );
    
    if (existingRequest.rows.length > 0) {
      return NextResponse.json(
        { error: 'A verification request is already pending for this record' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      verification_scope = 'record',  // 'record' or 'data'
      items_to_verify = null,         // For data-level: [{type, id, field_slug}]
      priority = 'normal',            // 'normal' or 'urgent'
      request_notes = null            // User notes
    } = body;
    
    // Validate scope
    if (!['record', 'data'].includes(verification_scope)) {
      return NextResponse.json(
        { error: 'Invalid verification scope. Must be "record" or "data"' },
        { status: 400 }
      );
    }
    
    // For data-level verification, items_to_verify is required
    if (verification_scope === 'data' && (!items_to_verify || !Array.isArray(items_to_verify) || items_to_verify.length === 0)) {
      return NextResponse.json(
        { error: 'For data-level verification, items_to_verify array is required' },
        { status: 400 }
      );
    }
    
    // Create verification request
    const insertResult = await pool.query(
      `INSERT INTO verification_requests (
        project_id, record_id, requested_by, priority, request_notes,
        verification_scope, items_to_verify, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        project.id,
        recordId,
        userId,
        priority,
        request_notes,
        verification_scope,
        items_to_verify ? JSON.stringify(items_to_verify) : null
      ]
    );
    
    // Increment quota used
    await pool.query(
      `UPDATE projects SET verification_quota_used = verification_quota_used + 1 WHERE id = $1`,
      [project.id]
    );
    
    // Log to verification history
    await pool.query(
      `INSERT INTO verification_history (record_id, action, details, performed_by)
       VALUES ($1, 'verification_requested', $2, $3)`,
      [
        recordId,
        JSON.stringify({
          request_id: insertResult.rows[0].id,
          scope: verification_scope,
          priority
        }),
        userId
      ]
    );
    
    return NextResponse.json({
      success: true,
      request: insertResult.rows[0],
      message: `Verification request submitted for ${verification_scope === 'record' ? 'entire record' : 'selected data items'}`
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating verification request:', error);
    return NextResponse.json(
      { error: 'Failed to create verification request' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[slug]/records/[recordId]/request-verification
// Get verification status for a record
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
    
    // Get project
    const projectData = await getProjectBySlug(slug, userId);
    
    if (!projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = projectData;
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get record with verification info
    const recordResult = await pool.query(
      `SELECT 
        r.id,
        r.verification_level,
        r.verification_scope,
        r.verification_date,
        r.status
       FROM records r
       WHERE r.id = $1 AND r.project_id = $2 AND r.deleted_at IS NULL`,
      [recordId, project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const record = recordResult.rows[0];
    
    // Get pending/active verification requests
    const requestsResult = await pool.query(
      `SELECT 
        vr.*,
        u.email as requested_by_email
       FROM verification_requests vr
       LEFT JOIN users u ON vr.requested_by = u.id
       WHERE vr.record_id = $1
       ORDER BY vr.requested_at DESC`,
      [recordId]
    );
    
    // Get verification results for this record
    const resultsResult = await pool.query(
      `SELECT vres.*
       FROM verification_results vres
       JOIN verification_requests vreq ON vres.request_id = vreq.id
       WHERE vreq.record_id = $1
       ORDER BY vres.verification_date DESC`,
      [recordId]
    );
    
    return NextResponse.json({
      record: {
        verification_level: record.verification_level ?? 0,
        verification_scope: record.verification_scope,
        verification_date: record.verification_date,
        status: record.status,
      },
      requests: requestsResult.rows,
      results: resultsResult.rows,
      verification_level_names: {
        0: 'Unverified',
        1: 'Self-Verified',
        2: 'Audit-Ready',
        3: '3rd Party Verified'
      }
    });
    
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}
