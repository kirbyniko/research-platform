import { NextResponse } from 'next/server';
import { auth } from '@/lib/next-auth';

export async function GET() {
  console.log('[test-session] Testing NextAuth session...');
  console.log('[test-session] NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  console.log('[test-session] AUTH_SECRET exists:', !!process.env.AUTH_SECRET);
  console.log('[test-session] GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
  
  try {
    const session = await auth();
    console.log('[test-session] Session result:', JSON.stringify(session, null, 2));
    
    return NextResponse.json({
      hasSession: !!session,
      session: session,
      env: {
        nextauthUrl: process.env.NEXTAUTH_URL,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
      }
    });
  } catch (error) {
    console.error('[test-session] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
