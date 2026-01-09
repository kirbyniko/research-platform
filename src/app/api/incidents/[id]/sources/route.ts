import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import { getIncidentSources, addIncidentSource, updateIncidentSource, deleteIncidentSource } from '@/lib/incidents-db';

// GET /api/incidents/[id]/sources - Get all sources for an incident
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

    const sources = await getIncidentSources(numericId);
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

// POST /api/incidents/[id]/sources - Add a source
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

    const source = await request.json();
    
    if (!source.url) {
      return NextResponse.json({ error: 'Source URL is required' }, { status: 400 });
    }

    const sourceId = await addIncidentSource(numericId, source);
    return NextResponse.json({ success: true, id: sourceId });
  } catch (error) {
    console.error('Error adding source:', error);
    return NextResponse.json({ error: 'Failed to add source' }, { status: 500 });
  }
}

// PUT /api/incidents/[id]/sources - Update a source
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { source_id, ...updates } = await request.json();
    
    if (!source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 });
    }

    await updateIncidentSource(source_id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}

// DELETE /api/incidents/[id]/sources - Delete a source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { source_id } = await request.json();
    
    if (!source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 });
    }

    await deleteIncidentSource(source_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
