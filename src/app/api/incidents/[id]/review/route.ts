import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import { submitIncidentReview } from '@/lib/incidents-db';

// POST /api/incidents/[id]/review - Submit analyst review (first or second)
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

    const { user_id } = await request.json();
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const result = await submitIncidentReview(numericId, user_id, authResult.user.role);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verification_status: result.verification_status,
      message: result.message
    });
  } catch (error: any) {
    console.error('[review-submit] Error submitting review:', error);
    console.error('[review-submit] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      position: error.position,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: 'Failed to submit review',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}
