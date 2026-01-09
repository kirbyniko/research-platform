import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import pool from '@/lib/db';

// POST /api/incidents/[id]/suggest-edit - Submit an edit suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require at least user role
    const authResult = await requireAuth('user')(request);
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

    const { fieldName, suggestedValue, reason } = await request.json();

    if (!fieldName || suggestedValue === undefined) {
      return NextResponse.json(
        { error: 'Field name and suggested value are required' },
        { status: 400 }
      );
    }

    // Allowed fields that can be edited
    const allowedFields = [
      'victim_name', 'victim_age', 'victim_gender', 'victim_nationality',
      'incident_date', 'incident_type', 'description',
      'city', 'state', 'facility_name', 'facility_type',
      'cause_of_death', 'manner_of_death',
      'detention_start_date', 'time_in_custody',
      'agency', 'agency_response',
      'legal_status', 'criminal_charges',
      'medical_conditions', 'medical_care_provided',
      'investigation_status', 'settlement_amount',
      'family_statement', 'official_statement'
    ];

    if (!allowedFields.includes(fieldName)) {
      return NextResponse.json(
        { error: `Field '${fieldName}' cannot be edited through suggestions` },
        { status: 400 }
      );
    }

    // Get current value from the incident
    const incidentResult = await pool.query(
      `SELECT ${fieldName} as current_value FROM incidents WHERE id = $1`,
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const currentValue = incidentResult.rows[0].current_value;

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

    // Insert the suggestion
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
    return NextResponse.json(
      { error: 'Failed to submit edit suggestion' },
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
