import { NextRequest, NextResponse } from 'next/server';
import pool, { isDatabaseConfigured } from '@/lib/db';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { requireServerAuth } from '@/lib/server-auth';

// POST - Submit guest report
export async function POST(request: NextRequest) {
  // Rate limit: 5 per hour per IP (very strict for guest submissions)
  const rateLimitResponse = rateLimit(request, RateLimitPresets.veryStrict, 'guest-submit');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Check database configuration first
    if (!isDatabaseConfigured) {
      console.warn('Database not configured, cannot save guest submission');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { 
      victimName,
      dateOfDeath,
      location,
      facility,
      description,
      sourceUrls,
      mediaUrls,  // NEW: image and video links
      contactEmail,
      incidentType = 'death'
    } = body;
    
    // Basic validation
    if (!description || description.length < 20) {
      return NextResponse.json(
        { error: 'Please provide a description of at least 20 characters' },
        { status: 400 }
      );
    }
    
    // Build submission data - capture all fields from the form
    const submissionData = {
      // Core fields
      victimName: victimName?.trim() || null,
      dateOfDeath: dateOfDeath || null,
      location: location?.trim() || null,
      facility: facility?.trim() || null,
      description: description.trim(),
      sourceUrls: sourceUrls || [],
      mediaUrls: mediaUrls || [],
      incidentType,
      submittedAt: new Date().toISOString(),
      // Extended fields - capture all additional data from form
      age: body.age || null,
      gender: body.gender || null,
      nationality: body.nationality || null,
      city: body.city || null,
      state: body.state || null,
      agencies: body.agencies || {},
      causeOfDeath: body.causeOfDeath || null,
      mannerOfDeath: body.mannerOfDeath || null,
      custodyDuration: body.custodyDuration || null,
      medicalDenied: body.medicalDenied || false,
      shotsFired: body.shotsFired || null,
      weaponType: body.weaponType || null,
      bodycamAvailable: body.bodycamAvailable || false,
      victimArmed: body.victimArmed || false,
      shootingContext: body.shootingContext || null,
      forceTypes: body.forceTypes || {},
      victimRestrained: body.victimRestrained || false,
      victimComplying: body.victimComplying !== undefined ? body.victimComplying : null
    };
    
    // Save to database
    // Get IP for logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const result = await pool.query(`
      INSERT INTO guest_submissions (submission_data, ip_address, email, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, created_at
    `, [
      JSON.stringify(submissionData),
      ip,
      contactEmail?.trim() || null
    ]);
    
    return NextResponse.json({
      success: true,
      message: 'Thank you for your submission. It will be reviewed by our team.',
      id: result.rows[0].id
    });
    
  } catch (error) {
    console.error('Error saving guest submission:', error);
    return NextResponse.json(
      { error: 'Failed to save submission' },
      { status: 500 }
    );
  }
}

// GET - Get guest submissions (admin/analyst only)
export async function GET(request: NextRequest) {
  try {
    // Check database configuration first
    if (!isDatabaseConfigured) {
      console.warn('Database not configured, cannot fetch guest submissions');
      return NextResponse.json({ submissions: [] });
    }

    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    
    // Build WHERE clause - exclude soft-deleted by default
    let whereClause = '(gs.status = $1 OR $1 = \'all\')';
    if (!includeDeleted) {
      whereClause += ' AND gs.deleted_at IS NULL';
    }
    
    const result = await pool.query(`
      SELECT 
        gs.*,
        u.name as reviewer_name
      FROM guest_submissions gs
      LEFT JOIN users u ON gs.reviewed_by = u.id
      WHERE ${whereClause}
      ORDER BY gs.created_at DESC
      LIMIT $2
    `, [status, limit]);
    
    return NextResponse.json({ submissions: result.rows });
    
  } catch (error) {
    console.error('Error fetching guest submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// PATCH - Update guest submission status (admin/analyst only)
export async function PATCH(request: NextRequest) {
  try {
    // Check database configuration first
    if (!isDatabaseConfigured) {
      console.warn('Database not configured, cannot update guest submission');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const user = authCheck.user;
    
    const body = await request.json();
    const { id, status, notes, deleted_at, deletion_reason } = body;
    
    // Handle soft delete
    if (deleted_at !== undefined) {
      const result = await pool.query(`
        UPDATE guest_submissions
        SET deleted_at = $1, deletion_reason = $2, reviewed_by = $3
        WHERE id = $4
        RETURNING id
      `, [deleted_at, deletion_reason || null, user.id, id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, message: 'Submission marked for deletion' });
    }
    
    if (!id || !['reviewed', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const result = await pool.query(`
      UPDATE guest_submissions
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = $3
      WHERE id = $4
      RETURNING id, status
    `, [status, user.id, notes || null, id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Submission marked as ${status}`,
      submission: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating guest submission:', error);
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}

// DELETE - Permanently delete guest submission (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check database configuration first
    if (!isDatabaseConfigured) {
      console.warn('Database not configured, cannot delete guest submission');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const authCheck = await requireServerAuth(request, 'admin');
    if ('error' in authCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: authCheck.status });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }
    
    const result = await pool.query(`
      DELETE FROM guest_submissions WHERE id = $1 RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Submission permanently deleted' });
    
  } catch (error) {
    console.error('Error deleting guest submission:', error);
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
  }
}
