import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getIncidentQuotes,
  addIncidentQuote,
  updateQuoteVerification,
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
      return NextResponse.json(
        { error: 'Invalid incident ID' },
        { status: 400 }
      );
    }

    const quotes = await getIncidentQuotes(numericId);
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/quotes - Add a quote
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

    const quote = await request.json();
    
    if (!quote.text) {
      return NextResponse.json(
        { error: 'Quote text is required' },
        { status: 400 }
      );
    }

    const quoteId = await addIncidentQuote(numericId, quote);
    return NextResponse.json({ success: true, id: quoteId });
  } catch (error) {
    console.error('Error adding quote:', error);
    return NextResponse.json(
      { error: 'Failed to add quote' },
      { status: 500 }
    );
  }
}

// PATCH /api/incidents/[id]/quotes - Update quote verification
export async function PATCH(
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
    // In this route, id is actually the quote id when patching
    const body = await request.json();
    
    if (body.quote_id && body.verified !== undefined) {
      await updateQuoteVerification(
        body.quote_id,
        body.verified,
        body.verified_by
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'quote_id and verified are required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}
