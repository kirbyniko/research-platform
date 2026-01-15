'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'OAuthAccountNotLinked') {
        setError('This email is already associated with another account.');
      } else if (errorParam === 'AccessDenied') {
        setError('Access denied. Please try again.');
      } else {
        setError('An error occurred during sign in. Please try again.');
      }
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      // Use redirect instead of popup - mobile browsers often block popups
      await signIn('google', { 
        callbackUrl,
        redirect: true // Force redirect flow instead of popup
      });
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to initiate sign in');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-2 text-center">Sign In</h1>
      <p className="text-gray-600 text-xs sm:text-sm text-center mb-6">
        Sign in with your Google account to access the dashboard
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="text-sm sm:text-base text-gray-700 font-medium">
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </span>
      </button>

      <div className="mt-4 sm:mt-6 text-center text-xs text-gray-500">
        <p>
          By signing in, you agree to our documentation accuracy standards.
        </p>
        <p className="mt-1">
          Your Google account information is only used for authentication.
        </p>
      </div>

      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center">
        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
          Want to submit information without an account?
        </p>
        <Link 
          href="/submit" 
          className="inline-block border border-gray-300 px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 rounded"
        >
          Submit as Guest
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
