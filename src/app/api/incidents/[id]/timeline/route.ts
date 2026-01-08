import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getIncidentTimeline, addTimelineEntry } from '@/lib/incidents-db';

// GET /api/incidents/[id]/timeline - Get timeline for an incident
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

    const timeline = await getIncidentTimeline(numericId);
    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/timeline - Add timeline entry
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

    const entry = await request.json();
    
    if (!entry.description) {
      return NextResponse.json(
        { error: 'Timeline description is required' },
        { status: 400 }
      );
    }

    const entryId = await addTimelineEntry(numericId, entry);
    return NextResponse.json({ success: true, id: entryId });
  } catch (error) {
    console.error('Error adding timeline entry:', error);
    return NextResponse.json(
      { error: 'Failed to add timeline entry' },
      { status: 500 }
    );
  }
}
