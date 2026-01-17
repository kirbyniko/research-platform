'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Activity {
  id: number;
  name: string;
  type: string;
  currentStatus: string;
  myRole: string;
  actionDate: string;
}

interface CurrentLock {
  id: number;
  name: string;
  type: string;
  status: string;
  lockedAt: string;
  expiresAt: string;
}

interface Stats {
  reviewsDone: number;
  firstValidationsDone: number;
  secondValidationsDone: number;
  publishedContributions: number;
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [currentLock, setCurrentLock] = useState<CurrentLock | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchActivity();
  }, []);

  async function fetchActivity() {
    try {
      const res = await fetch('/api/my-activity');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login?redirect=/activity');
          return;
        }
        throw new Error('Failed to fetch activity');
      }
      const data = await res.json();
      setActivity(data.recentActivity || []);
      setCurrentLock(data.currentLock);
      setStats(data.stats);
    } catch (err) {
      setError('Failed to load activity');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getRoleDisplay(role: string): { icon: string; text: string; color: string } {
    switch (role) {
      case 'first_review':
        return { icon: '📝', text: 'First Review', color: 'text-blue-600' };
      case 'first_validation':
        return { icon: '✓', text: '1st Validation', color: 'text-purple-600' };
      case 'second_validation':
        return { icon: '✓✓', text: '2nd Validation', color: 'text-green-600' };
      default:
        return { icon: '?', text: 'Unknown', color: 'text-gray-600' };
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">✓ Published</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">✗ Rejected</span>;
      case 'first_review':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">⏳ Awaiting Validation</span>;
      case 'first_validation':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">⏳ Needs 2nd Validation</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">⏳ Pending Review</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">{status}</span>;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading activity...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">My Activity</h1>
          <p className="text-gray-600">Track your contributions to the ICE Deaths database</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats Section */}
        {stats && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="text-3xl font-bold text-blue-600">{stats.reviewsDone}</div>
                <div className="text-sm text-gray-600 mt-1">First Reviews</div>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="text-3xl font-bold text-purple-600">{stats.firstValidationsDone}</div>
                <div className="text-sm text-gray-600 mt-1">1st Validations</div>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="text-3xl font-bold text-green-600">{stats.secondValidationsDone}</div>
                <div className="text-sm text-gray-600 mt-1">2nd Validations</div>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="text-3xl font-bold text-amber-600">{stats.publishedContributions}</div>
                <div className="text-sm text-gray-600 mt-1">Published Cases</div>
              </div>
            </div>
          </div>
        )}

        {/* Current Lock Section */}
        {currentLock && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <span>🔒</span> Currently Reviewing
            </h2>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{currentLock.name}</div>
                <div className="text-sm text-gray-600">{currentLock.type} • Case #{currentLock.id}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Locked at {new Date(currentLock.lockedAt).toLocaleString()}
                </div>
              </div>
              <Link 
                href={`/dashboard/review/${currentLock.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Continue Review →
              </Link>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <p className="text-sm text-gray-600 mt-1">Your last 50 reviews and validations</p>
          </div>
          
          {activity.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No activity yet. Start reviewing cases from the dashboard.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activity.map((item) => {
                const role = getRoleDisplay(item.myRole);
                return (
                  <Link
                    key={`${item.id}-${item.myRole}`}
                    href={`/incidents/${item.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                          {getStatusBadge(item.currentStatus)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.type} • Case #{item.id}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-sm font-medium ${role.color}`}>
                            {role.icon} {role.text}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.actionDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400">
                        →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
