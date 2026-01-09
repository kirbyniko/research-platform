import { NextRequest, NextResponse } from 'next/server';
import { saveCaseToDb } from '@/lib/cases-db';
import { Case } from '@/types/case';
import { requireAuth } from '@/lib/auth';

// HEAD request for connection testing (browser extension)
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'HEAD, GET, POST, OPTIONS',
    }
  });
}

// OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'HEAD, GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Require editor role for creating/editing cases
    const authResult = await requireAuth('editor')(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const caseData: Case = await request.json();
    
    // Basic validation
    if (!caseData.id || !caseData.name || !caseData.date_of_death) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await saveCaseToDb(caseData);

    return NextResponse.json({ success: true, id: caseData.id });
  } catch (error) {
    console.error('Error saving case:', error);
    return NextResponse.json(
      { error: 'Failed to save case' },
      { status: 500 }
    );
  }
}
