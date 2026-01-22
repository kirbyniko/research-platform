import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/settings/workflow - Get workflow settings
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
    
    // Get project
    const projectResult = await pool.query(
      `SELECT 
        id,
        slug,
        name,
        require_validation,
        require_different_validator,
        propose_edits_instant,
        third_party_verification_enabled,
        verification_quota_monthly,
        verification_quota_used,
        verification_quota_reset_date,
        trust_score
       FROM projects 
       WHERE slug = $1 AND deleted_at IS NULL`,
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission - need to be at least a viewer to see settings
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({
      workflow: {
        require_validation: project.require_validation ?? true,
        require_different_validator: project.require_different_validator ?? false,
        propose_edits_instant: project.propose_edits_instant ?? false,
      },
      verification: {
        enabled: project.third_party_verification_enabled ?? false,
        quota_monthly: project.verification_quota_monthly ?? 5,
        quota_used: project.verification_quota_used ?? 0,
        quota_reset_date: project.verification_quota_reset_date,
      },
      trust_score: project.trust_score,
    });
  } catch (error) {
    console.error('Error fetching workflow settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/settings/workflow - Update workflow settings
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
    
    // Get project
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission - need manage_project (owner/admin only)
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    // Workflow settings
    if (body.require_validation !== undefined) {
      updates.push(`require_validation = $${paramIndex++}`);
      values.push(body.require_validation);
    }
    
    if (body.require_different_validator !== undefined) {
      updates.push(`require_different_validator = $${paramIndex++}`);
      values.push(body.require_different_validator);
    }
    
    if (body.propose_edits_instant !== undefined) {
      updates.push(`propose_edits_instant = $${paramIndex++}`);
      values.push(body.propose_edits_instant);
    }
    
    // Verification settings (only if enabled by plan)
    if (body.third_party_verification_enabled !== undefined) {
      updates.push(`third_party_verification_enabled = $${paramIndex++}`);
      values.push(body.third_party_verification_enabled);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(project.id);
    
    const result = await pool.query(
      `UPDATE projects 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING 
         require_validation,
         require_different_validator,
         propose_edits_instant,
         third_party_verification_enabled,
         verification_quota_monthly,
         verification_quota_used`,
      values
    );
    
    const updated = result.rows[0];
    
    return NextResponse.json({
      workflow: {
        require_validation: updated.require_validation ?? true,
        require_different_validator: updated.require_different_validator ?? false,
        propose_edits_instant: updated.propose_edits_instant ?? false,
      },
      verification: {
        enabled: updated.third_party_verification_enabled ?? false,
        quota_monthly: updated.verification_quota_monthly ?? 5,
        quota_used: updated.verification_quota_used ?? 0,
      },
    });
  } catch (error) {
    console.error('Error updating workflow settings:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow settings' },
      { status: 500 }
    );
  }
}
