'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CREDIT_PACKAGES } from '@/lib/stripe';

interface UsageData {
  credits: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
  };
  usage: {
    thisHour: number;
    today: number;
    thisMonth: number;
    allTime: number;
  };
  limits: {
    tier: string;
    perHour: number;
    perDay: number;
    perMonth: number;
    requiresCredits: boolean;
    creditsPerRequest: number;
  };
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      setLoading(false);
      return;
    }

    fetch('/api/ai/usage')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setUsageData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [session, status]);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start checkout');
      setPurchasing(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600">Please sign in to view your billing information.</p>
        </div>
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-800',
    basic: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
    unlimited: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="mt-2 text-gray-600">Manage your AI credits and view usage statistics</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {usageData && (
          <>
            {/* Current Plan Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${tierColors[usageData.limits.tier] || tierColors.free}`}>
                      {usageData.limits.tier}
                    </span>
                    <span className="text-gray-500">
                      {usageData.limits.perHour} requests/hour • {usageData.limits.perDay} requests/day
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{usageData.credits.balance}</div>
                  <div className="text-sm text-gray-500">credits remaining</div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">This Hour</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">{usageData.usage.thisHour}</span>
                  <span className="text-sm text-gray-400">/ {usageData.limits.perHour}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Today</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">{usageData.usage.today}</span>
                  <span className="text-sm text-gray-400">/ {usageData.limits.perDay}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">This Month</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">{usageData.usage.thisMonth}</span>
                  <span className="text-sm text-gray-400">/ {usageData.limits.perMonth}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">All Time</div>
                <div className="mt-1">
                  <span className="text-2xl font-semibold text-gray-900">{usageData.usage.allTime}</span>
                </div>
              </div>
            </div>

            {/* Credit Packages */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Buy Credits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-lg shadow-sm border-2 p-6 relative ${
                    pkg.popular ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{pkg.credits}</div>
                    <div className="text-sm text-gray-500 mb-2">credits</div>
                    <div className="text-2xl font-semibold text-gray-900">${(pkg.price / 100).toFixed(0)}</div>
                    <div className="text-xs text-gray-400 mb-4">
                      ${(pkg.price / 100 / pkg.credits).toFixed(2)} per credit
                    </div>
                    {pkg.savings && (
                      <div className="text-sm text-green-600 font-medium mb-4">
                        Save {pkg.savings}
                      </div>
                    )}
                    <button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchasing !== null}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        pkg.popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {purchasing === pkg.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        'Buy Now'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Credits History Note */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p>
                <strong>How credits work:</strong> Each AI template generation uses 1 credit. 
                Free tier users have limited daily requests but don't need credits. 
                Paid tier users use credits for each request beyond their tier limits.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
