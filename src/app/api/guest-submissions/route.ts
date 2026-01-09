import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Rate limiting map (in production, use Redis)
const submissionTimes = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS = 5; // Max 5 submissions per hour per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const submissions = submissionTimes.get(ip) || [];
  
  // Filter to only submissions in the last hour
  const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT_WINDOW);
  submissionTimes.set(ip, recentSubmissions);
  
  return recentSubmissions.length >= MAX_SUBMISSIONS;
}

function recordSubmission(ip: string) {
  const submissions = submissionTimes.get(ip) || [];
  submissions.push(Date.now());
  submissionTimes.set(ip, submissions);
}

// POST - Submit guest report
export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
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
    
    // Build submission data
    const submissionData = {
      victimName: victimName?.trim() || null,
      dateOfDeath: dateOfDeath || null,
      location: location?.trim() || null,
      facility: facility?.trim() || null,
      description: description.trim(),
      sourceUrls: sourceUrls || [],
      incidentType,
      submittedAt: new Date().toISOString()
    };
    
    // Save to database
    const result = await pool.query(`
      INSERT INTO guest_submissions (submission_data, ip_address, email, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, created_at
    `, [
      JSON.stringify(submissionData),
      ip,
      contactEmail?.trim() || null
    ]);
    
    recordSubmission(ip);
    
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
export async function GET(request: Request) {
  try {
    // Import auth dynamically to avoid circular dependency
    const { requireAuth } = await import('@/lib/auth');
    
    const authCheck = await requireAuth('analyst')(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await pool.query(`
      SELECT 
        gs.*,
        u.name as reviewer_name
      FROM guest_submissions gs
      LEFT JOIN users u ON gs.reviewed_by = u.id
      WHERE gs.status = $1 OR $1 = 'all'
      ORDER BY gs.created_at DESC
      LIMIT $2
    `, [status, limit]);
    
    return NextResponse.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching guest submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// PATCH - Update guest submission status (admin/analyst only)
export async function PATCH(request: Request) {
  try {
    const { requireAuth } = await import('@/lib/auth');
    
    const authCheck = await requireAuth('analyst')(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const user = authCheck.user;
    
    const body = await request.json();
    const { id, status, notes } = body;
    
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
