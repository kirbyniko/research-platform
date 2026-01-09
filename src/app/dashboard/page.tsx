'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Incident {
  id: number;
  incident_type: string;
  victim_name: string;
  incident_date: string;
  city: string;
  state: string;
  facility_name: string;
  description: string;
  verification_status: 'pending' | 'first_review' | 'verified';
  submitted_by_email: string | null;
  first_verified_by_email: string | null;
  second_verified_by_email: string | null;
  first_verified_at: string | null;
  created_at: string;
}

interface EditSuggestion {
  id: number;
  incident_id: number;
  field_name: string;
  current_value: string | null;
  suggested_value: string;
  reason: string | null;
  status: 'pending' | 'first_review' | 'approved' | 'rejected';
  incident_victim_name: string;
  incident_date: string;
  suggested_by_email: string;
  suggested_by_name: string | null;
  first_reviewed_by_email: string | null;
  created_at: string;
}

interface Stats {
  pending: number;
  first_review: number;
  verified: number;
  total: number;
}

interface EditStats {
  pending: number;
  first_review: number;
  approved: number;
  rejected: number;
  total: number;
}

interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'guest' | 'user' | 'analyst' | 'admin' | 'editor' | 'viewer';
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'cases' | 'edits'>('cases');
  
  // Case verification state
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'needs_review' | 'pending' | 'first_review' | 'verified' | 'all'>('needs_review');
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Edit suggestions state
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>([]);
  const [editStats, setEditStats] = useState<EditStats | null>(null);
  const [editFilter, setEditFilter] = useState<'needs_review' | 'pending' | 'first_review' | 'approved' | 'rejected' | 'all'>('needs_review');
  const [editLoading, setEditLoading] = useState(false);
  const [reviewingEditId, setReviewingEditId] = useState<number | null>(null);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [selectedEdit, setSelectedEdit] = useState<EditSuggestion | null>(null);
  const [editReviewNotes, setEditReviewNotes] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && (user.role === 'analyst' || user.role === 'admin' || user.role === 'editor')) {
      if (activeTab === 'cases') {
        fetchQueue();
      } else {
        fetchEditSuggestions();
      }
    }
  }, [user, filter, editFilter, activeTab]);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user.role !== 'analyst' && data.user.role !== 'admin' && data.user.role !== 'editor') {
          router.push('/');
          return;
        }
        setUser(data.user);
      } else {
        router.push('/auth/login');
      }
    } catch {
      router.push('/auth/login');
    }
  }

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch(`/api/verification-queue?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents);
        setStats(data.stats);
      } else {
        setError('Failed to fetch verification queue');
      }
    } catch {
      setError('Failed to fetch verification queue');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEditSuggestions() {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/edit-suggestions?status=${editFilter}`);
      if (res.ok) {
        const data = await res.json();
        setEditSuggestions(data.suggestions);
        setEditStats(data.stats);
      } else {
        setError('Failed to fetch edit suggestions');
      }
    } catch {
      setError('Failed to fetch edit suggestions');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleVerify(incident: Incident, approve: boolean) {
    setVerifyingId(incident.id);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: approve,
          notes: verifyNotes || undefined,
        }),
      });
      
      if (res.ok) {
        setShowVerifyModal(false);
        setVerifyNotes('');
        setSelectedIncident(null);
        fetchQueue();
      } else {
        const data = await res.json();
        setError(data.error || 'Verification failed');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleEditReview(edit: EditSuggestion, approve: boolean) {
    setReviewingEditId(edit.id);
    try {
      const res = await fetch(`/api/edit-suggestions/${edit.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: approve,
          notes: editReviewNotes || undefined,
        }),
      });
      
      if (res.ok) {
        setShowEditReviewModal(false);
        setEditReviewNotes('');
        setSelectedEdit(null);
        fetchEditSuggestions();
      } else {
        const data = await res.json();
        setError(data.error || 'Review failed');
      }
    } catch {
      setError('Review failed');
    } finally {
      setReviewingEditId(null);
    }
  }

  function openEditReviewModal(edit: EditSuggestion) {
    setSelectedEdit(edit);
    setEditReviewNotes('');
    setShowEditReviewModal(true);
  }

  function openVerifyModal(incident: Incident) {
    setSelectedIncident(incident);
    setVerifyNotes('');
    setShowVerifyModal(true);
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Pending Review</span>;
      case 'first_review':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Needs 2nd Review</span>;
      case 'verified':
      case 'approved':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">{status === 'verified' ? 'Verified' : 'Approved'}</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{status}</span>;
    }
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const totalCaseReviews = stats ? stats.pending + stats.first_review : 0;
  const totalEditReviews = editStats ? editStats.pending + editStats.first_review : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Analyst Dashboard</h1>
        <p className="text-gray-600">Review and verify submitted incidents and edit suggestions</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('cases')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'cases' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            New Cases
            {totalCaseReviews > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {totalCaseReviews}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('edits')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'edits' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Edit Suggestions
            {totalEditReviews > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {totalEditReviews}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'cases' ? (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
                <div className="text-sm text-yellow-700">Pending Review</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{stats.first_review}</div>
                <div className="text-sm text-blue-700">Needs 2nd Review</div>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-800">{stats.verified}</div>
                <div className="text-sm text-green-700">Verified</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-700">Total Cases</div>
              </div>
            </div>
          )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('needs_review')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'needs_review' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Needs Review ({stats ? stats.pending + stats.first_review : 0})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'pending' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('first_review')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'first_review' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Awaiting 2nd Review
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'verified' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Verified
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 rounded">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Incidents List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading cases...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {filter === 'needs_review' ? 'No cases need review' : 'No cases found'}
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {statusBadge(incident.verification_status)}
                    <span className="text-xs text-gray-500">
                      {incident.incident_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-1">
                    {incident.victim_name || 'Name Unknown'}
                  </h3>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Date:</span> {formatDate(incident.incident_date)}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span>{' '}
                      {[incident.facility_name, incident.city, incident.state].filter(Boolean).join(', ') || 'Unknown'}
                    </p>
                    {incident.description && (
                      <p className="line-clamp-2 text-gray-500">{incident.description}</p>
                    )}
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-400 space-y-0.5">
                    <p>Submitted: {formatDate(incident.created_at)}{incident.submitted_by_email && ` by ${incident.submitted_by_email}`}</p>
                    {incident.first_verified_by_email && (
                      <p>1st Review: {incident.first_verified_by_email} on {formatDate(incident.first_verified_at!)}</p>
                    )}
                    {incident.second_verified_by_email && (
                      <p>2nd Review: {incident.second_verified_by_email}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/dashboard/review/${incident.id}`}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                  >
                    Review Fields
                  </Link>
                  
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 text-center"
                  >
                    View Details
                  </Link>
                  
                  {incident.verification_status === 'first_review' && incident.first_verified_by_email === user?.email && (
                    <span className="px-3 py-2 text-xs text-gray-500 text-center">
                      Awaiting another analyst
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Review Case</h2>
              
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p className="font-medium">{selectedIncident.victim_name || 'Name Unknown'}</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedIncident.incident_date)} • {selectedIncident.incident_type.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {[selectedIncident.facility_name, selectedIncident.city, selectedIncident.state].filter(Boolean).join(', ')}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded p-3 h-24 text-sm"
                  placeholder="Add any notes about your review..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleVerify(selectedIncident, true)}
                  disabled={verifyingId !== null}
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {verifyingId ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleVerify(selectedIncident, false)}
                  disabled={verifyingId !== null}
                  className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => setShowVerifyModal(false)}
                  disabled={verifyingId !== null}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
              
              {selectedIncident.verification_status === 'pending' && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  This case will need a second verification from another analyst after your approval.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <>
          {/* Edit Suggestions Stats */}
          {editStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-800">{editStats.pending}</div>
                <div className="text-sm text-yellow-700">Pending</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{editStats.first_review}</div>
                <div className="text-sm text-blue-700">Needs 2nd Review</div>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-800">{editStats.approved}</div>
                <div className="text-sm text-green-700">Approved</div>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-800">{editStats.rejected}</div>
                <div className="text-sm text-red-700">Rejected</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{editStats.total}</div>
                <div className="text-sm text-gray-700">Total</div>
              </div>
            </div>
          )}

          {/* Edit Filters */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setEditFilter('needs_review')}
              className={`px-4 py-2 rounded-lg text-sm ${editFilter === 'needs_review' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Needs Review ({editStats ? editStats.pending + editStats.first_review : 0})
            </button>
            <button
              onClick={() => setEditFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm ${editFilter === 'pending' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setEditFilter('first_review')}
              className={`px-4 py-2 rounded-lg text-sm ${editFilter === 'first_review' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Awaiting 2nd Review
            </button>
            <button
              onClick={() => setEditFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm ${editFilter === 'approved' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Approved
            </button>
            <button
              onClick={() => setEditFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm ${editFilter === 'rejected' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Rejected
            </button>
            <button
              onClick={() => setEditFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm ${editFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 rounded">
              {error}
              <button onClick={() => setError('')} className="float-right font-bold">&times;</button>
            </div>
          )}

          {/* Edit Suggestions List */}
          {editLoading ? (
            <div className="text-center py-12 text-gray-500">Loading edit suggestions...</div>
          ) : editSuggestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {editFilter === 'needs_review' ? 'No edit suggestions need review' : 'No edit suggestions found'}
            </div>
          ) : (
            <div className="space-y-4">
              {editSuggestions.map((edit) => (
                <div key={edit.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {statusBadge(edit.status)}
                        <span className="text-xs text-gray-500">
                          Edit to {formatFieldName(edit.field_name)}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1">
                        <Link href={`/incidents/${edit.incident_id}`} className="hover:text-blue-600">
                          {edit.incident_victim_name || 'Unknown'} - {formatDate(edit.incident_date)}
                        </Link>
                      </h3>
                      
                      <div className="bg-gray-50 rounded p-3 mb-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Current Value</p>
                            <p className="text-gray-700">{edit.current_value || <span className="italic text-gray-400">Not set</span>}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Suggested Value</p>
                            <p className="text-gray-900 font-medium">{edit.suggested_value}</p>
                          </div>
                        </div>
                        {edit.reason && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Reason</p>
                            <p className="text-gray-700">{edit.reason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-400 space-y-0.5">
                        <p>Suggested: {formatDate(edit.created_at)} by {edit.suggested_by_name || edit.suggested_by_email}</p>
                        {edit.first_reviewed_by_email && (
                          <p>1st Review: {edit.first_reviewed_by_email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/incidents/${edit.incident_id}`}
                        className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 text-center"
                      >
                        View Case
                      </Link>
                      
                      {(edit.status === 'pending' || 
                        (edit.status === 'first_review' && edit.first_reviewed_by_email !== user?.email)) && (
                        <button
                          onClick={() => openEditReviewModal(edit)}
                          disabled={reviewingEditId === edit.id}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {reviewingEditId === edit.id ? 'Processing...' : 'Review'}
                        </button>
                      )}
                      
                      {edit.status === 'first_review' && edit.first_reviewed_by_email === user?.email && (
                        <span className="px-3 py-2 text-xs text-gray-500 text-center">
                          Awaiting another analyst
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit Review Modal */}
          {showEditReviewModal && selectedEdit && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">Review Edit Suggestion</h2>
                  
                  <div className="bg-gray-50 p-4 rounded mb-4">
                    <p className="font-medium mb-2">
                      <Link href={`/incidents/${selectedEdit.incident_id}`} className="text-blue-600 hover:underline">
                        {selectedEdit.incident_victim_name || 'Unknown'}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Field: {formatFieldName(selectedEdit.field_name)}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current</p>
                        <p className="text-gray-700">{selectedEdit.current_value || <span className="italic">Not set</span>}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Suggested</p>
                        <p className="text-gray-900 font-medium">{selectedEdit.suggested_value}</p>
                      </div>
                    </div>
                    {selectedEdit.reason && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                        <p className="text-xs text-gray-500 mb-1">Reason</p>
                        <p className="text-gray-700">{selectedEdit.reason}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                    <textarea
                      value={editReviewNotes}
                      onChange={(e) => setEditReviewNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded p-3 h-24 text-sm"
                      placeholder="Add any notes about your review..."
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEditReview(selectedEdit, true)}
                      disabled={reviewingEditId !== null}
                      className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {reviewingEditId ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleEditReview(selectedEdit, false)}
                      disabled={reviewingEditId !== null}
                      className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setShowEditReviewModal(false)}
                      disabled={reviewingEditId !== null}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {selectedEdit.status === 'pending' && (
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      This edit will need a second approval from another analyst before being applied.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
