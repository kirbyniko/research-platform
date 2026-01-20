import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/statements/queue - Get statements needing verification
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
        s.*,
        u1.email as submitted_by_email,
        u2.email as verified_by_email,
        (SELECT COUNT(*) FROM statement_sources WHERE statement_id = s.id) as source_count,
        (SELECT COUNT(*) FROM statement_quotes WHERE statement_id = s.id) as quote_count,
        -- Count filled fields
        (CASE WHEN s.speaker_name IS NOT NULL AND s.speaker_name != '' THEN 1 ELSE 0 END +
         CASE WHEN s.statement_date IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN s.headline IS NOT NULL AND s.headline != '' THEN 1 ELSE 0 END +
         CASE WHEN s.key_quote IS NOT NULL AND s.key_quote != '' THEN 1 ELSE 0 END +
         CASE WHEN s.speaker_type IS NOT NULL AND s.speaker_type != '' THEN 1 ELSE 0 END +
         CASE WHEN s.platform IS NOT NULL AND s.platform != '' THEN 1 ELSE 0 END +
         CASE WHEN s.full_text IS NOT NULL AND LENGTH(s.full_text) > 10 THEN 1 ELSE 0 END +
         CASE WHEN s.context IS NOT NULL AND s.context != '' THEN 1 ELSE 0 END
        ) as filled_fields
      FROM statements s
      LEFT JOIN users u1 ON s.submitted_by_user_id = u1.id
      LEFT JOIN users u2 ON s.verified_by_user_id = u2.id
    `;
    
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
    // Status filtering
    if (status === 'pending') {
      conditions.push("s.verification_status = 'pending'");
    } else if (status === 'first_review') {
      conditions.push("s.verification_status = 'first_review'");
    } else if (status === 'first_validation') {
      conditions.push("s.verification_status = 'first_validation'");
    } else if (status === 'needs_review') {
      conditions.push("s.verification_status IN ('pending', 'first_review')");
    } else if (status === 'needs_validation') {
      conditions.push("s.verification_status IN ('first_review', 'first_validation')");
    } else if (status === 'verified') {
      conditions.push("s.verification_status = 'verified'");
    } else if (status === 'rejected') {
      conditions.push("s.verification_status = 'rejected'");
    }
    // Default: show all non-verified
    else if (status === 'all') {
      conditions.push("s.verification_status != 'verified'");
    }
    
    // ANALYST FILTERING: Don't show statements the current analyst already worked on
    if (user.role !== 'admin') {
      const paramIndex = params.length + 1;
      
      if (['all', 'pending', 'needs_review'].includes(status)) {
        conditions.push(`(s.submitted_by_user_id IS NULL OR s.submitted_by_user_id != $${paramIndex})`);
        params.push(user.id);
      }
    }
    
    // Add WHERE clause
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Order by newest first
    query += ` ORDER BY s.created_at DESC`;
    
    // Limit results
    query += ` LIMIT 100`;

    const result = await pool.query(query, params);
    
    // Format response
    const statements = result.rows.map(row => ({
      ...row,
      content_type: 'statement',
    }));

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'first_review') as first_review,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
        COUNT(*) as total
      FROM statements
    `);

    const stats = statsResult.rows[0] || {
      pending: 0,
      first_review: 0,
      verified: 0,
      rejected: 0,
      total: 0
    };

    return NextResponse.json({
      statements,
      stats,
      total: statements.length,
    });
    
  } catch (error) {
    console.error('Error fetching statement queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statement queue' },
      { status: 500 }
    );
  }
}
