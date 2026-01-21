import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/subscription - Get subscription details
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
    
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get subscription
    const subResult = await pool.query(
      `SELECT ps.*, sp.name as plan_name, sp.slug as plan_slug, 
              sp.storage_limit_bytes, sp.bandwidth_limit_bytes, 
              sp.max_file_size_bytes, sp.price_cents, sp.features
       FROM project_subscriptions ps
       JOIN storage_plans sp ON ps.plan_id = sp.id
       WHERE ps.project_id = $1`,
      [project.id]
    );
    
    // Get available plans
    const plansResult = await pool.query(
      `SELECT * FROM storage_plans WHERE is_active = true ORDER BY sort_order`
    );
    
    return NextResponse.json({
      subscription: subResult.rows[0] || null,
      availablePlans: plansResult.rows
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/subscription - Create or update subscription (admin/manual)
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
    
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { planSlug, storageLimitOverride } = body;
    
    if (!planSlug) {
      return NextResponse.json({ error: 'planSlug is required' }, { status: 400 });
    }
    
    // Get plan
    const planResult = await pool.query(
      `SELECT * FROM storage_plans WHERE slug = $1 AND is_active = true`,
      [planSlug]
    );
    
    if (planResult.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    const plan = planResult.rows[0];
    
    // For paid plans, would normally redirect to Stripe checkout
    // For now, we allow manual assignment
    if (plan.price_cents > 0) {
      console.log(`[INFO] Assigning paid plan ${plan.name} to project ${project.id} - billing integration pending`);
    }
    
    // Upsert subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    
    const upsertResult = await pool.query(
      `INSERT INTO project_subscriptions 
        (project_id, plan_id, status, storage_limit_override_bytes, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', $3, $4, $5)
       ON CONFLICT (project_id) 
       DO UPDATE SET 
         plan_id = $2,
         status = 'active',
         storage_limit_override_bytes = $3,
         current_period_start = $4,
         current_period_end = $5,
         updated_at = NOW()
       RETURNING *`,
      [project.id, plan.id, storageLimitOverride || null, now.toISOString(), periodEnd.toISOString()]
    );
    
    // If upgrading to a plan with uploads, enable upload for owner
    if (plan.features?.uploads_enabled) {
      await pool.query(
        `UPDATE project_members SET can_upload = true 
         WHERE project_id = $1 AND role = 'owner'`,
        [project.id]
      );
    }
    
    return NextResponse.json({
      subscription: upsertResult.rows[0],
      plan,
      message: plan.price_cents > 0 
        ? 'Subscription assigned. Note: Billing integration pending - charges will apply once Stripe is configured.'
        : 'Subscription activated.'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/subscription - Cancel subscription
export async function DELETE(
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
    
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get free plan
    const freePlanResult = await pool.query(
      `SELECT id FROM storage_plans WHERE slug = 'free'`
    );
    
    if (freePlanResult.rows.length === 0) {
      return NextResponse.json({ error: 'Free plan not found' }, { status: 500 });
    }
    
    // Downgrade to free
    await pool.query(
      `UPDATE project_subscriptions 
       SET plan_id = $1, status = 'cancelled', updated_at = NOW()
       WHERE project_id = $2`,
      [freePlanResult.rows[0].id, project.id]
    );
    
    // Disable uploads for all members
    await pool.query(
      `UPDATE project_members SET can_upload = false WHERE project_id = $1`,
      [project.id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled. Downgraded to free plan. Existing files are preserved but new uploads are disabled.'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
