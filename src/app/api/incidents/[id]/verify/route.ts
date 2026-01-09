import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

// POST - Verify a case (analyst/admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = parseInt(id);
    
    if (isNaN(caseId)) {
      return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });
    }
    
    // Require analyst or admin role
    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const user = authCheck.user;
    
    const body = await request.json();
    const { verificationType = 'data_accuracy', notes } = body;
    
    // Get current case status
    const caseResult = await pool.query(
      'SELECT verification_status, first_verified_by, second_verified_by, submitted_by FROM incidents WHERE id = $1',
      [caseId]
    );
    
    if (caseResult.rows.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    
    const currentCase = caseResult.rows[0];
    
    // Can't verify your own submission (unless admin)
    if (currentCase.submitted_by === user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot verify your own submission' },
        { status: 403 }
      );
    }
    
    // Determine verification number
    let verificationNumber: number;
    let newStatus: string;
    
    if (currentCase.verification_status === 'pending') {
      verificationNumber = 1;
      newStatus = 'first_review';
    } else if (currentCase.verification_status === 'first_review') {
      // Can't be the same person who did first verification
      if (currentCase.first_verified_by === user.id && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Cannot provide both verifications. A different analyst must verify.' },
          { status: 403 }
        );
      }
      verificationNumber = 2;
      newStatus = 'verified';
    } else {
      return NextResponse.json(
        { error: 'Case is already fully verified' },
        { status: 400 }
      );
    }
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert verification record
      await client.query(`
        INSERT INTO case_verifications (case_id, verified_by, verification_number, verification_type, notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [caseId, user.id, verificationNumber, verificationType, notes]);
      
      // Update case status
      const updateField = verificationNumber === 1 ? 'first' : 'second';
      await client.query(`
        UPDATE incidents 
        SET 
          verification_status = $1,
          ${updateField}_verified_by = $2,
          ${updateField}_verified_at = NOW()
        WHERE id = $3
      `, [newStatus, user.id, caseId]);
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: verificationNumber === 1 
          ? 'First verification complete. Case requires one more verification.'
          : 'Second verification complete. Case is now verified!',
        verificationNumber,
        newStatus
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error verifying case:', error);
    return NextResponse.json({ error: 'Failed to verify case' }, { status: 500 });
  }
}

// GET - Get verification status and history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get incident details
    const incidentResult = await pool.query(`
      SELECT 
        i.*,
        u1.name as submitter_name,
        u1.email as submitter_email,
        u2.name as first_verifier_name,
        u2.email as first_verifier_email
      FROM incidents i
      LEFT JOIN users u1 ON i.submitted_by = u1.id
      LEFT JOIN users u2 ON i.first_verified_by = u2.id
      WHERE i.id = $1
    `, [incidentId]);

    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const incident = incidentResult.rows[0];

    // Get sources
    const sourcesResult = await pool.query(`
      SELECT * FROM incident_sources
      WHERE incident_id = $1
      ORDER BY id
    `, [incidentId]);

    // Get quotes
    const quotesResult = await pool.query(`
      SELECT 
        q.*,
        s.title as source_title,
        s.publication,
        s.url as source_url
      FROM incident_quotes q
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE q.incident_id = $1
      ORDER BY q.id
    `, [incidentId]);

    // Get timeline
    const timelineResult = await pool.query(`
      SELECT * FROM incident_timeline
      WHERE incident_id = $1
      ORDER BY event_date, id
    `, [incidentId]);

    // Get field verifications
    const fieldVerificationsResult = await pool.query(`
      SELECT 
        fv.*,
        u1.name as first_verifier_name,
        u2.name as second_verifier_name
      FROM incident_field_verifications fv
      LEFT JOIN users u1 ON fv.first_verified_by = u1.id
      LEFT JOIN users u2 ON fv.second_verified_by = u2.id
      WHERE fv.incident_id = $1
    `, [incidentId]);

    // Get quote-field links
    const quoteFieldLinksResult = await pool.query(`
      SELECT * FROM quote_field_links
      WHERE incident_id = $1
    `, [incidentId]);

    return NextResponse.json({
      incident,
      sources: sourcesResult.rows,
      quotes: quotesResult.rows,
      timeline: timelineResult.rows,
      field_verifications: fieldVerificationsResult.rows,
      quote_field_links: quoteFieldLinksResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching incident for verification:', error);
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 });
  }
}

// DELETE - Remove verification (admin only, for corrections)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = parseInt(id);
    
    // Require admin role
    const authCheck = await requireServerAuth(request, 'admin');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    const { searchParams } = new URL(request.url);
    const verificationNumber = parseInt(searchParams.get('verification') || '0');
    
    if (![1, 2].includes(verificationNumber)) {
      return NextResponse.json({ error: 'Invalid verification number (1 or 2)' }, { status: 400 });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove verification record
      await client.query(
        'DELETE FROM case_verifications WHERE case_id = $1 AND verification_number = $2',
        [caseId, verificationNumber]
      );
      
      // Update case status
      if (verificationNumber === 2) {
        await client.query(`
          UPDATE incidents 
          SET verification_status = 'first_review', second_verified_by = NULL, second_verified_at = NULL
          WHERE id = $1
        `, [caseId]);
      } else {
        // Removing first verification also removes second
        await client.query(
          'DELETE FROM case_verifications WHERE case_id = $1',
          [caseId]
        );
        await client.query(`
          UPDATE incidents 
          SET 
            verification_status = 'pending',
            first_verified_by = NULL,
            first_verified_at = NULL,
            second_verified_by = NULL,
            second_verified_at = NULL
          WHERE id = $1
        `, [caseId]);
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'Verification removed'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error removing verification:', error);
    return NextResponse.json({ error: 'Failed to remove verification' }, { status: 500 });
  }
}
