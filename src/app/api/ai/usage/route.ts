import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import { getUserCreditsAndUsage } from '@/lib/ai-rate-limit';

// GET /api/ai/usage - Get user's credits and usage stats
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const stats = await getUserCreditsAndUsage(authResult.user.id);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
