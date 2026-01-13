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
  verification_status: 'pending' | 'first_review' | 'second_review' | 'first_validation' | 'verified' | 'rejected';
  submitted_by_email: string | null;
  first_verified_by_email: string | null;
  second_verified_by_email: string | null;
  first_validated_by_email: string | null;
  second_validated_by_email: string | null;
  rejected_by_email: string | null;
  first_verified_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  review_cycle: number;
  created_at: string;
  // Data completeness fields
  source_count: number;
  quote_count: number;
  media_count: number;
  timeline_count: number;
  filled_fields: number;
}

interface EditSuggestion {
  id: number;
  incident_id: number;
  field_name: string;
  current_value: string | null;
  suggested_value: string;
  reason: string | null;
  supporting_quote: string | null;
  source_url: string | null;
  source_title: string | null;
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
  second_review: number;
  first_validation: number;
  verified: number;
  rejected: number;
  returned_for_review: number;
  revalidation: number;
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
  const [activeTab, setActiveTab] = useState<'cases' | 'edits' | 'guests'>('cases');
  
  // Case verification state
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'needs_review' | 'pending' | 'first_review' | 'needs_validation' | 'returned_for_review' | 'revalidation' | 'verified' | 'rejected' | 'all'>('needs_review');
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
  
  // Quote/source selection for edit approval
  const [availableQuotes, setAvailableQuotes] = useState<any[]>([]);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');

  // Guest submissions state
  const [guestSubmissions, setGuestSubmissions] = useState<any[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestFilter, setGuestFilter] = useState<'pending' | 'reviewed' | 'approved' | 'rejected' | 'all'>('pending');
  const [reviewingGuestId, setReviewingGuestId] = useState<number | null>(null);
  const [expandedGuestId, setExpandedGuestId] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && (user.role === 'analyst' || user.role === 'admin' || user.role === 'editor')) {
      // Fetch all data on load
      fetchQueue();
      fetchEditSuggestions();
      fetchGuestSubmissions();
    }
  }, [user, filter, editFilter, guestFilter]);
  
  // Refetch when active tab changes
  useEffect(() => {
    if (user && (user.role === 'analyst' || user.role === 'admin' || user.role === 'editor')) {
      if (activeTab === 'cases') {
        fetchQueue();
      } else if (activeTab === 'edits') {
        fetchEditSuggestions();
      } else if (activeTab === 'guests') {
        fetchGuestSubmissions();
      }
    }
  }, [activeTab]);

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

  async function fetchGuestSubmissions() {
    setGuestLoading(true);
    try {
      const res = await fetch(`/api/guest-submissions?status=${guestFilter}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setGuestSubmissions(data.submissions);
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch guest submissions:', res.status, errorText);
        setError('Failed to fetch guest submissions');
      }
    } catch (err) {
      console.error('Error fetching guest submissions:', err);
      setError('Failed to fetch guest submissions');
    } finally {
      setGuestLoading(false);
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
    // If approving, require some form of evidence: selected quote OR new quote+source OR user-provided
    const hasUserProvidedEvidence = !!(edit.supporting_quote && edit.source_url);
    const hasNewEvidence = !!(newQuoteText && newSourceUrl);
    if (approve && !hasUserProvidedEvidence && !selectedQuoteId && !hasNewEvidence) {
      setError('Provide evidence: select a quote, or enter a new quote and source.');
      return;
    }

    setReviewingEditId(edit.id);
    try {
      const res = await fetch(`/api/edit-suggestions/${edit.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: approve,
          notes: editReviewNotes || undefined,
          quote_id: approve ? selectedQuoteId : undefined,
          new_quote_text: approve && hasNewEvidence ? newQuoteText : undefined,
          new_source_url: approve && hasNewEvidence ? newSourceUrl : undefined,
          new_source_title: approve && hasNewEvidence ? newSourceTitle || undefined : undefined,
        }),
      });
      
      if (res.ok) {
        setShowEditReviewModal(false);
        setEditReviewNotes('');
        setSelectedEdit(null);
        setSelectedQuoteId(null);
        setSelectedSourceId(null);
        setAvailableQuotes([]);
        setAvailableSources([]);
        setNewQuoteText('');
        setNewSourceUrl('');
        setNewSourceTitle('');
        setError(''); // Clear any previous errors
        fetchEditSuggestions();
      } else {
        const data = await res.json();
        setError(data.error || 'Review failed');
        // Don't close modal so user can see the error
      }
    } catch {
      setError('Review failed');
    } finally {
      setReviewingEditId(null);
    }
  }

  async function handleGuestReview(submission: any, status: 'rejected') {
    setReviewingGuestId(submission.id);
    setError('');
    try {
      const res = await fetch(`/api/guest-submissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          status,
          notes: 'Denied by analyst'
        }),
      });

      if (res.ok) {
        fetchGuestSubmissions();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to deny submission');
      }
    } catch (err) {
      setError('Failed to deny submission');
      console.error(err);
    } finally {
      setReviewingGuestId(null);
    }
  }

  async function handleBeginReview(submission: any) {
    setReviewingGuestId(submission.id);
    try {
      const data = typeof submission.submission_data === 'string' 
        ? JSON.parse(submission.submission_data) 
        : submission.submission_data;

      console.log('[handleBeginReview] Guest submission ID:', submission.id);
      console.log('[handleBeginReview] Full submission_data:', JSON.stringify(data, null, 2));
      console.log('[handleBeginReview] Extracted victimName:', data.victimName);
      console.log('[handleBeginReview] victimName type:', typeof data.victimName);
      console.log('[handleBeginReview] victimName length:', data.victimName?.length);

      const [cityFromLocation, stateFromLocation] = (data.location || '').split(',').map((p: string) => p.trim());
      const incidentIdValue = `INC-${Date.now()}`;

      const victimNameValue = data.victimName || null;
      console.log('[handleBeginReview] Final victimName to send:', victimNameValue);

      const createRes = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: incidentIdValue,
          incident_type: data.incidentType || 'death_in_custody',
          date: data.dateOfDeath || null,
          location: {
            city: data.city || cityFromLocation || '',
            state: data.state || stateFromLocation || '',
            facility: data.facility || ''
          },
          subject: {
            name: victimNameValue,
            age: data.age || null,
            gender: data.gender || null,
            nationality: data.nationality || null
          },
          summary: data.description || '',
          from_guest_submission: true
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || 'Failed to create incident from guest submission');
      }

      const created = await createRes.json();
      const newIncidentId = created.id;

      // Seed sources from guest submission
      const sourceUrls: string[] = data.sourceUrls || data.source_urls || [];
      for (const url of sourceUrls) {
        if (!url) continue;
        await fetch(`/api/incidents/${newIncidentId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            title: '',
            publication: '',
            source_type: 'news',
            source_priority: 'secondary'
          }),
        });
      }

      // Seed media from guest submission
      const mediaItems: any[] = data.mediaUrls || data.media_urls || [];
      for (const media of mediaItems) {
        if (!media?.url) continue;
        await fetch(`/api/incidents/${newIncidentId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: media.url,
            media_type: media.type || 'image',
            description: media.description || ''
          }),
        });
      }

      // Mark guest submission as reviewed so it leaves the guest queue
      await fetch(`/api/guest-submissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          status: 'reviewed',
          notes: 'Converted to incident and queued for first review'
        }),
      });

      // Refresh guest submissions to remove the reviewed one from the queue
      fetchGuestSubmissions();

      // Navigate to review page with guest data (transform to snake_case for review page)
      const guestDataForReview = {
        victim_name: data.victimName || '',
        incident_type: data.incidentType || 'death_in_custody',
        incident_date: data.dateOfDeath || '',
        city: data.city || cityFromLocation || '',
        state: data.state || stateFromLocation || '',
        facility: data.facility || '',
        summary: data.description || '',
        subject_age: data.age || '',
        subject_gender: data.gender || '',
        subject_nationality: data.nationality || '',
        media_urls: data.mediaUrls || [],
        source_urls: data.sourceUrls || [],
        guest_submission_id: submission.id
      };
      const guestData = encodeURIComponent(JSON.stringify(guestDataForReview));
      router.push(`/dashboard/review/${newIncidentId}?from_guest=true&guest_data=${guestData}`);
    } catch (err) {
      setError('Failed to begin review');
      console.error(err);
    } finally {
      setReviewingGuestId(null);
    }
  }

  async function openEditReviewModal(edit: EditSuggestion) {
    setSelectedEdit(edit);
    setEditReviewNotes('');
    setSelectedQuoteId(null);
    setSelectedSourceId(null);
    setNewQuoteText('');
    setNewSourceUrl('');
    setNewSourceTitle('');
    setShowEditReviewModal(true);

    // Fetch quotes and sources via verify-field API (provides both)
    setLoadingQuotes(true);
    try {
      const res = await fetch(`/api/incidents/${edit.incident_id}/verify-field`);
      if (res.ok) {
        const data = await res.json();
        setAvailableQuotes(data.quotes || []);
        setAvailableSources(data.sources || []);
      }
    } catch (error) {
      console.error('Failed to fetch quotes/sources:', error);
    } finally {
      setLoadingQuotes(false);
    }
  }

  function openVerifyModal(incident: Incident) {
    setSelectedIncident(incident);
    setVerifyNotes('');
    setShowVerifyModal(true);
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    // Check if date is invalid or epoch
    if (isNaN(date.getTime()) || date.getFullYear() < 1970) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusBadge = (status: string, reviewCycle?: number) => {
    const isReturned = (reviewCycle || 1) >= 2;
    
    switch (status) {
      case 'pending':
        if (isReturned) {
          return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">🔄 Re-Review (Pending)</span>;
        }
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Pending Review</span>;
      case 'first_review':
        if (isReturned) {
          return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">🔄 Re-Review (2nd)</span>;
        }
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Needs 2nd Review</span>;
      case 'second_review':
        if (isReturned) {
          return <span className="px-2 py-1 text-xs bg-cyan-100 text-cyan-800 rounded">🔁 Re-Validation</span>;
        }
        return <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">Awaiting Validation</span>;
      case 'first_validation':
        if (isReturned) {
          return <span className="px-2 py-1 text-xs bg-cyan-100 text-cyan-800 rounded">🔁 Re-Validation (2nd)</span>;
        }
        return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">Needs 2nd Validation</span>;
      case 'verified':
      case 'approved':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">{status === 'verified' ? 'Published' : 'Approved'}</span>;
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

  const totalCaseReviews = stats ? Number(stats.pending) + Number(stats.first_review) : 0;
  const totalValidations = stats ? Number(stats.second_review) + Number(stats.first_validation) : 0;
  const totalEditReviews = editStats ? Number(editStats.pending) + Number(editStats.first_review) : 0;

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
            Suggestions
            {totalEditReviews > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {totalEditReviews}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'guests' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Guest Reports
            {guestSubmissions.filter(g => g.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                {guestSubmissions.filter(g => g.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'cases' ? (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg relative">
                <div className="text-xl font-bold text-yellow-800">{Number(stats.pending) + Number(stats.first_review)}</div>
                <div className="text-xs text-yellow-700">Needs Review</div>
                {Number(stats.returned_for_review) > 0 && (
                  <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
                    {stats.returned_for_review} 🔄
                  </div>
                )}
              </div>
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg relative">
                <div className="text-xl font-bold text-purple-800">{Number(stats.second_review) + Number(stats.first_validation)}</div>
                <div className="text-xs text-purple-700">Needs Validation</div>
                {Number(stats.revalidation) > 0 && (
                  <div className="absolute -top-2 -right-2 bg-cyan-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
                    {stats.revalidation} 🔁
                  </div>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <div className="text-xl font-bold text-green-800">{stats.verified}</div>
                <div className="text-xs text-green-700">Published</div>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <div className="text-xl font-bold text-red-800">{stats.rejected}</div>
                <div className="text-xs text-red-700">Rejected</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <div className="text-xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-xs text-gray-700">Total Cases</div>
              </div>
            </div>
          )}
          
          {/* Returned/Revalidation Alert Cards */}
          {stats && (Number(stats.returned_for_review) > 0 || Number(stats.revalidation) > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {Number(stats.returned_for_review) > 0 && (
                <button
                  onClick={() => setFilter('returned_for_review')}
                  className={`p-4 rounded-lg text-left transition-all ${
                    filter === 'returned_for_review' 
                      ? 'bg-orange-600 text-white ring-2 ring-orange-600 ring-offset-2' 
                      : 'bg-orange-50 border-2 border-orange-300 hover:bg-orange-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔄</span>
                    <div>
                      <div className={`text-2xl font-bold ${filter === 'returned_for_review' ? 'text-white' : 'text-orange-800'}`}>
                        {stats.returned_for_review}
                      </div>
                      <div className={`text-sm font-medium ${filter === 'returned_for_review' ? 'text-orange-100' : 'text-orange-700'}`}>
                        Returned for Re-Review
                      </div>
                      <div className={`text-xs ${filter === 'returned_for_review' ? 'text-orange-200' : 'text-orange-600'}`}>
                        Cases with validation feedback
                      </div>
                    </div>
                  </div>
                </button>
              )}
              {Number(stats.revalidation) > 0 && (
                <button
                  onClick={() => setFilter('revalidation')}
                  className={`p-4 rounded-lg text-left transition-all ${
                    filter === 'revalidation' 
                      ? 'bg-cyan-600 text-white ring-2 ring-cyan-600 ring-offset-2' 
                      : 'bg-cyan-50 border-2 border-cyan-300 hover:bg-cyan-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔁</span>
                    <div>
                      <div className={`text-2xl font-bold ${filter === 'revalidation' ? 'text-white' : 'text-cyan-800'}`}>
                        {stats.revalidation}
                      </div>
                      <div className={`text-sm font-medium ${filter === 'revalidation' ? 'text-cyan-100' : 'text-cyan-700'}`}>
                        Ready for Re-Validation
                      </div>
                      <div className={`text-xs ${filter === 'revalidation' ? 'text-cyan-200' : 'text-cyan-600'}`}>
                        Re-reviewed, awaiting validation
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('needs_review')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'needs_review' ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'}`}
        >
          Needs Review ({stats ? Number(stats.pending) + Number(stats.first_review) : 0})
        </button>
        <button
          onClick={() => setFilter('needs_validation')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'needs_validation' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'}`}
        >
          Needs Validation ({stats ? Number(stats.second_review) + Number(stats.first_validation) : 0})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'}`}
        >
          Rejected ({stats?.rejected || 0})
        </button>
        <span className="border-l border-gray-300 mx-2"></span>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-2 rounded-lg text-xs ${filter === 'pending' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Pending ({stats?.pending || 0})
        </button>
        <button
          onClick={() => setFilter('first_review')}
          className={`px-3 py-2 rounded-lg text-xs ${filter === 'first_review' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          2nd Review ({stats?.first_review || 0})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-3 py-2 rounded-lg text-xs ${filter === 'verified' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Published ({stats?.verified || 0})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 rounded-lg text-xs ${filter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All ({stats?.total || 0})
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
          {filter === 'needs_review' ? 'No cases need review' : 
           filter === 'returned_for_review' ? 'No cases returned from validation' :
           filter === 'revalidation' ? 'No cases ready for re-validation' :
           filter === 'needs_validation' ? 'No cases need validation' :
           'No cases found'}
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const isReturned = (incident.review_cycle || 1) >= 2;
            const isHighPriority = isReturned && (incident.review_cycle || 1) >= 3;
            
            return (
            <div key={incident.id} className={`border-2 rounded-lg p-4 transition-all relative overflow-visible ${
              isHighPriority
                ? 'border-red-400 bg-red-50/40 shadow-md hover:shadow-lg hover:border-red-500' 
                : isReturned 
                  ? 'border-orange-400 bg-orange-50/40 shadow-sm hover:shadow-md hover:border-orange-500' 
                  : 'border-gray-200 hover:border-gray-300'
            }`}>
              {/* Priority Badge */}
              {isReturned && (
                <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold shadow-md z-10 ${
                  isHighPriority 
                    ? 'bg-red-600 text-white animate-pulse' 
                    : 'bg-orange-600 text-white'
                }`}>
                  {isHighPriority ? '⚠️ HIGH PRIORITY' : '⚡ PRIORITY'}
                </div>
              )}
              
              <div className={`flex items-start justify-between gap-4 ${isReturned ? 'pr-32' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {statusBadge(incident.verification_status, incident.review_cycle)}
                    
                    {/* Cycle Badge - Large and Prominent for Returned Cases */}
                    {isReturned && (
                      <span className={`px-2.5 py-1 text-sm font-bold rounded ${
                        isHighPriority
                          ? 'bg-red-600 text-white ring-2 ring-red-300'
                          : 'bg-orange-600 text-white ring-2 ring-orange-300'
                      }`}>
                        {isHighPriority ? '🔥 ' : '🔄 '}Review Cycle {incident.review_cycle}
                      </span>
                    )}
                    
                    <span className="text-xs text-gray-500">
                      {incident.incident_type ? incident.incident_type.replace(/_/g, ' ') : 'unknown'}
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
                  
                  {/* Data Completeness Indicator */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${incident.filled_fields >= 7 ? 'bg-green-100 text-green-700' : incident.filled_fields >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      📋 {incident.filled_fields || 0}/9 fields
                    </span>
                    {incident.source_count > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">📰 {incident.source_count} sources</span>
                    )}
                    {incident.quote_count > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">💬 {incident.quote_count} quotes</span>
                    )}
                    {incident.media_count > 0 && (
                      <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded">🖼️ {incident.media_count} media</span>
                    )}
                    {incident.timeline_count > 0 && (
                      <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded">📅 {incident.timeline_count} events</span>
                    )}
                    {!incident.source_count && !incident.quote_count && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded">⚠️ No sources yet</span>
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
                    {incident.first_validated_by_email && (
                      <p>1st Validation: {incident.first_validated_by_email}</p>
                    )}
                    {incident.second_validated_by_email && (
                      <p>2nd Validation: {incident.second_validated_by_email}</p>
                    )}
                  </div>
                  
                  {/* Rejection Reason Display */}
                  {incident.verification_status === 'rejected' && incident.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 text-lg">⛔</span>
                        <div>
                          <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                          <p className="text-sm text-red-700 mt-1">{incident.rejection_reason}</p>
                          {incident.rejected_by_email && incident.rejected_at && (
                            <p className="text-xs text-red-500 mt-2">
                              Rejected by {incident.rejected_by_email} on {formatDate(incident.rejected_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {['second_review', 'first_validation'].includes(incident.verification_status) ? (
                    <Link
                      href={`/dashboard/validate/${incident.id}`}
                      className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
                    >
                      Validate Case
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/review/${incident.id}`}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                    >
                      {incident.verification_status === 'first_review' && incident.first_verified_by_email === user?.email && user?.role !== 'admin' ? 'View (Locked)' : 'Review Fields'}
                    </Link>
                  )}
                  
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 text-center"
                  >
                    View Details
                  </Link>
                  
                  {incident.verification_status === 'first_review' && incident.first_verified_by_email === user?.email && (
                    <span className="px-3 py-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded text-center">
                      {user?.role === 'admin' ? '👑 Admin Can Override' : '🔒 Awaiting 2nd Analyst'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
          })}
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
                        (edit.status === 'first_review' && (edit.first_reviewed_by_email !== user?.email || user?.role === 'admin'))) && (
                        <button
                          onClick={() => openEditReviewModal(edit)}
                          disabled={reviewingEditId === edit.id}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {reviewingEditId === edit.id ? 'Processing...' : 'Review'}
                        </button>
                      )}
                      
                      {edit.status === 'first_review' && edit.first_reviewed_by_email === user?.email && user?.role !== 'admin' && (
                        <span className="px-3 py-2 text-xs text-gray-500 text-center">
                          Awaiting another analyst
                        </span>
                      )}
                      
                      {edit.status === 'first_review' && edit.first_reviewed_by_email === user?.email && user?.role === 'admin' && (
                        <span className="px-3 py-2 text-xs text-blue-600 text-center">
                          Ready for 2nd review (admin override)
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
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    
                    {/* User-provided evidence */}
                    {(selectedEdit.supporting_quote || selectedEdit.source_url) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-green-700 mb-2">✓ Evidence Provided by User</p>
                        {selectedEdit.supporting_quote && (
                          <div className="bg-green-50 p-2 rounded mb-2">
                            <p className="text-xs text-gray-600 mb-1">Quote:</p>
                            <p className="text-sm text-gray-800">{selectedEdit.supporting_quote}</p>
                          </div>
                        )}
                        {selectedEdit.source_url && (
                          <div className="text-xs">
                            <span className="text-gray-600">Source: </span>
                            <a href={selectedEdit.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {selectedEdit.source_title || selectedEdit.source_url}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Quote Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Supporting Quote {!(selectedEdit.supporting_quote && selectedEdit.source_url) && <span className="text-red-600">*</span>}
                    </label>
                    {(selectedEdit.supporting_quote && selectedEdit.source_url) ? (
                      <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                        <p className="text-green-700 font-medium mb-1">
                          ✓ User provided evidence - no additional quote needed
                        </p>
                        <p className="text-xs text-gray-600">
                          The submitter included a quote and source. You can optionally link to an existing quote, or approve with the user-provided evidence.
                        </p>
                      </div>
                    ) : loadingQuotes ? (
                      <p className="text-sm text-gray-500">Loading quotes...</p>
                    ) : availableQuotes.length > 0 ? (
                      <select
                        value={selectedQuoteId || ''}
                        onChange={(e) => {
                          const quoteId = e.target.value ? parseInt(e.target.value) : null;
                          setSelectedQuoteId(quoteId);
                          // Auto-select the source for this quote
                          if (quoteId) {
                            const quote = availableQuotes.find(q => q.id === quoteId);
                            if (quote) {
                              setSelectedSourceId(quote.source_id);
                            }
                          }
                        }}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                      >
                        <option value="">Select a quote that supports this edit...</option>
                        {availableQuotes.map(quote => (
                          <option key={quote.id} value={quote.id}>
                            {quote.quote_text.substring(0, 100)}...
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-amber-600">
                        No quotes available for this incident. 
                        <Link href={`/incidents/${selectedEdit.incident_id}`} className="underline ml-1">
                          Add quotes first
                        </Link>
                      </p>
                    )}
                    {selectedQuoteId && (
                      <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
                        <p className="text-xs text-gray-600 mb-1">Selected quote:</p>
                        <p className="text-gray-800">
                          {availableQuotes.find(q => q.id === selectedQuoteId)?.quote_text}
                        </p>
                        {selectedSourceId && (
                          <p className="text-xs text-gray-600 mt-2">
                            Source: {availableSources.find(s => s.id === selectedSourceId)?.title || 'Unknown'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Or add new evidence */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Or add new evidence</label>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Quote Text</p>
                        <textarea
                          value={newQuoteText}
                          onChange={(e) => setNewQuoteText(e.target.value)}
                          rows={2}
                          placeholder="Paste the quote that supports this edit..."
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Source URL</p>
                        <input
                          type="url"
                          value={newSourceUrl}
                          onChange={(e) => setNewSourceUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Source Title (optional)</p>
                        <input
                          type="text"
                          value={newSourceTitle}
                          onChange={(e) => setNewSourceTitle(e.target.value)}
                          placeholder="e.g., Publication or doc title"
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        We will save this source and quote to the incident and link it to the field.
                      </p>
                    </div>
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
                      disabled={reviewingEditId !== null || (!selectedQuoteId && !(selectedEdit.supporting_quote && selectedEdit.source_url))}
                      className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  {!selectedQuoteId && !(selectedEdit.supporting_quote && selectedEdit.source_url) && (
                    <p className="text-xs text-amber-600 mt-3 text-center">
                      You must select a quote or have user-provided evidence to approve this edit
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Guest Submissions Tab */}
      {activeTab === 'guests' && (
        <>
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setGuestFilter('pending')} className={`px-3 py-1.5 rounded text-sm font-medium ${guestFilter === 'pending' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Pending ({guestSubmissions.filter(g => g.status === 'pending').length})
            </button>
            <button onClick={() => setGuestFilter('reviewed')} className={`px-3 py-1.5 rounded text-sm font-medium ${guestFilter === 'reviewed' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Reviewed ({guestSubmissions.filter(g => g.status === 'reviewed').length})
            </button>
            <button onClick={() => setGuestFilter('approved')} className={`px-3 py-1.5 rounded text-sm font-medium ${guestFilter === 'approved' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Approved ({guestSubmissions.filter(g => g.status === 'approved').length})
            </button>
            <button onClick={() => setGuestFilter('rejected')} className={`px-3 py-1.5 rounded text-sm font-medium ${guestFilter === 'rejected' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Rejected ({guestSubmissions.filter(g => g.status === 'rejected').length})
            </button>
            <button onClick={() => setGuestFilter('all')} className={`px-3 py-1.5 rounded text-sm font-medium ${guestFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              All ({guestSubmissions.length})
            </button>
          </div>

          {/* Guest Submissions List */}
          {guestLoading ? (
            <div className="text-center py-8 text-gray-500">Loading guest submissions...</div>
          ) : guestSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No guest submissions found</div>
          ) : (
            <div className="space-y-4">
              {guestSubmissions.map((submission) => {
                const data = typeof submission.submission_data === 'string' 
                  ? JSON.parse(submission.submission_data) 
                  : submission.submission_data;
                
                return (
                  <div key={submission.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {data.victimName || 'Unknown/Anonymous'}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            submission.status === 'pending' ? 'bg-purple-100 text-purple-800' :
                            submission.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                            submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {submission.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>📅 {data.dateOfDeath || 'Unknown'}</div>
                          <div>📍 {data.location || 'Unknown'}</div>
                          {data.facility && <div>🏢 {data.facility}</div>}
                          {data.incidentType && <div>📋 {data.incidentType}</div>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div>Submitted {new Date(submission.created_at).toLocaleDateString()}</div>
                        <div>{submission.ip_address}</div>
                        {submission.email && <div>✉️ {submission.email}</div>}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-800">{data.description}</p>
                    </div>

                    {data.sourceUrls && data.sourceUrls.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Sources:</p>
                        <div className="space-y-1">
                          {data.sourceUrls.map((url: string, idx: number) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-blue-600 hover:underline truncate"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.mediaUrls && data.mediaUrls.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Media:</p>
                        <div className="space-y-1">
                          {data.mediaUrls.map((media: any, idx: number) => (
                            <a
                              key={idx}
                              href={media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-blue-600 hover:underline truncate"
                            >
                              {media.type === 'image' ? '🖼️' : '🎥'} {media.url}
                              {media.description && <span className="text-gray-600"> - {media.description}</span>}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <button
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        onClick={() => setExpandedGuestId(expandedGuestId === submission.id ? null : submission.id)}
                      >
                        {expandedGuestId === submission.id ? 'Hide Details' : 'View Details'}
                      </button>
                      {submission.status === 'pending' && (
                        <>
                          <button
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
                            onClick={() => handleBeginReview(submission)}
                            disabled={reviewingGuestId === submission.id}
                          >
                            {reviewingGuestId === submission.id ? 'Creating...' : 'Begin Review'}
                          </button>
                          <button
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to deny/delete this submission?')) {
                                handleGuestReview(submission, 'rejected');
                              }
                            }}
                            disabled={reviewingGuestId !== null}
                          >
                            Deny
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Expanded Details */}
                    {expandedGuestId === submission.id && (
                      <div className="mt-3 pt-3 border-t bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                        <h4 className="font-semibold text-sm mb-2">Full Details</h4>
                        <div className="space-y-2 text-sm">
                          {Object.entries(data).map(([key, value]) => {
                            if (!value || key === 'submittedAt') return null;
                            if (typeof value === 'object') return null;
                            return (
                              <div key={key} className="grid grid-cols-3 gap-2">
                                <span className="font-medium text-gray-700">{key}:</span>
                                <span className="col-span-2 text-gray-900">{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}


    </div>
  );
}
