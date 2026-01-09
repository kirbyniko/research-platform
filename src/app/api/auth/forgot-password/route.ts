import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 per hour to prevent abuse
  const rateLimitResponse = rateLimit(request, RateLimitPresets.veryStrict, 'forgot-password');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await requestPasswordReset(email);

    // Send reset email if token was generated (user exists)
    if (result.resetToken) {
      await sendPasswordResetEmail(email, result.resetToken);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
