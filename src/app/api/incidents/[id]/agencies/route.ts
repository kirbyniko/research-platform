import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import {
  getIncidentAgencies,
  addIncidentAgency,
  updateIncidentAgency,
  deleteIncidentAgency,
} from '@/lib/incidents-db';

// GET /api/incidents/[id]/agencies - Get all agencies for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const agencies = await getIncidentAgencies(numericId);
    return NextResponse.json(agencies);
  } catch (error) {
    console.error('Error fetching agencies:', error);
    return NextResponse.json({ error: 'Failed to fetch agencies' }, { status: 500 });
  }
}

// POST /api/incidents/[id]/agencies - Add an agency
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const { agency, role } = await request.json();
    
    if (!agency) {
      return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
    }

    const agencyId = await addIncidentAgency(numericId, agency, role);
    return NextResponse.json({ success: true, id: agencyId });
  } catch (error) {
    console.error('Error adding agency:', error);
    return NextResponse.json({ error: 'Failed to add agency' }, { status: 500 });
  }
}

// PUT /api/incidents/[id]/agencies - Update an agency
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { agency_id, agency, role } = await request.json();
    
    if (!agency_id || !agency) {
      return NextResponse.json({ error: 'agency_id and agency name are required' }, { status: 400 });
    }

    await updateIncidentAgency(agency_id, agency, role);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating agency:', error);
    return NextResponse.json({ error: 'Failed to update agency' }, { status: 500 });
  }
}

// DELETE /api/incidents/[id]/agencies - Delete an agency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { agency_id } = await request.json();
    
    if (!agency_id) {
      return NextResponse.json({ error: 'agency_id is required' }, { status: 400 });
    }

    await deleteIncidentAgency(agency_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agency:', error);
    return NextResponse.json({ error: 'Failed to delete agency' }, { status: 500 });
  }
}
