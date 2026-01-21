import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface StoragePlan {
  id: number;
  name: string;
  slug: string;
  storage_limit_bytes: number;
  bandwidth_limit_bytes: number | null;
  max_file_size_bytes: number;
  price_cents: number;
  features: Record<string, any>;
}

interface Subscription {
  plan: StoragePlan;
  status: string;
  storage_limit_override_bytes: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface StorageUsage {
  bytes_used: number;
  file_count: number;
  bytes_limit: number;
  percentage_used: number;
  uploads_enabled: boolean;
}

// GET /api/projects/[slug]/storage - Get storage usage and subscription info
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
    
    // Get subscription (or default to free)
    const subResult = await pool.query(
      `SELECT ps.*, sp.*
       FROM project_subscriptions ps
       JOIN storage_plans sp ON ps.plan_id = sp.id
       WHERE ps.project_id = $1`,
      [project.id]
    );
    
    let subscription: Subscription;
    if (subResult.rows.length > 0) {
      const row = subResult.rows[0];
      subscription = {
        plan: {
          id: row.plan_id,
          name: row.name,
          slug: row.slug,
          storage_limit_bytes: row.storage_limit_bytes,
          bandwidth_limit_bytes: row.bandwidth_limit_bytes,
          max_file_size_bytes: row.max_file_size_bytes,
          price_cents: row.price_cents,
          features: row.features || {}
        },
        status: row.status,
        storage_limit_override_bytes: row.storage_limit_override_bytes,
        current_period_start: row.current_period_start,
        current_period_end: row.current_period_end
      };
    } else {
      // Default to free plan
      const freePlan = await pool.query(
        `SELECT * FROM storage_plans WHERE slug = 'free'`
      );
      const plan = freePlan.rows[0];
      subscription = {
        plan: {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          storage_limit_bytes: plan.storage_limit_bytes,
          bandwidth_limit_bytes: plan.bandwidth_limit_bytes,
          max_file_size_bytes: plan.max_file_size_bytes,
          price_cents: plan.price_cents,
          features: plan.features || {}
        },
        status: 'active',
        storage_limit_override_bytes: null,
        current_period_start: null,
        current_period_end: null
      };
    }
    
    // Get current usage
    const usageResult = await pool.query(
      `SELECT bytes_used, file_count 
       FROM project_storage_usage 
       WHERE project_id = $1`,
      [project.id]
    );
    
    const bytesUsed = usageResult.rows.length > 0 ? Number(usageResult.rows[0].bytes_used) : 0;
    const fileCount = usageResult.rows.length > 0 ? Number(usageResult.rows[0].file_count) : 0;
    const bytesLimit = subscription.storage_limit_override_bytes || subscription.plan.storage_limit_bytes;
    
    // Parse features if it's a string
    const features = typeof subscription.plan.features === 'string' 
      ? JSON.parse(subscription.plan.features) 
      : (subscription.plan.features || {});
    const uploadsEnabled = features.uploads_enabled === true && bytesLimit > 0;
    
    const usage: StorageUsage = {
      bytes_used: bytesUsed,
      file_count: fileCount,
      bytes_limit: bytesLimit,
      percentage_used: bytesLimit > 0 ? (bytesUsed / bytesLimit) * 100 : 0,
      uploads_enabled: uploadsEnabled
    };
    
    // Get bandwidth for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const bandwidthResult = await pool.query(
      `SELECT bytes_uploaded, bytes_downloaded 
       FROM project_bandwidth_usage 
       WHERE project_id = $1 AND period_start = $2`,
      [project.id, startOfMonth.toISOString().split('T')[0]]
    );
    
    const bandwidth = bandwidthResult.rows.length > 0 ? {
      bytes_uploaded: Number(bandwidthResult.rows[0].bytes_uploaded),
      bytes_downloaded: Number(bandwidthResult.rows[0].bytes_downloaded),
      limit: subscription.plan.bandwidth_limit_bytes
    } : {
      bytes_uploaded: 0,
      bytes_downloaded: 0,
      limit: subscription.plan.bandwidth_limit_bytes
    };
    
    // Check if current user can upload
    // First check if user is project owner (owners always can upload if uploads enabled)
    const isOwner = project.created_by === userId;
    
    // Then check member permission
    const memberResult = await pool.query(
      `SELECT COALESCE(can_upload, false) as can_upload, upload_quota_bytes FROM project_members 
       WHERE project_id = $1 AND user_id = $2`,
      [project.id, userId]
    );
    
    const memberCanUpload = memberResult.rows.length > 0 && memberResult.rows[0].can_upload === true;
    
    // User can upload if uploads are enabled AND (they're owner OR they have member permission)
    const canUpload = uploadsEnabled && (isOwner || memberCanUpload);
    
    return NextResponse.json({
      subscription,
      usage,
      bandwidth,
      canUpload,
      maxFileSize: subscription.plan.max_file_size_bytes,
      // Convenience fields for UI
      usedBytes: bytesUsed,
      quotaBytes: bytesLimit,
      fileCount
    });
  } catch (error) {
    console.error('Error fetching storage info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage info' },
      { status: 500 }
    );
  }
}
