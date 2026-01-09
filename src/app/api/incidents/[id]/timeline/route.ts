import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import { getIncidentTimeline, addTimelineEntry, updateTimelineEntry, deleteTimelineEntry } from '@/lib/incidents-db';

// GET /api/incidents/[id]/timeline - Get timeline for an incident
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

    const timeline = await getIncidentTimeline(numericId);
    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}

// POST /api/incidents/[id]/timeline - Add timeline entry
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

    const entry = await request.json();
    
    if (!entry.description) {
      return NextResponse.json({ error: 'Timeline description is required' }, { status: 400 });
    }

    const entryId = await addTimelineEntry(numericId, entry);
    return NextResponse.json({ success: true, id: entryId });
  } catch (error) {
    console.error('Error adding timeline entry:', error);
    return NextResponse.json({ error: 'Failed to add timeline entry' }, { status: 500 });
  }
}

// PUT /api/incidents/[id]/timeline - Update timeline entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { entry_id, ...updates } = await request.json();
    
    if (!entry_id) {
      return NextResponse.json({ error: 'entry_id is required' }, { status: 400 });
    }

    await updateTimelineEntry(entry_id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating timeline entry:', error);
    return NextResponse.json({ error: 'Failed to update timeline entry' }, { status: 500 });
  }
}

// DELETE /api/incidents/[id]/timeline - Delete timeline entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { entry_id } = await request.json();
    
    if (!entry_id) {
      return NextResponse.json({ error: 'entry_id is required' }, { status: 400 });
    }

    await deleteTimelineEntry(entry_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting timeline entry:', error);
    return NextResponse.json({ error: 'Failed to delete timeline entry' }, { status: 500 });
  }
}
