import { NextRequest, NextResponse } from 'next/server';
import { saveCaseToDb } from '@/lib/cases-db';
import { Case } from '@/types/case';
import { requireAuth } from '@/lib/auth';

// Allowed origins for extension CORS
const ALLOWED_ORIGINS = [
  'chrome-extension://', // Chrome extensions
  'moz-extension://', // Firefox extensions
  'http://localhost:3000',
  'http://localhost:3008',
  process.env.NEXT_PUBLIC_BASE_URL,
].filter(Boolean);

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  
  // Allow Chrome/Firefox extensions (they have unique origins)
  const isExtension = origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
  const isAllowed = isExtension || ALLOWED_ORIGINS.some(allowed => allowed && origin.startsWith(allowed));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'HEAD, GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}

// HEAD request for connection testing (browser extension)
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { 
    status: 200,
    headers: getCorsHeaders(request)
  });
}

// OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request)
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
