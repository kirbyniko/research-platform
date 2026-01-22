'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface VerificationRequest {
  id: number;
  project_id: number;
  record_id: number;
  requested_at: string;
  priority: string;
  verification_scope: string;
  status: string;
  assigned_to: number | null;
  project_name: string;
  project_slug: string;
  record_type_name: string;
  requester_email: string;
  requester_name: string | null;
}

interface VerifierInfo {
  id: number;
  email: string;
  name: string | null;
  verifier_specialty: string[] | null;
  verifier_max_concurrent: number;
  current_assigned: number;
  total_completed: number;
}

export default function VerifierDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifierInfo, setVerifierInfo] = useState<VerifierInfo | null>(null);
  const [myRequests, setMyRequests] = useState<VerificationRequest[]>([]);
  const [availableRequests, setAvailableRequests] = useState<VerificationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'assigned' | 'available'>('assigned');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/verifier/dashboard');
      
      if (res.status === 403) {
        router.push('/');
        return;
      }
      
      if (!res.ok) throw new Error('Failed to load dashboard');
      
      const data = await res.json();
      setVerifierInfo(data.verifier);
      setMyRequests(data.myRequests || []);
      setAvailableRequests(data.availableRequests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRequest = async (requestId: number) => {
    try {
      const res = await fetch(`/api/verifier/requests/${requestId}/claim`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to claim request');
      }
      
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to claim request');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[priority] || colors.normal}`}>
        {priority}
      </span>
    );
  };

  const getScopeBadge = (scope: string) => {
    return (
      <span className={`px-2 py-1 text-xs rounded ${
        scope === 'record' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
      }`}>
        {scope === 'record' ? 'Full Record' : 'Data Items'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !verifierInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Access denied'}</p>
          <Link href="/" className="text-blue-600 hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  const canClaimMore = verifierInfo.current_assigned < verifierInfo.verifier_max_concurrent;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Verifier Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {verifierInfo.name || verifierInfo.email}
              </p>
            </div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Platform
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border">
            <div className={`text-2xl font-bold ${
              canClaimMore ? 'text-green-600' : 'text-red-600'
            }`}>
              {verifierInfo.current_assigned}/{verifierInfo.verifier_max_concurrent}
            </div>
            <div className="text-sm text-gray-600">Current Workload</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-blue-600">
              {availableRequests.length}
            </div>
            <div className="text-sm text-gray-600">Available to Claim</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-purple-600">
              {verifierInfo.total_completed}
            </div>
            <div className="text-sm text-gray-600">Total Completed</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex flex-wrap gap-1">
              {(verifierInfo.verifier_specialty || ['general']).slice(0, 3).map(spec => (
                <span key={spec} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {spec}
                </span>
              ))}
            </div>
            <div className="text-sm text-gray-600 mt-1">Specialties</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border">
          <div className="border-b flex">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'assigned'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Assigned ({myRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'available'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Available Queue ({availableRequests.length})
            </button>
          </div>

          {activeTab === 'assigned' && (
            <div>
              {myRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No requests assigned to you.</p>
                  <p className="text-sm mt-2">Check the available queue to claim requests.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {myRequests.map(req => (
                    <div key={req.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">Request #{req.id}</span>
                            {getPriorityBadge(req.priority)}
                            {getScopeBadge(req.verification_scope)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {req.project_name} → {req.record_type_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Requested {new Date(req.requested_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Link
                          href={`/verify/${req.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Continue Verification
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'available' && (
            <div>
              {!canClaimMore && (
                <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
                  You&apos;ve reached your maximum concurrent assignments. Complete some requests before claiming more.
                </div>
              )}
              {availableRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No requests available to claim.</p>
                  <p className="text-sm mt-2">Check back later for new verification requests.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {availableRequests.map(req => (
                    <div key={req.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">Request #{req.id}</span>
                            {getPriorityBadge(req.priority)}
                            {getScopeBadge(req.verification_scope)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {req.project_name} → {req.record_type_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Requested {new Date(req.requested_at).toLocaleDateString()} by {req.requester_name || req.requester_email}
                          </div>
                        </div>
                        <button
                          onClick={() => handleClaimRequest(req.id)}
                          disabled={!canClaimMore}
                          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Claim Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
