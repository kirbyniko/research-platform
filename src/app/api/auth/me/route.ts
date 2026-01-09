import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken, getUserFromApiKey } from '@/lib/auth';
import { auth } from '@/lib/next-auth';

export async function GET(request: Request) {
  try {
    console.log('[/api/auth/me] Checking authentication...');
    
    // Check NextAuth session first
    const session = await auth();
    console.log('[/api/auth/me] NextAuth session:', session ? 'found' : 'null', session?.user?.email || 'no email');
    
    if (session?.user) {
      // Type assertion for extended user properties
      const user = session.user as { id?: number; role?: string; email?: string | null; name?: string | null };
      console.log('[/api/auth/me] Returning user:', { email: user.email, role: user.role });
      return NextResponse.json({ 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          email_verified: true
        }
      });
    }
    
    console.log('[/api/auth/me] No NextAuth session, checking other auth methods...');

    // Check for Bearer token (API key or JWT)
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Check if it's a database API key (starts with 'ice_')
      if (token.startsWith('ice_')) {
        const apiKeyUser = await getUserFromApiKey(token);
        if (apiKeyUser) {
          return NextResponse.json({ 
            user: {
              id: apiKeyUser.id,
              email: apiKeyUser.email,
              name: apiKeyUser.name,
              role: apiKeyUser.role,
              email_verified: apiKeyUser.email_verified
            }
          });
        }
        return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
      }
      
      // Otherwise treat as JWT
      const user = await getUserFromToken(token);
      if (user) {
        return NextResponse.json({ user });
      }
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check for auth_token cookie (legacy web-based auth)
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (authToken) {
      const user = await getUserFromToken(authToken);
      if (user) {
        return NextResponse.json({ user });
      }
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
