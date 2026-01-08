import { NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login?error=invalid-token', request.url));
    }

    const result = await verifyEmail(token);

    if (!result.success) {
      return NextResponse.redirect(new URL('/auth/login?error=verification-failed', request.url));
    }

    return NextResponse.redirect(new URL('/auth/login?verified=true', request.url));
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=verification-failed', request.url));
  }
}
