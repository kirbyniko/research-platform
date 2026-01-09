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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // 'pending', 'first_review', 'verified', 'all'

    let query = `
      SELECT 
        i.*,
        u1.email as submitted_by_email,
        u2.email as first_verified_by_email,
        u3.email as second_verified_by_email
      FROM incidents i
      LEFT JOIN users u1 ON i.submitted_by = u1.id
      LEFT JOIN users u2 ON i.first_verified_by = u2.id
      LEFT JOIN users u3 ON i.second_verified_by = u3.id
    `;
    
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
    if (status === 'pending') {
      conditions.push("i.verification_status = 'pending'");
    } else if (status === 'first_review') {
      conditions.push("i.verification_status = 'first_review'");
    } else if (status === 'needs_review') {
      conditions.push("i.verification_status IN ('pending', 'first_review')");
    } else if (status === 'verified') {
      conditions.push("i.verification_status = 'verified'");
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Get summary stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'first_review') as first_review,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
        COUNT(*) as total
      FROM incidents
    `);
    
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
