import { NextRequest, NextResponse } from 'next/server';
import { saveCaseToDb } from '@/lib/cases-db';
import { Case } from '@/types/case';
import { requireAuth } from '@/lib/auth';

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
