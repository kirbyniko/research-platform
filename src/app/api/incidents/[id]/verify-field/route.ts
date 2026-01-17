import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

// POST - Verify a specific field on an incident
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }
    
    // Require analyst or admin role
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;
    
    const body = await request.json();
    const { field_name, notes, source_ids } = body;
    
    if (!field_name) {
      return NextResponse.json({ error: 'field_name is required' }, { status: 400 });
    }
    
    // Get current incident and field verification status
    const incidentResult = await pool.query(
      'SELECT id, submitted_by FROM incidents WHERE id = $1',
      [incidentId]
    );
    
    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    
    const incident = incidentResult.rows[0];
    
    // Can't verify fields on your own submission (unless admin)
    if (incident.submitted_by === user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot verify your own submission' },
        { status: 403 }
      );
    }
    
    // Get current field value from incident
    const fieldQuery = await pool.query(
      `SELECT COALESCE(subject_name, victim_name) as victim_name, 
              incident_date, city, state, facility, summary, incident_type
       FROM incidents WHERE id = $1`,
      [incidentId]
    );
    const currentFieldValue = fieldQuery.rows[0]?.[field_name] || null;
    
    // Check if field verification record exists
    const fieldVerifResult = await pool.query(
      `SELECT * FROM incident_field_verifications 
       WHERE incident_id = $1 AND field_name = $2`,
      [incidentId, field_name]
    );
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (fieldVerifResult.rows.length === 0) {
        // Create new field verification - this is first verification
        await client.query(`
          INSERT INTO incident_field_verifications 
            (incident_id, field_name, field_value, first_verified_by, first_verified_at, 
             first_verification_notes, first_verification_source_ids, verification_status)
          VALUES ($1, $2, $3, $4, NOW(), $5, $6, 'first_review')
        `, [incidentId, field_name, currentFieldValue, user.id, notes || null, source_ids || null]);
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'First verification recorded',
          verification_number: 1,
          status: 'first_review'
        });
      } else {
        const existing = fieldVerifResult.rows[0];
        
        // Already verified by someone - check if we can do second verification
        if (existing.verification_status === 'verified') {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Field is already fully verified' }, { status: 400 });
        }
        
        if (existing.first_verified_by === user.id && user.role !== 'admin') {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Cannot provide both verifications. A different analyst must verify.' },
            { status: 403 }
          );
        }
        
        // Do second verification
        await client.query(`
          UPDATE incident_field_verifications 
          SET second_verified_by = $1, 
              second_verified_at = NOW(),
              second_verification_notes = $2,
              second_verification_source_ids = $3,
              verification_status = 'verified',
              updated_at = NOW()
          WHERE incident_id = $4 AND field_name = $5
        `, [user.id, notes || null, source_ids || null, incidentId, field_name]);
        
        await client.query('COMMIT');
        
        // Check if all fields are verified to update incident status
        await updateIncidentVerificationStatus(incidentId);
        
        return NextResponse.json({
          success: true,
          message: 'Second verification recorded - field fully verified!',
          verification_number: 2,
          status: 'verified'
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error verifying field:', error);
    return NextResponse.json({ error: 'Failed to verify field' }, { status: 500 });
  }
}

// GET - Get field verification status for an incident
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
    
    // Get all field verifications for this incident
    const fieldVerifResult = await pool.query(`
      SELECT 
        fv.*,
        u1.name as first_verifier_name,
        u1.email as first_verifier_email,
        u2.name as second_verifier_name,
        u2.email as second_verifier_email
      FROM incident_field_verifications fv
      LEFT JOIN users u1 ON fv.first_verified_by = u1.id
      LEFT JOIN users u2 ON fv.second_verified_by = u2.id
      WHERE fv.incident_id = $1
      ORDER BY fv.field_name
    `, [incidentId]);
    
    // Get full incident details
    const incidentResult = await pool.query(`
      SELECT 
        i.*,
        COALESCE(i.subject_name, i.victim_name) as victim_name,
        u1.name as submitter_name,
        u1.email as submitter_email,
        u2.name as first_verifier_name,
        u3.name as second_verifier_name
      FROM incidents i
      LEFT JOIN users u1 ON i.submitted_by = u1.id
      LEFT JOIN users u2 ON i.first_verified_by = u2.id
      LEFT JOIN users u3 ON i.second_verified_by = u3.id
      WHERE i.id = $1
    `, [incidentId]);
    
    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    
    // Get sources
    const sourcesResult = await pool.query(`
      SELECT id, url, title, publication, author, published_date, source_type, archived_url
      FROM incident_sources
      WHERE incident_id = $1
      ORDER BY id
    `, [incidentId]);
    
    // Get quotes with source info and linked fields
    const quotesResult = await pool.query(`
      SELECT 
        q.id, q.quote_text, q.category, q.page_number, q.paragraph_number, 
        q.confidence, q.verified, q.verified_by, q.verified_at, q.source_id,
        s.url as source_url, s.title as source_title, s.publication as source_publication,
        array_agg(DISTINCT qfl.field_name) FILTER (WHERE qfl.field_name IS NOT NULL) as linked_fields
      FROM incident_quotes q
      LEFT JOIN incident_sources s ON q.source_id = s.id
      LEFT JOIN quote_field_links qfl ON q.id = qfl.quote_id
      WHERE q.incident_id = $1
      GROUP BY q.id, q.quote_text, q.category, q.page_number, q.paragraph_number,
               q.confidence, q.verified, q.verified_by, q.verified_at, q.source_id,
               s.url, s.title, s.publication
      ORDER BY q.id
    `, [incidentId]);
    
    // Get quote-field links (for field -> quotes lookup)
    const quoteFieldLinksResult = await pool.query(`
      SELECT 
        qfl.field_name,
        qfl.quote_id,
        q.quote_text,
        q.category,
        q.verified,
        q.verified_by,
        q.source_id,
        s.url as source_url,
        s.title as source_title
      FROM quote_field_links qfl
      JOIN incident_quotes q ON qfl.quote_id = q.id
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE qfl.incident_id = $1
      ORDER BY qfl.field_name, q.id
    `, [incidentId]);
    
    // Build field -> quotes map
    const fieldQuotes: Record<string, typeof quoteFieldLinksResult.rows> = {};
    for (const row of quoteFieldLinksResult.rows) {
      if (!fieldQuotes[row.field_name]) {
        fieldQuotes[row.field_name] = [];
      }
      fieldQuotes[row.field_name].push(row);
    }
    
    // Get agencies involved
    const agenciesResult = await pool.query(`
      SELECT id, agency, role
      FROM incident_agencies
      WHERE incident_id = $1
      ORDER BY agency
    `, [incidentId]);
    
    // Get media
    const mediaResult = await pool.query(`
      SELECT id, url, media_type, description, title, is_primary, display_order
      FROM incident_media
      WHERE incident_id = $1
      ORDER BY display_order, id
    `, [incidentId]);
    
    // Get violations
    const violationsResult = await pool.query(`
      SELECT id, violation_type, description, constitutional_basis
      FROM incident_violations
      WHERE incident_id = $1
      ORDER BY violation_type
    `, [incidentId]);
    
    // Get type-specific details (JSONB)
    const detailsResult = await pool.query(`
      SELECT detail_type, details
      FROM incident_details
      WHERE incident_id = $1
    `, [incidentId]);
    
    // Get timeline entries
    const timelineResult = await pool.query(`
      SELECT 
        t.id, t.event_date, t.event_time, t.description, t.sequence_order,
        t.source_id, t.quote_id,
        s.title as source_title, s.url as source_url,
        q.quote_text
      FROM incident_timeline t
      LEFT JOIN incident_sources s ON t.source_id = s.id
      LEFT JOIN incident_quotes q ON t.quote_id = q.id
      WHERE t.incident_id = $1
      ORDER BY t.sequence_order, t.event_date, t.event_time
    `, [incidentId]);
    
    // Get unresolved validation issues (feedback from validation that was returned)
    const validationIssuesResult = await pool.query(`
      SELECT 
        vi.*,
        u.name as created_by_name,
        u.email as created_by_email
      FROM validation_issues vi
      LEFT JOIN users u ON vi.created_by = u.id
      WHERE vi.incident_id = $1 AND vi.resolved_at IS NULL
      ORDER BY vi.created_at DESC
    `, [incidentId]);
    
    // Build details map from JSONB records
    const typeDetails: Record<string, unknown> = {};
    for (const row of detailsResult.rows) {
      typeDetails[row.detail_type] = row.details;
    }
    
    return NextResponse.json({
      incident: incidentResult.rows[0],
      field_verifications: fieldVerifResult.rows,
      sources: sourcesResult.rows,
      quotes: quotesResult.rows,
      field_quotes: fieldQuotes,  // Map of field_name -> supporting quotes
      agencies: agenciesResult.rows,
      violations: violationsResult.rows,
      media: mediaResult.rows,
      type_details: typeDetails,
      timeline: timelineResult.rows,
      validation_issues: validationIssuesResult.rows  // Feedback from validation
    });
    
  } catch (error) {
    console.error('Error fetching field verifications:', error);
    return NextResponse.json({ error: 'Failed to fetch field verifications' }, { status: 500 });
  }
}

// Helper function to update incident verification status based on field verifications
async function updateIncidentVerificationStatus(incidentId: number) {
  try {
    // Get all field verifications
    const result = await pool.query(`
      SELECT verification_status FROM incident_field_verifications
      WHERE incident_id = $1
    `, [incidentId]);
    
    if (result.rows.length === 0) {
      return; // No field verifications yet
    }
    
    // Check if all fields are verified
    const allVerified = result.rows.every(row => row.verification_status === 'verified');
    const anyFirstReview = result.rows.some(row => row.verification_status === 'first_review');
    
    let newStatus = 'pending';
    if (allVerified) {
      newStatus = 'verified';
    } else if (anyFirstReview) {
      newStatus = 'first_review';
    }
    
    await pool.query(`
      UPDATE incidents SET verification_status = $1, updated_at = NOW()
      WHERE id = $2
    `, [newStatus, incidentId]);
  } catch (error) {
    console.error('Error updating incident verification status:', error);
  }
}
