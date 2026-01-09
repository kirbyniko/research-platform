import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts per minute to prevent brute force
  const rateLimitResponse = rateLimit(request, RateLimitPresets.strict, 'login');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    if (result.error) {
      // Generic message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });

    // Set HTTP-only cookie for web authentication
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
