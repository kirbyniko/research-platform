import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireServerAuth } from '@/lib/server-auth';
import {
  getIncidentById,
  updateIncident,
  deleteIncident,
  addIncidentSource,
  addIncidentQuote,
  addTimelineEntry,
} from '@/lib/incidents-db';

// GET /api/incidents/[id] - Get single incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Check if user is requesting unverified incidents (requires analyst role)
    const includeUnverified = searchParams.get('include_unverified') === 'true';
    
    if (includeUnverified) {
      // SECURITY: Only analysts can see unverified incidents
      const authResult = await requireServerAuth(request, 'analyst');
      if ('error' in authResult) {
        return NextResponse.json(
          { error: 'Analyst access required to view unverified incidents' },
          { status: 403 }
        );
      }
    }
    
    // Try parsing as number first, then use as string (incident_id)
    const numericId = parseInt(id);
    const incident = await getIncidentById(isNaN(numericId) ? id : numericId, includeUnverified);
    
    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incident' },
      { status: 500 }
    );
  }
}

// PUT /api/incidents/[id] - Update incident
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require editor role
    const authResult = await requireServerAuth(request, 'editor');
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

    const body = await request.json();
    await updateIncident(numericId, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating incident:', error);
    return NextResponse.json(
      { error: 'Failed to update incident' },
      { status: 500 }
    );
  }
}

// DELETE /api/incidents/[id] - Delete incident
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role for deletion
    const authResult = await requireAuth('admin')(request);
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

    await deleteIncident(numericId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident:', error);
    return NextResponse.json(
      { error: 'Failed to delete incident' },
      { status: 500 }
    );
  }
}

// PATCH /api/incidents/[id] - Add sources, quotes, or timeline entries
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require editor role
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

    const body = await request.json();
    const results: Record<string, number[]> = {};

    // Add sources
    if (body.sources && Array.isArray(body.sources)) {
      results.source_ids = [];
      for (const source of body.sources) {
        // Validate source has URL
        if (!source.url) {
          return NextResponse.json(
            { error: 'Each source must have a URL' },
            { status: 400 }
          );
        }
        const sourceId = await addIncidentSource(numericId, source);
        results.source_ids.push(sourceId);
      }
    }

    // Add quotes
    if (body.quotes && Array.isArray(body.quotes)) {
      results.quote_ids = [];
      for (const quote of body.quotes) {
        // Validate quote has text
        if (!quote.text || quote.text.trim() === '') {
          return NextResponse.json(
            { error: 'Each quote must have text' },
            { status: 400 }
          );
        }
        // Validate quote has source_id if sources were added
        if (!quote.source_id && (!results.source_ids || results.source_ids.length === 0)) {
          return NextResponse.json(
            { error: 'Each quote must be linked to a source. Add sources first or include source_id.' },
            { status: 400 }
          );
        }
        const quoteId = await addIncidentQuote(numericId, quote);
        results.quote_ids.push(quoteId);
      }
    }

    // Add timeline entries
    if (body.timeline && Array.isArray(body.timeline)) {
      results.timeline_ids = [];
      for (const entry of body.timeline) {
        const entryId = await addTimelineEntry(numericId, entry);
        results.timeline_ids.push(entryId);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Error patching incident:', error);
    return NextResponse.json(
      { error: 'Failed to patch incident' },
      { status: 500 }
    );
  }
}
