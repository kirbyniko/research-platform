import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts per minute to prevent spam
  const rateLimitResponse = rateLimit(request, RateLimitPresets.strict, 'register');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const result = await createUser(email, password, name);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send verification email
    if (result.verificationToken) {
      await sendVerificationEmail(email, result.verificationToken);
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: result.user?.id,
        email: result.user?.email,
        name: result.user?.name,
        role: result.user?.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
