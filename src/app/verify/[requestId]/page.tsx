'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface VerificationRequest {
  id: number;
  project_id: number;
  record_id: number;
  requested_at: string;
  priority: string;
  request_notes: string | null;
  verification_scope: 'record' | 'data';
  items_to_verify: Array<{ type: string; id?: number; field_slug?: string }> | null;
  status: string;
  assigned_to: number | null;
  verifier_notes: string | null;
  project_name: string;
  project_slug: string;
  record_type_name: string;
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

interface ItemVerification {
  type: 'field' | 'quote' | 'source';
  id?: number;
  field_slug?: string;
  verified: boolean;
  notes: string;
  issues: string[];
}

export default function VerifierWorkPage({
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
  const [globalIssues, setGlobalIssues] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState('');
  
  // For record-level verification
  const [recordVerified, setRecordVerified] = useState(true);
  
  // For data-level verification
  const [itemVerifications, setItemVerifications] = useState<Map<string, ItemVerification>>(new Map());
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const res = await fetch(`/api/verifier/requests/${requestId}`);
      
      if (res.status === 403) {
        router.push('/verify');
        return;
      }
      
      if (!res.ok) throw new Error('Failed to load request');
      
      const data = await res.json();
      setRequest(data.request);
      setQuotes(data.quotes || []);
      setSources(data.sources || []);
      setFieldDefinitions(data.fieldDefinitions || []);
      
      // Initialize item verifications for data-level scope
      if (data.request.verification_scope === 'data') {
        const initialVerifications = new Map<string, ItemVerification>();
        
        // Add all fields
        for (const field of data.fieldDefinitions) {
          if (data.request.record_data[field.slug] !== undefined && 
              data.request.record_data[field.slug] !== null &&
              data.request.record_data[field.slug] !== '') {
            initialVerifications.set(`field:${field.slug}`, {
              type: 'field',
              field_slug: field.slug,
              verified: true,
              notes: '',
              issues: []
            });
          }
        }
        
        // Add all quotes
        for (const quote of data.quotes) {
          initialVerifications.set(`quote:${quote.id}`, {
            type: 'quote',
            id: quote.id,
            verified: true,
            notes: '',
            issues: []
          });
        }
        
        // Add all sources
        for (const source of data.sources) {
          initialVerifications.set(`source:${source.id}`, {
            type: 'source',
            id: source.id,
            verified: true,
            notes: '',
            issues: []
          });
        }
        
        setItemVerifications(initialVerifications);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  const updateItemVerification = (key: string, updates: Partial<ItemVerification>) => {
    setItemVerifications(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key);
      if (existing) {
        newMap.set(key, { ...existing, ...updates });
      }
      return newMap;
    });
  };

  const handleComplete = async (result: 'passed' | 'partial' | 'failed') => {
    if (!request) return;
    
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        result,
        verifier_notes: verifierNotes,
        issues_found: globalIssues
      };
      
      // For data-level, include item results
      if (request.verification_scope === 'data') {
        body.item_results = Array.from(itemVerifications.values());
      } else {
        body.record_verified = recordVerified;
      }
      
      const res = await fetch(`/api/verifier/requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete verification');
      }
      
      router.push('/verify');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/verifier/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          verifier_notes: verifierNotes
        })
      });
      
      if (!res.ok) throw new Error('Failed to reject');
      
      router.push('/verify');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const addGlobalIssue = () => {
    if (newIssue.trim()) {
      setGlobalIssues([...globalIssues, newIssue.trim()]);
      setNewIssue('');
    }
  };

  const getFieldName = (slug: string) => {
    const field = fieldDefinitions.find(f => f.slug === slug);
    return field?.name || slug;
  };

  const getVerificationSummary = () => {
    if (!request || request.verification_scope !== 'data') return null;
    
    const items = Array.from(itemVerifications.values());
    const verified = items.filter(i => i.verified).length;
    const failed = items.filter(i => !i.verified).length;
    
    return { total: items.length, verified, failed };
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
          <Link href="/verify" className="text-blue-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const summary = getVerificationSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/verify" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-xl font-bold">Verification #{request.id}</h1>
              <p className="text-sm text-gray-600">
                {request.project_name} → {request.record_type_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {request.priority === 'urgent' || request.priority === 'high' ? (
                <span className="px-3 py-1 bg-red-600 text-white text-sm rounded">
                  {request.priority.toUpperCase()}
                </span>
              ) : null}
              <span className={`px-3 py-1 text-sm rounded ${
                request.verification_scope === 'record' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-teal-100 text-teal-800'
              }`}>
                {request.verification_scope === 'record' ? 'Full Record' : 'Data Items'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Data to Verify */}
          <div className="col-span-2 space-y-6">
            
            {/* Request Notes */}
            {request.request_notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">Requester Notes</h3>
                <p className="text-sm text-blue-700">{request.request_notes}</p>
              </div>
            )}

            {/* Record Data */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Record Data</h2>
                {request.verification_scope === 'data' && (
                  <p className="text-sm text-gray-500">
                    Mark each field as verified or flagged with issues
                  </p>
                )}
              </div>
              <div className="divide-y">
                {fieldDefinitions
                  .filter(field => {
                    const value = request.record_data[field.slug];
                    return value !== undefined && value !== null && value !== '';
                  })
                  .map(field => {
                    const value = request.record_data[field.slug];
                    const key = `field:${field.slug}`;
                    const itemVerif = itemVerifications.get(key);
                    
                    return (
                      <div key={field.slug} className={`p-4 ${
                        request.verification_scope === 'data' && itemVerif && !itemVerif.verified 
                          ? 'bg-red-50' 
                          : ''
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                              {field.name}
                            </label>
                            <div className="mt-1 text-gray-900">
                              {Array.isArray(value) 
                                ? value.join(', ') 
                                : typeof value === 'object' 
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                            </div>
                          </div>
                          
                          {request.verification_scope === 'data' && itemVerif && (
                            <div className="ml-4 flex items-center gap-2">
                              <button
                                onClick={() => updateItemVerification(key, { verified: true })}
                                className={`p-2 rounded ${
                                  itemVerif.verified 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                                title="Mark as verified"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => updateItemVerification(key, { verified: false })}
                                className={`p-2 rounded ${
                                  !itemVerif.verified 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                                title="Flag as issue"
                              >
                                ✗
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {request.verification_scope === 'data' && itemVerif && !itemVerif.verified && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Note about this issue..."
                              value={itemVerif.notes}
                              onChange={(e) => updateItemVerification(key, { notes: e.target.value })}
                              className="w-full text-sm border rounded px-2 py-1"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Quotes */}
            {quotes.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">Quotes ({quotes.length})</h2>
                  <p className="text-sm text-gray-500">Verify quotes match their sources</p>
                </div>
                <div className="divide-y">
                  {quotes.map(quote => {
                    const key = `quote:${quote.id}`;
                    const itemVerif = itemVerifications.get(key);
                    
                    return (
                      <div key={quote.id} className={`p-4 ${
                        request.verification_scope === 'data' && itemVerif && !itemVerif.verified 
                          ? 'bg-red-50' 
                          : ''
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <blockquote className="italic text-gray-800 border-l-4 border-gray-300 pl-4">
                              &ldquo;{quote.quote_text}&rdquo;
                            </blockquote>
                            {quote.source && (
                              <p className="text-sm text-gray-600 mt-2">— {quote.source}</p>
                            )}
                            {quote.source_url && (
                              <a 
                                href={quote.source_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View Source →
                              </a>
                            )}
                            {quote.linked_fields?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Supports: {quote.linked_fields.map(f => getFieldName(f)).join(', ')}
                              </p>
                            )}
                          </div>
                          
                          {request.verification_scope === 'data' && itemVerif && (
                            <div className="ml-4 flex items-center gap-2">
                              <button
                                onClick={() => updateItemVerification(key, { verified: true })}
                                className={`p-2 rounded ${
                                  itemVerif.verified 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => updateItemVerification(key, { verified: false })}
                                className={`p-2 rounded ${
                                  !itemVerif.verified 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                ✗
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {request.verification_scope === 'data' && itemVerif && !itemVerif.verified && (
                          <input
                            type="text"
                            placeholder="Note about this issue..."
                            value={itemVerif.notes}
                            onChange={(e) => updateItemVerification(key, { notes: e.target.value })}
                            className="w-full text-sm border rounded px-2 py-1 mt-2"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sources */}
            {sources.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">Sources ({sources.length})</h2>
                  <p className="text-sm text-gray-500">Verify sources are accessible and accurate</p>
                </div>
                <div className="divide-y">
                  {sources.map(source => {
                    const key = `source:${source.id}`;
                    const itemVerif = itemVerifications.get(key);
                    
                    return (
                      <div key={source.id} className={`p-4 ${
                        request.verification_scope === 'data' && itemVerif && !itemVerif.verified 
                          ? 'bg-red-50' 
                          : ''
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {source.title && (
                                <span className="font-medium">{source.title}</span>
                              )}
                              {source.source_type && (
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {source.source_type}
                                </span>
                              )}
                            </div>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline block mt-1"
                            >
                              {source.url}
                            </a>
                            {source.notes && (
                              <p className="text-sm text-gray-600 mt-1">{source.notes}</p>
                            )}
                          </div>
                          
                          {request.verification_scope === 'data' && itemVerif && (
                            <div className="ml-4 flex items-center gap-2">
                              <button
                                onClick={() => updateItemVerification(key, { verified: true })}
                                className={`p-2 rounded ${
                                  itemVerif.verified 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => updateItemVerification(key, { verified: false })}
                                className={`p-2 rounded ${
                                  !itemVerif.verified 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                ✗
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {request.verification_scope === 'data' && itemVerif && !itemVerif.verified && (
                          <input
                            type="text"
                            placeholder="Note about this issue..."
                            value={itemVerif.notes}
                            onChange={(e) => updateItemVerification(key, { notes: e.target.value })}
                            className="w-full text-sm border rounded px-2 py-1 mt-2"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="space-y-6">
            {/* Summary for data-level */}
            {summary && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Verification Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Items</span>
                    <span className="font-medium">{summary.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Verified</span>
                    <span className="font-medium text-green-600">{summary.verified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Flagged</span>
                    <span className="font-medium text-red-600">{summary.failed}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Record-level checkbox */}
            {request.verification_scope === 'record' && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Record Verification</h3>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={recordVerified}
                    onChange={(e) => setRecordVerified(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">All data verified accurate</div>
                    <div className="text-sm text-gray-500">
                      I have reviewed all fields, quotes, and sources and confirm the record is accurate
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Verifier Notes</h3>
              <textarea
                value={verifierNotes}
                onChange={(e) => setVerifierNotes(e.target.value)}
                rows={4}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Add any observations, caveats, or recommendations..."
              />
            </div>

            {/* Issues */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Global Issues</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addGlobalIssue()}
                  placeholder="Add an issue..."
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={addGlobalIssue}
                  className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                >
                  Add
                </button>
              </div>
              {globalIssues.length > 0 && (
                <ul className="space-y-1">
                  {globalIssues.map((issue, i) => (
                    <li key={i} className="flex items-center justify-between text-sm bg-red-50 px-2 py-1 rounded">
                      <span>{issue}</span>
                      <button
                        onClick={() => setGlobalIssues(globalIssues.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Complete Actions */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Complete Verification</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleComplete('passed')}
                  disabled={submitting}
                  className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Verification Passed
                </button>
                <button
                  onClick={() => handleComplete('partial')}
                  disabled={submitting}
                  className="w-full py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                >
                  ⚠ Partial (Some Issues)
                </button>
                <button
                  onClick={() => handleComplete('failed')}
                  disabled={submitting}
                  className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  ✗ Verification Failed
                </button>
              </div>
            </div>

            {/* Reject */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Cannot Verify</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm mb-2"
                placeholder="Reason for rejection..."
              />
              <button
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
                className="w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Reject Request
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Use this if the request cannot be verified (e.g., insufficient sources, unclear scope)
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
