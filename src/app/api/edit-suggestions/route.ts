import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/edit-suggestions - List all edit suggestions (for analysts)
export async function GET(request: NextRequest) {
  try {
    // Require editor role
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    let query = `
      SELECT 
        es.*,
        COALESCE(i.victim_name, i.subject_name) as incident_victim_name,
        i.incident_date as incident_date,
        u1.email as suggested_by_email,
        u1.name as suggested_by_name,
        u2.email as first_reviewed_by_email,
        u3.email as second_reviewed_by_email
      FROM edit_suggestions es
      LEFT JOIN incidents i ON es.incident_id = i.id
      LEFT JOIN users u1 ON es.suggested_by = u1.id
      LEFT JOIN users u2 ON es.first_reviewed_by = u2.id
      LEFT JOIN users u3 ON es.second_reviewed_by = u3.id
    `;

    const conditions: string[] = [];
    
    if (status === 'pending') {
      conditions.push("es.status = 'pending'");
    } else if (status === 'first_review') {
      conditions.push("es.status = 'first_review'");
    } else if (status === 'needs_review') {
      conditions.push("es.status IN ('pending', 'first_review')");
    } else if (status === 'approved') {
      conditions.push("es.status = 'approved'");
    } else if (status === 'rejected') {
      conditions.push("es.status = 'rejected'");
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY es.created_at DESC';

    const result = await pool.query(query);

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'first_review') as first_review,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) as total
      FROM edit_suggestions
    `);

    return NextResponse.json({
      suggestions: result.rows,
      stats: statsResult.rows[0]
    });

  } catch (error) {
    console.error('Error fetching edit suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edit suggestions' },
      { status: 500 }
    );
  }
}
