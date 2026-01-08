import { NextRequest, NextResponse } from 'next/server';
import { getCaseByIdFromDb } from '@/lib/cases-db';
import { requireDescopeAuth } from '@/lib/descope-auth';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    // Auth check
    const descopeAuthFn = await requireDescopeAuth('viewer');
    const descopeResult = await descopeAuthFn(request);
    
    if ('error' in descopeResult) {
      const legacyAuthFn = requireAuth('viewer');
      const legacyResult = await legacyAuthFn(request);
      if ('error' in legacyResult) {
        return NextResponse.json({ error: legacyResult.error }, { status: legacyResult.status });
      }
    }

    const caseData = await getCaseByIdFromDb(params.caseId);

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: caseData });
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case' },
      { status: 500 }
    );
  }
}
