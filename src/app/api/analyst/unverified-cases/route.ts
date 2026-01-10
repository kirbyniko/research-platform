import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

// GET - Get all unverified cases (pending status) for initial verification
export async function GET(request: NextRequest) {
  try {
    // Require analyst or admin role
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get cases that are in 'pending' status (need first verification)
    // Use subject_name for compatibility with older schema (before victim_name column was added)
    const query = `
      SELECT 
        i.id,
        i.incident_id,
        i.incident_type,
        i.subject_name as victim_name,
        i.subject_age as age,
        i.subject_nationality as country_of_origin,
        i.incident_date,
        i.city,
        i.state,
        i.facility,
        i.summary,
        i.verification_status,
        i.submitted_by,
        i.submitter_role,
        i.created_at,
        u.name as submitter_name,
        u.email as submitter_email,
        (SELECT COUNT(*) FROM incident_sources WHERE incident_id = i.id) as source_count,
        (SELECT COUNT(*) FROM incident_quotes WHERE incident_id = i.id) as quote_count,
        (SELECT COUNT(*) FROM incident_timeline WHERE incident_id = i.id) as timeline_count,
        0 as fields_needing_review,
        0 as fields_verified
      FROM incidents i
      LEFT JOIN users u ON i.submitted_by = u.id
      WHERE i.verification_status = 'pending'
      ORDER BY i.incident_date DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM incidents
      WHERE verification_status = 'pending'
    `);
    
    return NextResponse.json({
      incidents: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      user_id: user.id
    });
    
  } catch (error) {
    console.error('Error fetching unverified cases:', error);
    return NextResponse.json({ error: 'Failed to fetch unverified cases' }, { status: 500 });
  }
}
