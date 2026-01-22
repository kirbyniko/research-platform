'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface VerificationRequest {
  id: number;
  project_id: number;
  record_id: number;
  requested_by: number;
  requested_at: string;
  priority: string;
  request_notes: string | null;
  verification_scope: string;
  items_to_verify: Array<{ type: string; id?: number; field_slug?: string }> | null;
  status: string;
  assigned_to: number | null;
  verifier_notes: string | null;
  rejection_reason: string | null;
  issues_found: string[] | null;
  project_name: string;
  project_slug: string;
  record_type_name: string;
  record_type_slug: string;
  record_data: Record<string, unknown>;
  record_status: string;
  requested_by_email: string;
  requested_by_name: string | null;
}

interface Quote {
  id: number;
  quote_text: string;
  source: string | null;
  source_url: string | null;
  linked_fields: string[];
}

interface Source {
  id: number;
  url: string;
  title: string | null;
  source_type: string | null;
  notes: string | null;
}

interface FieldDefinition {
  id: number;
  slug: string;
  name: string;
  field_type: string;
}

interface VerificationResult {
  item_type: string;
  item_id?: number;
  field_slug?: string;
  verified: boolean;
  notes: string;
  caveats: string;
  issues: string[];
}

export default function VerificationDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  
  // Form state
  const [verifierNotes, setVerifierNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [issuesFound, setIssuesFound] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState('');
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const res = await fetch(`/api/admin/verification-requests/${requestId}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/');
          return;
        }
        throw new Error('Failed to load verification request');
      }
      
      const data = await res.json();
      setRequest(data.request);
      setQuotes(data.quotes || []);
      setSources(data.sources || []);
      setFieldDefinitions(data.field_definitions || []);
      
      console.log('Verification request data:', {
        fieldDefinitionsCount: (data.field_definitions || []).length,
        recordDataKeys: Object.keys(data.request.record_data || {}),
        hasRecordData: !!data.request.record_data
      });
      
      // Initialize results based on scope
      if (data.request.verification_scope === 'record') {
        setResults([{
          item_type: 'record',
          verified: false,
          notes: '',
          caveats: '',
          issues: []
        }]);
      } else {
        // Data-level: create result for each item
        const items = data.request.items_to_verify || [];
        setResults(items.map((item: { type: string; id?: number; field_slug?: string }) => ({
          item_type: item.type,
          item_id: item.id,
          field_slug: item.field_slug,
          verified: false,
          notes: '',
          caveats: '',
          issues: []
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verification-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign' })
      });
      
      if (!res.ok) throw new Error('Failed to assign');
      
      await loadRequest();
    } catch (err) {
      alert('Failed to assign request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (result: 'passed' | 'failed' | 'partial') => {
    if (result !== 'passed' && !verifierNotes && issuesFound.length === 0) {
      alert('Please provide notes or issues explaining why verification did not pass');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verification-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          verification_result: result,
          verifier_notes: verifierNotes,
          issues_found: issuesFound.length > 0 ? issuesFound : null,
          results: results.map(r => ({
            ...r,
            verified: result === 'passed' ? true : r.verified
          }))
        })
      });
      
      if (!res.ok) throw new Error('Failed to complete verification');
      
      router.push('/admin?tab=verification');
    } catch (err) {
      alert('Failed to complete verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      alert('Please provide a rejection reason');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verification-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReason,
          verifier_notes: verifierNotes
        })
      });
      
      if (!res.ok) throw new Error('Failed to reject');
      
      router.push('/admin?tab=verification');
    } catch (err) {
      alert('Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const addIssue = () => {
    if (newIssue.trim()) {
      setIssuesFound([...issuesFound, newIssue.trim()]);
      setNewIssue('');
    }
  };

  const removeIssue = (index: number) => {
    setIssuesFound(issuesFound.filter((_, i) => i !== index));
  };

  const getFieldName = (slug: string) => {
    const field = fieldDefinitions.find(f => f.slug === slug);
    return field?.name || slug;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Request not found'}</p>
          <Link href="/admin" className="text-blue-600 hover:underline">
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  const isAssignedToMe = request.status === 'in_progress';
  const canProcess = request.status === 'pending' || request.status === 'in_progress';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-xl font-bold">Verification Request #{request.id}</h1>
              <p className="text-sm text-gray-600">
                {request.project_name} → {request.record_type_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {request.priority === 'urgent' && (
                <span className="px-3 py-1 bg-red-600 text-white text-sm rounded">URGENT</span>
              )}
              <span className={`px-3 py-1 text-sm rounded ${
                request.verification_scope === 'record' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {request.verification_scope === 'record' ? 'Full Record Verification' : 'Data-Level Verification'}
              </span>
              <span className={`px-3 py-1 text-sm rounded ${
                request.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                request.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {request.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Record Data */}
          <div className="col-span-2 space-y-6">
            {/* Request Info */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold mb-4">Request Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Requested by:</span>
                  <p className="font-medium">{request.requested_by_name || request.requested_by_email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Requested at:</span>
                  <p className="font-medium">{new Date(request.requested_at).toLocaleString()}</p>
                </div>
              </div>
              {request.request_notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <span className="text-xs text-gray-500 uppercase">User Notes:</span>
                  <p className="mt-1">{request.request_notes}</p>
                </div>
              )}
            </div>

            {/* Record Data - Full Inline View */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Record Data</h2>
                {request.verification_scope === 'record' && (
                  <span className="text-sm text-gray-500">Full record verification mode</span>
                )}
              </div>
              
              <div className="space-y-6">
                {fieldDefinitions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No field definitions found</p>
                    <p className="text-xs mt-2">Debug: Check console for details</p>
                  </div>
                )}
                
                {fieldDefinitions.map(field => {
                  const value = request.record_data[field.slug];
                  
                  // Show all fields, even empty ones for debugging
                  const isEmpty = value === undefined || value === null || value === '';
                  
                  // Get quotes for this field
                  const fieldQuotes = quotes.filter(q => q.linked_fields?.includes(field.slug));
                  
                  // Check if this field is verified (for data-level verification)
                  const fieldResult = results.find(r => r.field_slug === field.slug);
                  const isVerified = fieldResult?.verified || false;
                  
                  return (
                    <div key={field.slug} className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50 rounded-r">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{field.name}</h3>
                            {fieldQuotes.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {fieldQuotes.length} {fieldQuotes.length === 1 ? 'quote' : 'quotes'}
                              </span>
                            )}
                          </div>
                        </div>
                        {isAssignedToMe && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isVerified}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const existing = results.find(r => r.field_slug === field.slug);
                                if (existing) {
                                  setResults(results.map(r => 
                                    r.field_slug === field.slug 
                                      ? { ...r, verified: checked }
                                      : r
                                  ));
                                } else {
                                  setResults([...results, {
                                    item_type: 'field',
                                    field_slug: field.slug,
                                    verified: checked,
                                    notes: '',
                                    caveats: '',
                                    issues: []
                                  }]);
                                }
                              }}
                              className="rounded text-green-600"
                            />
                            <span className="text-sm text-gray-600">Verified</span>
                          </label>
                        )}
                      </div>
                      
                      <div className="mt-2 text-gray-900 bg-white p-3 rounded">
                        {isEmpty ? (
                          <p className="text-gray-400 italic text-sm">No value provided</p>
                        ) : field.field_type === 'textarea' ? (
                          <p className="whitespace-pre-wrap">{String(value)}</p>
                        ) : Array.isArray(value) ? (
                          <ul className="list-disc list-inside space-y-1">
                            {value.map((item, i) => (
                              <li key={i}>{String(item)}</li>
                            ))}
                          </ul>
                        ) : typeof value === 'object' ? (
                          <pre className="text-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                        ) : (
                          <p>{String(value)}</p>
                        )}
                      </div>
                      
                      {/* Quotes supporting this field */}
                      {fieldQuotes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-gray-600 uppercase">Supporting Quotes:</div>
                          {fieldQuotes.map(quote => (
                            <div key={quote.id} className="bg-blue-50 border border-blue-200 rounded p-3">
                              <blockquote className="text-sm italic text-gray-700 mb-2">
                                &ldquo;{quote.quote_text}&rdquo;
                              </blockquote>
                              {quote.source && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">— {quote.source}</span>
                                  {quote.source_url && (
                                    <a 
                                      href={quote.source_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline font-medium"
                                    >
                                      View Source →
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sources Reference List */}
            {sources.length > 0 && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold mb-4">Sources ({sources.length})</h2>
                <div className="space-y-3">
                  {sources.map(source => (
                    <div key={source.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{source.title || 'Untitled Source'}</p>
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {source.url}
                        </a>
                        {source.source_type && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 rounded">
                            {source.source_type}
                          </span>
                        )}
                        {source.notes && (
                          <p className="text-sm text-gray-500 mt-1">{source.notes}</p>
                        )}
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Verification Panel */}
          <div className="space-y-6">
            {/* Action Panel - Sticky with scroll */}
            <div className="bg-white rounded-lg border sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="p-6">
                <h2 className="font-semibold mb-4">Verification Actions</h2>
              
              {request.status === 'pending' && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Assign this request to yourself to begin verification
                  </p>
                  <button
                    onClick={handleAssign}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Assigning...' : 'Assign to Me'}
                  </button>
                </div>
              )}

              {isAssignedToMe && (
                <div className="space-y-4">
                  {/* Verifier Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verifier Notes
                    </label>
                    <textarea
                      value={verifierNotes}
                      onChange={e => setVerifierNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded text-sm"
                      placeholder="Notes about this verification (visible to requester)..."
                    />
                  </div>

                  {/* Issues Found */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issues Found
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newIssue}
                        onChange={e => setNewIssue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIssue())}
                        className="flex-1 px-3 py-1 border rounded text-sm"
                        placeholder="Add an issue..."
                      />
                      <button
                        onClick={addIssue}
                        className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                      >
                        Add
                      </button>
                    </div>
                    {issuesFound.length > 0 && (
                      <ul className="space-y-1">
                        {issuesFound.map((issue, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-red-600">
                            <span>• {issue}</span>
                            <button
                              onClick={() => removeIssue(i)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <hr />

                  {/* Completion Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleComplete('passed')}
                      disabled={submitting}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓ Verification Passed
                    </button>
                    <button
                      onClick={() => handleComplete('partial')}
                      disabled={submitting}
                      className="w-full px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                    >
                      ⚠ Partial Verification
                    </button>
                    <button
                      onClick={() => handleComplete('failed')}
                      disabled={submitting}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      ✗ Verification Failed
                    </button>
                  </div>

                  <hr />

                  {/* Reject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Or Reject Request
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border rounded text-sm mb-2"
                      placeholder="Reason for rejection (e.g., insufficient data)..."
                    />
                    <button
                      onClick={handleReject}
                      disabled={submitting || !rejectionReason}
                      className="w-full px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject Request
                    </button>
                  </div>
                </div>
              )}

              {request.status === 'completed' && (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">
                    {request.verifier_notes?.includes('passed') ? '✓' : '✗'}
                  </div>
                  <p className="font-medium text-green-600">Verification Completed</p>
                  {request.verifier_notes && (
                    <p className="text-sm text-gray-600 mt-2">{request.verifier_notes}</p>
                  )}
                </div>
              )}

              {request.status === 'rejected' && (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">✗</div>
                  <p className="font-medium text-red-600">Request Rejected</p>
                  {request.rejection_reason && (
                    <p className="text-sm text-gray-600 mt-2">{request.rejection_reason}</p>
                  )}
                </div>
              )}
              </div>
              
              {/* Verification Checklist */}
              {isAssignedToMe && (
                <div className="border-t p-6">
                  <h3 className="font-semibold mb-3">Verification Checklist</h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      All field values are accurate
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Quotes match their sources
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Sources are accessible
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Data is internally consistent
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Removed separate checklist box - now integrated above */}
          </div>
        </div>
      </main>
    </div>
  );
}
