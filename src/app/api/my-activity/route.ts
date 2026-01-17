import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/my-activity - Get current user's review activity
export async function GET(request: NextRequest) {
  try {
    // Check authentication (any editor+ can see their activity)
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const userId = user.id;

    // Get currently locked case (if any)
    const lockedResult = await pool.query(`
      SELECT 
        i.id,
        i.victim_name,
        i.subject_name,
        i.incident_type,
        i.verification_status,
        i.locked_at,
        i.lock_expires_at
      FROM incidents i
      WHERE i.locked_by = $1 
        AND i.lock_expires_at > NOW()
      ORDER BY i.locked_at DESC
      LIMIT 1
    `, [userId]);

    const currentLock = lockedResult.rows.length > 0 ? {
      id: lockedResult.rows[0].id,
      name: lockedResult.rows[0].victim_name || lockedResult.rows[0].subject_name || 'Unknown',
      type: lockedResult.rows[0].incident_type?.replace(/_/g, ' ') || 'Incident',
      status: lockedResult.rows[0].verification_status,
      lockedAt: lockedResult.rows[0].locked_at,
      expiresAt: lockedResult.rows[0].lock_expires_at
    } : null;

    // Get recent reviews by this user (cases they've verified or validated)
    const activityResult = await pool.query(`
      SELECT 
        i.id,
        i.victim_name,
        i.subject_name,
        i.incident_type,
        i.verification_status,
        CASE 
          WHEN i.first_verified_by = $1 THEN 'first_review'
          WHEN i.first_validated_by = $1 THEN 'first_validation'
          WHEN i.second_validated_by = $1 THEN 'second_validation'
          ELSE 'unknown'
        END as my_role,
        CASE 
          WHEN i.first_verified_by = $1 THEN i.first_verified_at
          WHEN i.first_validated_by = $1 THEN i.updated_at
          WHEN i.second_validated_by = $1 THEN i.updated_at
          ELSE i.updated_at
        END as my_action_date
      FROM incidents i
      WHERE i.first_verified_by = $1 
         OR i.first_validated_by = $1 
         OR i.second_validated_by = $1
      ORDER BY 
        CASE 
          WHEN i.first_verified_by = $1 THEN i.first_verified_at
          WHEN i.first_validated_by = $1 THEN i.updated_at
          WHEN i.second_validated_by = $1 THEN i.updated_at
          ELSE i.updated_at
        END DESC
      LIMIT 50
    `, [userId]);

    const recentActivity = activityResult.rows.map(row => ({
      id: row.id,
      name: row.victim_name || row.subject_name || 'Unknown',
      type: row.incident_type?.replace(/_/g, ' ') || 'Incident',
      currentStatus: row.verification_status,
      myRole: row.my_role,
      actionDate: row.my_action_date
    }));

    // Get activity stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE first_verified_by = $1) as reviews_done,
        COUNT(*) FILTER (WHERE first_validated_by = $1) as first_validations_done,
        COUNT(*) FILTER (WHERE second_validated_by = $1) as second_validations_done,
        COUNT(*) FILTER (WHERE verification_status = 'verified' AND (first_verified_by = $1 OR first_validated_by = $1 OR second_validated_by = $1)) as published_contributions
      FROM incidents
      WHERE first_verified_by = $1 
         OR first_validated_by = $1 
         OR second_validated_by = $1
    `, [userId]);

    const stats = statsResult.rows[0] || {
      reviews_done: 0,
      first_validations_done: 0,
      second_validations_done: 0,
      published_contributions: 0
    };

    return NextResponse.json({
      currentLock,
      recentActivity,
      stats: {
        reviewsDone: parseInt(stats.reviews_done) || 0,
        firstValidationsDone: parseInt(stats.first_validations_done) || 0,
        secondValidationsDone: parseInt(stats.second_validations_done) || 0,
        publishedContributions: parseInt(stats.published_contributions) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
