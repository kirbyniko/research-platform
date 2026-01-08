'use client';

import { Descope, useSession } from '@descope/react-sdk';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DescopeLoginPage() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const [shouldShowLogin, setShouldShowLogin] = useState(false);

  useEffect(() => {
    console.log('[Login Page] Auth state:', { isAuthenticated, isSessionLoading });
    
    if (isSessionLoading) {
      return;
    }
    
    if (isAuthenticated) {
      console.log('[Login Page] Already authenticated, redirecting to admin');
      window.location.href = '/admin';
      return;
    }
    
    console.log('[Login Page] Not authenticated, showing login form');
    setShouldShowLogin(true);
  }, [isAuthenticated, isSessionLoading]);

  const handleSuccess = () => {
    console.log('[Login Page] Login success, redirecting to admin');
    window.location.href = '/admin';
  };

  const handleError = (e: any) => {
    console.error('[Login Page] Login error', e.detail);
  };

  if (isSessionLoading || (!shouldShowLogin && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Checking authentication...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white border border-gray-200">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
          <p className="text-sm text-gray-600">
            Sign in to access the verification dashboard
          </p>
        </div>

        <Descope
          flowId="sign-up-or-in"
          onSuccess={handleSuccess}
          onError={handleError}
          theme="light"
        />

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-black">
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
