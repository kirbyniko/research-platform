import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug]/usage/database
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
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Calculate database usage
    const usageResult = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM records WHERE project_id = $1 AND deleted_at IS NULL) as record_count,
        (SELECT COUNT(*) FROM record_quotes rq 
         JOIN records r ON rq.record_id = r.id 
         WHERE r.project_id = $1 AND r.deleted_at IS NULL) as quote_count,
        (SELECT COUNT(*) FROM record_sources rs 
         JOIN records r ON rs.record_id = r.id 
         WHERE r.project_id = $1 AND r.deleted_at IS NULL) as source_count,
        (SELECT COUNT(*) FROM field_definitions fd 
         JOIN record_types rt ON fd.record_type_id = rt.id 
         WHERE rt.project_id = $1) as field_count,
        (SELECT COUNT(*) FROM record_types WHERE project_id = $1) as record_type_count`,
      [project.id]
    );
    
    // Get per-record-type breakdown
    const breakdownResult = await pool.query(
      `SELECT 
        rt.slug,
        rt.name,
        COUNT(r.id) as record_count,
        (SELECT COUNT(*) FROM field_definitions WHERE record_type_id = rt.id) as field_count
       FROM record_types rt
       LEFT JOIN records r ON r.record_type_id = rt.id AND r.deleted_at IS NULL
       WHERE rt.project_id = $1
       GROUP BY rt.id, rt.slug, rt.name
       ORDER BY rt.sort_order, rt.name`,
      [project.id]
    );
    
    // Get per-status breakdown
    const statusResult = await pool.query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM records 
       WHERE project_id = $1 AND deleted_at IS NULL
       GROUP BY status`,
      [project.id]
    );
    
    // Estimate database size (rough calculation)
    // Average record ~2KB, quote ~500 bytes, source ~300 bytes, field def ~500 bytes
    const counts = usageResult.rows[0];
    const estimatedBytes = 
      (parseInt(counts.record_count) || 0) * 2048 +
      (parseInt(counts.quote_count) || 0) * 512 +
      (parseInt(counts.source_count) || 0) * 300 +
      (parseInt(counts.field_count) || 0) * 500;
    
    return NextResponse.json({
      summary: {
        record_count: parseInt(counts.record_count) || 0,
        quote_count: parseInt(counts.quote_count) || 0,
        source_count: parseInt(counts.source_count) || 0,
        field_count: parseInt(counts.field_count) || 0,
        record_type_count: parseInt(counts.record_type_count) || 0,
        estimated_bytes: estimatedBytes
      },
      byRecordType: breakdownResult.rows.map(row => ({
        slug: row.slug,
        name: row.name,
        record_count: parseInt(row.record_count) || 0,
        field_count: parseInt(row.field_count) || 0
      })),
      byStatus: statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count) || 0;
        return acc;
      }, {} as Record<string, number>)
    });
    
  } catch (error) {
    console.error('Error fetching database usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
