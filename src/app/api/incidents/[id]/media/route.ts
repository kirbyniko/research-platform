import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import {
  getIncidentMedia,
  addIncidentMedia,
  updateIncidentMedia,
  deleteIncidentMedia,
} from '@/lib/incidents-db';

// GET /api/incidents/[id]/media - Get all media for an incident
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

    const media = await getIncidentMedia(numericId);
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error fetching incident media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/media - Add media to an incident
export async function POST(
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
    
    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { error: 'url is required' },
        { status: 400 }
      );
    }
    if (!body.media_type || !['image', 'video'].includes(body.media_type)) {
      return NextResponse.json(
        { error: 'media_type must be "image" or "video"' },
        { status: 400 }
      );
    }

    const mediaId = await addIncidentMedia(numericId, body);
    return NextResponse.json({ success: true, id: mediaId });
  } catch (error) {
    console.error('Error adding media:', error);
    return NextResponse.json(
      { error: 'Failed to add media' },
      { status: 500 }
    );
  }
}

// PATCH /api/incidents/[id]/media - Update media
export async function PATCH(
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

    const body = await request.json();
    
    if (!body.media_id) {
      return NextResponse.json(
        { error: 'media_id is required' },
        { status: 400 }
      );
    }

    await updateIncidentMedia(body.media_id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    );
  }
}

// DELETE /api/incidents/[id]/media - Delete media
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('media_id');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'media_id query parameter is required' },
        { status: 400 }
      );
    }

    await deleteIncidentMedia(parseInt(mediaId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
