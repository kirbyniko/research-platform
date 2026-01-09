import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import {
  getIncidentQuotes,
  addIncidentQuote,
  updateQuoteVerification,
  updateIncidentQuote,
  deleteIncidentQuote,
  updateQuoteFieldLinks,
} from '@/lib/incidents-db';

// GET /api/incidents/[id]/quotes - Get all quotes for an incident
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

    const quotes = await getIncidentQuotes(numericId);
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

// POST /api/incidents/[id]/quotes - Add a quote
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

    const quote = await request.json();
    
    if (!quote.text) {
      return NextResponse.json({ error: 'Quote text is required' }, { status: 400 });
    }

    const quoteId = await addIncidentQuote(numericId, quote);
    return NextResponse.json({ success: true, id: quoteId });
  } catch (error) {
    console.error('Error adding quote:', error);
    return NextResponse.json({ error: 'Failed to add quote' }, { status: 500 });
  }
}

// PUT /api/incidents/[id]/quotes - Update a quote
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
    const numericId = parseInt(id);
    const { quote_id, linked_fields, ...updates } = await request.json();
    
    if (!quote_id) {
      return NextResponse.json({ error: 'quote_id is required' }, { status: 400 });
    }

    // Update quote content
    if (Object.keys(updates).length > 0) {
      await updateIncidentQuote(quote_id, updates);
    }
    
    // Update field links if provided
    if (linked_fields !== undefined) {
      await updateQuoteFieldLinks(quote_id, numericId, linked_fields || []);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

// PATCH /api/incidents/[id]/quotes - Update quote verification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    
    if (body.quote_id && body.verified !== undefined) {
      await updateQuoteVerification(body.quote_id, body.verified, body.verified_by);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'quote_id and verified are required' }, { status: 400 });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

// DELETE /api/incidents/[id]/quotes - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { quote_id } = await request.json();
    
    if (!quote_id) {
      return NextResponse.json({ error: 'quote_id is required' }, { status: 400 });
    }

    await deleteIncidentQuote(quote_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
  }
}
