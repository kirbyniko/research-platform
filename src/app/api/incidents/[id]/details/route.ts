import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

/**
 * GET /api/incidents/[id]/details
 * Get type-specific details for an incident
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    
    // Support both numeric ID and string incident_id
    const numericId = parseInt(id);
    let incidentId: number;
    
    if (!isNaN(numericId)) {
      // It's a numeric ID - verify it exists
      const result = await pool.query('SELECT id FROM incidents WHERE id = $1', [numericId]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      incidentId = numericId;
    } else {
      // It's a string incident_id like ICE-2017-XXXX
      const result = await pool.query('SELECT id FROM incidents WHERE incident_id = $1', [id]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      incidentId = result.rows[0].id;
    }

    // Get all type-specific details
    const detailsResult = await pool.query(`
      SELECT detail_type, details
      FROM incident_details
      WHERE incident_id = $1
    `, [incidentId]);

    // Flatten the JSONB details into a single object
    const allDetails: Record<string, unknown> = {};
    for (const row of detailsResult.rows) {
      // Merge all details from all detail_types
      if (row.details && typeof row.details === 'object') {
        Object.assign(allDetails, row.details);
      }
    }

    return NextResponse.json({ details: allDetails });
  } catch (error) {
    console.error('Error fetching incident details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/incidents/[id]/details
 * Update type-specific details for an incident
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;

    const body = await request.json();
    const { details } = body;

    if (!details || typeof details !== 'object') {
      return NextResponse.json({ error: 'Invalid details' }, { status: 400 });
    }

    // Support both numeric ID and string incident_id
    const numericId = parseInt(id);
    let incidentId: number;
    let incident_type: string;
    
    if (!isNaN(numericId)) {
      // It's a numeric ID
      const result = await pool.query('SELECT id, incident_type FROM incidents WHERE id = $1', [numericId]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      incidentId = numericId;
      incident_type = result.rows[0].incident_type;
    } else {
      // It's a string incident_id like ICE-2017-XXXX
      const result = await pool.query('SELECT id, incident_type FROM incidents WHERE incident_id = $1', [id]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      incidentId = result.rows[0].id;
      incident_type = result.rows[0].incident_type;
    }

    // Determine detail_type based on incident_type
    let detailType = 'general';
    if (['shooting'].includes(incident_type)) {
      detailType = 'shooting';
    } else if (['death_in_custody', 'death_during_operation', 'death_at_protest', 'death', 'detention_death'].includes(incident_type)) {
      detailType = 'death';
    } else if (['arrest'].includes(incident_type)) {
      detailType = 'arrest';
    } else if (['excessive_force', 'injury'].includes(incident_type)) {
      detailType = 'force';
    } else if (['medical_neglect'].includes(incident_type)) {
      detailType = 'medical';
    } else if (['workplace_raid', 'deportation'].includes(incident_type)) {
      detailType = 'enforcement';
    }

    // Upsert the details (insert or update)
    await pool.query(`
      INSERT INTO incident_details (incident_id, detail_type, details)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (incident_id, detail_type)
      DO UPDATE SET details = $3::jsonb
    `, [incidentId, detailType, JSON.stringify(details)]);

    return NextResponse.json({ 
      success: true,
      detail_type: detailType 
    });
  } catch (error) {
    console.error('Error updating incident details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
