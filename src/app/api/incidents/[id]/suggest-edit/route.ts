import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// POST /api/incidents/[id]/suggest-edit - Submit an edit suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow any authenticated user (no minimum role requirement)
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    // Rate limiting: Check how many suggestions this user has made in the last hour
    const rateCheck = await pool.query(
      `SELECT COUNT(*) as count FROM edit_suggestions 
       WHERE suggested_by = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [authResult.user.id]
    );

    const suggestionsLastHour = parseInt(rateCheck.rows[0].count);
    if (suggestionsLastHour >= 10) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can submit up to 10 edit suggestions per hour.' },
        { status: 429 }
      );
    }

    const { fieldName, suggestedValue, reason, supportingQuote, sourceUrl, sourceTitle } = await request.json();

    if (!fieldName || suggestedValue === undefined) {
      return NextResponse.json(
        { error: 'Field name and suggested value are required' },
        { status: 400 }
      );
    }

    // Note: supportingQuote, sourceUrl, and sourceTitle are collected from the UI
    // but not yet stored in the database (columns don't exist yet)
    // They are included in the request body for future use

    // Allowed fields that can be edited - map UI field names to DB column names
    const fieldMapping: Record<string, string> = {
      'victim_name': 'victim_name',
      'victim_age': 'subject_age',
      'victim_gender': 'subject_gender',
      'victim_nationality': 'subject_nationality',
      'incident_date': 'incident_date',
      'incident_type': 'incident_type',
      'description': 'summary',
      'city': 'city',
      'state': 'state',
      'facility_name': 'facility',
      'facility_type': 'facility',
      'cause_of_death': 'summary',
      'manner_of_death': 'summary',
      'detention_start_date': 'incident_date',
      'time_in_custody': 'summary',
      'agency': 'summary',
      'agency_response': 'summary',
      'legal_status': 'summary',
      'criminal_charges': 'summary',
      'medical_conditions': 'summary',
      'medical_care_provided': 'summary',
      'investigation_status': 'summary',
      'settlement_amount': 'summary',
      'family_statement': 'summary',
      'official_statement': 'summary'
    };

    const allowedFields = Object.keys(fieldMapping);

    if (!allowedFields.includes(fieldName)) {
      return NextResponse.json(
        { error: `Field '${fieldName}' cannot be edited through suggestions` },
        { status: 400 }
      );
    }

    // Get the actual database column name
    const dbColumnName = fieldMapping[fieldName];

    // Get current value from the incident
    let currentValue = null;
    try {
      // Use a generic query to avoid SQL injection and column validation issues
      const incidentResult = await pool.query(
        `SELECT * FROM incidents WHERE id = $1 LIMIT 1`,
        [incidentId]
      );

      if (incidentResult.rows.length === 0) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }

      const incident = incidentResult.rows[0];
      
      // Check if incident is verified (public submissions can only suggest edits on verified incidents)
      if (incident.verification_status !== 'verified') {
        return NextResponse.json(
          { error: 'Can only submit suggestions for verified incidents' },
          { status: 400 }
        );
      }

      // Get the value from the row using the mapped column name
      currentValue = incident[dbColumnName] !== undefined ? incident[dbColumnName] : null;
    } catch (dbError) {
      console.error('Database error fetching incident:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch incident data' },
        { status: 500 }
      );
    }

    // Check for duplicate pending suggestions
    const duplicateCheck = await pool.query(
      `SELECT id FROM edit_suggestions 
       WHERE incident_id = $1 AND field_name = $2 AND status IN ('pending', 'first_review')
       AND suggested_value = $3`,
      [incidentId, fieldName, suggestedValue]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'A similar edit suggestion is already pending review' },
        { status: 409 }
      );
    }

    // Insert the suggestion (only with columns that exist in the table)
    const result = await pool.query(
      `INSERT INTO edit_suggestions 
       (incident_id, suggested_by, field_name, current_value, suggested_value, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [incidentId, authResult.user.id, fieldName, currentValue, suggestedValue, reason]
    );

    return NextResponse.json({
      message: 'Edit suggestion submitted successfully',
      suggestion: {
        id: result.rows[0].id,
        fieldName,
        currentValue,
        suggestedValue,
        reason,
        status: 'pending',
        createdAt: result.rows[0].created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting edit suggestion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to submit edit suggestion', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/incidents/[id]/suggest-edit - Get pending suggestions for an incident
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

    const result = await pool.query(
      `SELECT es.*, u.email as suggested_by_email, u.name as suggested_by_name
       FROM edit_suggestions es
       LEFT JOIN users u ON es.suggested_by = u.id
       WHERE es.incident_id = $1
       ORDER BY es.created_at DESC`,
      [incidentId]
    );

    return NextResponse.json({ suggestions: result.rows });

  } catch (error) {
    console.error('Error fetching edit suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edit suggestions' },
      { status: 500 }
    );
  }
}
