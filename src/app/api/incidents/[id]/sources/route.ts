import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getIncidentSources, addIncidentSource } from '@/lib/incidents-db';

// GET /api/incidents/[id]/sources - Get all sources for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid incident ID' },
        { status: 400 }
      );
    }

    const sources = await getIncidentSources(numericId);
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/sources - Add a source
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('editor')(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid incident ID' },
        { status: 400 }
      );
    }

    const source = await request.json();
    
    if (!source.url) {
      return NextResponse.json(
        { error: 'Source URL is required' },
        { status: 400 }
      );
    }

    const sourceId = await addIncidentSource(numericId, source);
    return NextResponse.json({ success: true, id: sourceId });
  } catch (error) {
    console.error('Error adding source:', error);
    return NextResponse.json(
      { error: 'Failed to add source' },
      { status: 500 }
    );
  }
}
