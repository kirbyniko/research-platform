import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/verification-queue - Get cases needing verification
export async function GET(request: NextRequest) {
  try {
    // Require editor role (editors, analysts, and admins can access)
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    let query = `
      SELECT 
        i.*,
        u1.email as submitted_by_email,
        u2.email as first_verified_by_email,
        u3.email as second_verified_by_email,
        u4.email as first_validated_by_email,
        u5.email as second_validated_by_email,
        u6.email as rejected_by_email,
        (SELECT COUNT(*) FROM incident_sources WHERE incident_id = i.id) as source_count,
        (SELECT COUNT(*) FROM incident_quotes WHERE incident_id = i.id) as quote_count,
        (SELECT COUNT(*) FROM incident_media WHERE incident_id = i.id) as media_count,
        (SELECT COUNT(*) FROM incident_timeline WHERE incident_id = i.id) as timeline_count,
        -- Count filled fields (non-null key fields)
        (CASE WHEN i.victim_name IS NOT NULL AND i.victim_name != '' THEN 1 ELSE 0 END +
         CASE WHEN i.incident_date IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN i.city IS NOT NULL AND i.city != '' THEN 1 ELSE 0 END +
         CASE WHEN i.state IS NOT NULL AND i.state != '' THEN 1 ELSE 0 END +
         CASE WHEN i.facility IS NOT NULL AND i.facility != '' THEN 1 ELSE 0 END +
         CASE WHEN i.summary IS NOT NULL AND LENGTH(i.summary) > 10 THEN 1 ELSE 0 END +
         CASE WHEN i.subject_age IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN i.subject_gender IS NOT NULL AND i.subject_gender != '' THEN 1 ELSE 0 END +
         CASE WHEN i.subject_nationality IS NOT NULL AND i.subject_nationality != '' THEN 1 ELSE 0 END
        ) as filled_fields
      FROM incidents i
      LEFT JOIN users u1 ON i.submitted_by = u1.id
      LEFT JOIN users u2 ON i.first_verified_by = u2.id
      LEFT JOIN users u3 ON i.second_verified_by = u3.id
      LEFT JOIN users u4 ON i.first_validated_by = u4.id
      LEFT JOIN users u5 ON i.second_validated_by = u5.id
      LEFT JOIN users u6 ON i.rejected_by = u6.id
    `;
    
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
    // Review statuses
    if (status === 'pending') {
      conditions.push("i.verification_status = 'pending'");
    } else if (status === 'first_review') {
      conditions.push("i.verification_status = 'first_review'");
    } else if (status === 'needs_review') {
      conditions.push("i.verification_status IN ('pending', 'first_review')");
    } 
    // NEW: Returned from validation (review_cycle >= 2)
    else if (status === 'returned_for_review') {
      conditions.push("i.verification_status IN ('pending', 'first_review', 'second_review')");
      conditions.push("COALESCE(i.review_cycle, 1) >= 2");
    }
    // Validation statuses
    else if (status === 'second_review') {
      conditions.push("i.verification_status = 'second_review'");
    } else if (status === 'first_validation') {
      conditions.push("i.verification_status = 'first_validation'");
    } else if (status === 'needs_validation') {
      conditions.push("i.verification_status IN ('second_review', 'first_validation')");
    }
    // NEW: Re-validation (validation cycle 2+)
    else if (status === 'revalidation') {
      conditions.push("i.verification_status IN ('second_review', 'first_validation')");
      conditions.push("COALESCE(i.review_cycle, 1) >= 2");
    }
    // Final statuses
    else if (status === 'verified') {
      conditions.push("i.verification_status = 'verified'");
    } else if (status === 'rejected') {
      conditions.push("i.verification_status = 'rejected'");
    }
    
    // ANALYST FILTERING: Don't show cases the current analyst already worked on
    // This prevents analysts from reviewing their own submissions or verifications
    // Apply to all users including admins for consistency with dashboard
    {
      let paramIndex = params.length + 1;
      
      // For 'all' status or review statuses: exclude cases user submitted or verified
      if (['all', 'pending', 'first_review', 'needs_review', 'returned_for_review'].includes(status)) {
        conditions.push(`(i.submitted_by IS NULL OR i.submitted_by != $${paramIndex})`);
        conditions.push(`(i.first_verified_by IS NULL OR i.first_verified_by != $${paramIndex})`);
        conditions.push(`(i.second_verified_by IS NULL OR i.second_verified_by != $${paramIndex})`);
        params.push(user.id);
      }
      // For validation statuses: exclude if user did first OR second review  
      else if (['second_review', 'first_validation', 'needs_validation', 'revalidation'].includes(status)) {
        conditions.push(`(i.first_verified_by IS NULL OR i.first_verified_by != $${paramIndex})`);
        conditions.push(`(i.second_verified_by IS NULL OR i.second_verified_by != $${paramIndex})`);
        params.push(user.id);
      }
      // For verified/rejected: no analyst filtering needed (anyone can view)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Sort: Returned cases (review_cycle >= 2) first, then by created_at DESC
    query += ' ORDER BY COALESCE(i.review_cycle, 1) DESC, i.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Apply same analyst filtering to stats
    let statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'first_review') as first_review,
        COUNT(*) FILTER (WHERE verification_status = 'second_review') as second_review,
        COUNT(*) FILTER (WHERE verification_status = 'first_validation') as first_validation,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE verification_status IN ('pending', 'first_review', 'second_review') AND COALESCE(review_cycle, 1) >= 2) as returned_for_review,
        COUNT(*) FILTER (WHERE verification_status IN ('second_review', 'first_validation') AND COALESCE(review_cycle, 1) >= 2) as revalidation,
        COUNT(*) as total
      FROM incidents i
    `;
    
    const statsConditions: string[] = [];
    const statsParams: (string | number)[] = [];
    
    // Apply analyst filtering to stats (for all users including admin)
    {
      statsConditions.push(`(i.submitted_by IS NULL OR i.submitted_by != $1)`);
      statsConditions.push(`(i.first_verified_by IS NULL OR i.first_verified_by != $1)`);
      statsConditions.push(`(i.second_verified_by IS NULL OR i.second_verified_by != $1)`);
      statsParams.push(user.id);
    }
    
    if (statsConditions.length > 0) {
      statsQuery += ' WHERE ' + statsConditions.join(' AND ');
    }
    
    const statsResult = await pool.query(statsQuery, statsParams);
    
    return NextResponse.json({
      incidents: result.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification queue' },
      { status: 500 }
    );
  }
}
