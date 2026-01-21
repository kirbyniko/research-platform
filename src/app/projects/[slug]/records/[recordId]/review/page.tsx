'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DynamicForm } from '@/components/dynamic-form';
import { FieldDefinition, FieldGroup, RecordQuote, RecordSource } from '@/types/platform';

interface RecordData {
  id: number;
  data: Record<string, unknown>;
  status: string;
  record_type_slug: string;
  record_type_name: string;
  record_type_id: number;
  workflow_config?: Record<string, unknown>;
  verified_fields: Record<string, { verified: boolean; by: number; at: string }>;
  submitted_by_name?: string;
  is_guest_submission: boolean;
  guest_name?: string;
  guest_email?: string;
  created_at: string;
  updated_at: string;
}

export default function RecordReviewPage({ 
  params 
}: { 
  params: Promise<{ slug: string; recordId: string }> 
}) {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [recordId, setRecordId] = useState<string>('');
  const [record, setRecord] = useState<RecordData | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [quotes, setQuotes] = useState<RecordQuote[]>([]);
  const [sources, setSources] = useState<RecordSource[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // New quote form state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [newQuote, setNewQuote] = useState({
    quote_text: '',
    source: '',
    source_url: '',
    linked_fields: [] as string[],
  });

  // New source form state
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [newSource, setNewSource] = useState({
    url: '',
    title: '',
    source_type: '',
    notes: '',
    linked_fields: [] as string[],
  });

  const fetchRecord = useCallback(async () => {
    if (!projectSlug || !recordId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Record not found');
        }
        throw new Error('Failed to fetch record');
      }
      
      const data = await response.json();
      setRecord(data.record);
      setFields(data.fields || []);
      setGroups(data.groups || []);
      setQuotes(data.quotes || []);
      setSources(data.sources || []);
      setUserRole(data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [projectSlug, recordId]);

  useEffect(() => {
    params.then(p => {
      setProjectSlug(p.slug);
      setRecordId(p.recordId);
    });
  }, [params]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleSaveData = async (formData: Record<string, unknown>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }
      
      await fetchRecord();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this record and send to validation?')) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'pending_validation',
          review_notes: reviewNotes 
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }
      
      router.push(`/projects/${projectSlug}/records/${recordId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      alert('Please provide rejection notes');
      return;
    }
    if (!confirm('Reject this record?')) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'rejected',
          review_notes: reviewNotes 
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject');
      }
      
      router.push(`/projects/${projectSlug}/records/${recordId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.quote_text.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add quote');
      }

      setNewQuote({ quote_text: '', source: '', source_url: '', linked_fields: [] });
      setShowQuoteForm(false);
      await fetchRecord();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add quote');
    }
  };

  const handleDeleteQuote = async (quoteId: number) => {
    if (!confirm('Delete this quote?')) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}/quotes/${quoteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quote');
      }

      await fetchRecord();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete quote');
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.url.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add source');
      }

      setNewSource({ url: '', title: '', source_type: '', notes: '', linked_fields: [] });
      setShowSourceForm(false);
      await fetchRecord();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add source');
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (!confirm('Delete this source?')) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete source');
      }

      await fetchRecord();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete source');
    }
  };

  const handleLinkQuote = async (fieldSlug: string, quoteId: number) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    const linkedFields = quote.linked_fields || [];
    const isLinked = linkedFields.includes(fieldSlug);
    const newLinkedFields = isLinked
      ? linkedFields.filter(f => f !== fieldSlug)
      : [...linkedFields, fieldSlug];

    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linked_fields: newLinkedFields }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quote link');
      }

      await fetchRecord();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to link quote');
    }
  };

  const canReview = userRole && ['owner', 'admin', 'reviewer'].includes(userRole);

  if (!projectSlug || !recordId) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return <div className="p-8 text-center">Loading record...</div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Link href={`/projects/${projectSlug}/records`} className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Records
        </Link>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8">Record not found</div>;
  }

  if (!canReview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          You do not have permission to review this record.
        </div>
        <Link href={`/projects/${projectSlug}/records/${recordId}`} className="mt-4 inline-block text-blue-600 hover:underline">
          ← View Record
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projects/${projectSlug}/records/${recordId}`} className="text-blue-600 hover:underline text-sm">
          ← Back to Record
        </Link>
        
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold">Review: {record.record_type_name} #{record.id}</h1>
            <p className="text-gray-500 mt-1">
              Review submission data, add quotes and sources, then approve or reject.
            </p>
          </div>
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
            {record.status === 'pending_review' ? 'Awaiting Review' : record.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Record Data Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Record Data</h3>
            <DynamicForm
              projectSlug={projectSlug}
              recordTypeSlug={record.record_type_slug}
              recordId={record.id}
              mode="review"
              fields={fields}
              groups={groups}
              initialData={record.data}
              quotes={quotes}
              verifiedFields={record.verified_fields}
              onSubmit={handleSaveData}
              onLinkQuote={handleLinkQuote}
            />
          </div>

          {/* Review Notes & Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Review Notes</h3>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any notes about this submission (required for rejection)..."
              className="w-full border border-gray-300 rounded-md p-3 mb-4"
              rows={4}
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Approve & Send to Validation
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Quotes & Sources */}
        <div className="space-y-6">
          {/* Quotes Section */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Quotes</h3>
              <button
                onClick={() => setShowQuoteForm(!showQuoteForm)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add Quote
              </button>
            </div>

            {showQuoteForm && (
              <form onSubmit={handleAddQuote} className="mb-4 p-3 bg-gray-50 rounded space-y-3">
                <textarea
                  value={newQuote.quote_text}
                  onChange={(e) => setNewQuote({ ...newQuote, quote_text: e.target.value })}
                  placeholder="Quote text..."
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  rows={3}
                  required
                />
                <input
                  type="text"
                  value={newQuote.source}
                  onChange={(e) => setNewQuote({ ...newQuote, source: e.target.value })}
                  placeholder="Source (e.g., John Smith, ICE Spokesperson)"
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
                <input
                  type="url"
                  value={newQuote.source_url}
                  onChange={(e) => setNewQuote({ ...newQuote, source_url: e.target.value })}
                  placeholder="Source URL (optional)"
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowQuoteForm(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Quote
                  </button>
                </div>
              </form>
            )}

            {quotes.length === 0 ? (
              <p className="text-sm text-gray-500">No quotes yet.</p>
            ) : (
              <div className="space-y-3">
                {quotes.map(quote => (
                  <div key={quote.id} className="border-l-2 border-blue-300 pl-3 py-1 text-sm">
                    <p className="italic">&ldquo;{quote.quote_text}&rdquo;</p>
                    {quote.source && (
                      <p className="text-gray-500 text-xs mt-1">— {quote.source}</p>
                    )}
                    {quote.linked_fields && quote.linked_fields.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Linked: {quote.linked_fields.join(', ')}
                      </p>
                    )}
                    <button
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="text-xs text-red-500 hover:underline mt-1"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sources Section */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Sources</h3>
              <button
                onClick={() => setShowSourceForm(!showSourceForm)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add Source
              </button>
            </div>

            {showSourceForm && (
              <form onSubmit={handleAddSource} className="mb-4 p-3 bg-gray-50 rounded space-y-3">
                <input
                  type="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  placeholder="Source URL..."
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  required
                />
                <input
                  type="text"
                  value={newSource.title}
                  onChange={(e) => setNewSource({ ...newSource, title: e.target.value })}
                  placeholder="Title (optional)"
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
                <input
                  type="text"
                  value={newSource.source_type}
                  onChange={(e) => setNewSource({ ...newSource, source_type: e.target.value })}
                  placeholder="Type (e.g., news_article, court_filing)"
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
                <textarea
                  value={newSource.notes}
                  onChange={(e) => setNewSource({ ...newSource, notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  rows={2}
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSourceForm(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Source
                  </button>
                </div>
              </form>
            )}

            {sources.length === 0 ? (
              <p className="text-sm text-gray-500">No sources yet.</p>
            ) : (
              <div className="space-y-3">
                {sources.map(source => (
                  <div key={source.id} className="p-2 bg-gray-50 rounded text-sm">
                    <a href={source.url} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline font-medium block truncate">
                      {source.title || source.url}
                    </a>
                    {source.source_type && (
                      <span className="text-xs bg-gray-200 px-1 rounded">{source.source_type}</span>
                    )}
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="text-xs text-red-500 hover:underline block mt-1"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission Info */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">Submission Info</h3>
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-gray-500">Submitted By</dt>
                <dd className="font-medium">
                  {record.is_guest_submission ? (
                    <span>
                      Guest{record.guest_name ? `: ${record.guest_name}` : ''}
                      {record.guest_email && <span className="text-gray-500 ml-1">({record.guest_email})</span>}
                    </span>
                  ) : (
                    record.submitted_by_name || 'Unknown'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Submitted</dt>
                <dd className="font-medium">{new Date(record.created_at).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
