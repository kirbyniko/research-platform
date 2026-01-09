import { NextRequest, NextResponse } from 'next/server';
import { getCaseByIdFromDb } from '@/lib/cases-db';
import { requireServerAuth } from '@/lib/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    // Auth check
    const authResult = await requireServerAuth(request, 'viewer');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { caseId } = await params;
    const caseData = await getCaseByIdFromDb(caseId);

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
