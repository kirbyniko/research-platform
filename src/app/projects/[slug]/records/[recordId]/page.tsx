'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  submitted_by_email?: string;
  reviewed_by_name?: string;
  validated_by_name?: string;
  is_guest_submission: boolean;
  guest_name?: string;
  guest_email?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  validated_at?: string;
  // Verification fields
  verification_level?: number;
  verification_scope?: string;
  verification_date?: string;
}

interface VerificationResult {
  id: number;
  request_id: number;
  item_type: 'field' | 'quote' | 'source';
  item_id?: number;
  field_slug?: string;
  verified: boolean;
  notes?: string;
  caveats?: string;
  issues?: string[];
  completed_at?: string;
  verifier_name?: string;
}

export default function RecordDetailPage({ 
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
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setQuotes(data.quotes || []);
      setSources(data.sources || []);
      setVerificationRequests(data.verificationRequests || []);
      setVerificationResults(data.verificationResults || []);
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete record');
      }
      
      router.push(`/projects/${projectSlug}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      pending_validation: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    
    const statusLabels: Record<string, string> = {
      pending_review: 'Pending Review',
      pending_validation: 'Pending Validation',
      verified: 'Verified',
      rejected: 'Rejected',
      archived: 'Archived',
    };
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const canDelete = userRole && ['owner', 'admin'].includes(userRole);
  const canReview = userRole && ['owner', 'admin', 'reviewer', 'validator'].includes(userRole) && record && record.status === 'pending_review';
  const canValidate = userRole && ['owner', 'admin', 'validator'].includes(userRole) && record && record.status === 'pending_validation';
  const canProposeEdit = userRole && record && record.status === 'verified';
  // Can request 3rd party verification if record is verified and user has appropriate role
  const canRequestVerification = userRole && ['owner', 'admin', 'validator'].includes(userRole) && record && record.status === 'verified';

  const getVerificationLevelBadge = (level?: number) => {
    if (!level || level === 0) return null;
    const badges: Record<number, { label: string; className: string; icon: string }> = {
      1: { label: 'Self-Verified', className: 'bg-blue-100 text-blue-800', icon: '✓' },
      2: { label: 'Audit-Ready', className: 'bg-purple-100 text-purple-800', icon: '✓✓' },
      3: { label: 'Independently Verified', className: 'bg-emerald-100 text-emerald-800 border border-emerald-300', icon: '✓✓✓' },
    };
    const badge = badges[level];
    if (!badge) return null;
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full inline-flex items-center gap-1 ${badge.className}`}>
        <span className="font-mono text-xs">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const [requestingVerification, setRequestingVerification] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const handleRequestVerification = async (scope: 'record' | 'data', priority: 'low' | 'normal' | 'high') => {
    setRequestingVerification(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}/request-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, priority }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request verification');
      }
      
      alert('Verification request submitted successfully. It will be reviewed by a third-party verifier.');
      setVerificationModalOpen(false);
      fetchRecord(); // Refresh to show the request
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request verification');
    } finally {
      setRequestingVerification(false);
    }
  };

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
        <Link href={`/projects/${projectSlug}`} className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8">Record not found</div>;
  }

  // Determine back link based on user role
  const backLink = userRole ? `/projects/${projectSlug}` : `/projects/${projectSlug}/records`;
  const backText = userRole ? '← Back to Dashboard' : '← Back to Records';
  
  // Always show article-style view
  return (
    <article className="max-w-3xl mx-auto px-6 py-12 bg-white">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link href={backLink} className="text-sm text-gray-500 hover:text-gray-700">
            {backText}
          </Link>
          
          {/* Verification Level Badge */}
          {record.verification_level === 3 && (
            <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-sm font-medium">
              ✓✓✓ Independently Verified
            </div>
          )}
        </div>

        {/* Title/Summary Section */}
        <header className="mb-12 border-b border-gray-200 pb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span className="uppercase tracking-wide">{record.record_type_name}</span>
            <span>•</span>
            <span>{new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          
          {record.data['title'] !== undefined && record.data['title'] !== null && (
            <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {String(record.data['title'])}
            </h1>
          )}
          
          {record.data['summary'] !== undefined && record.data['summary'] !== null && (
            <div className="text-xl text-gray-700 leading-relaxed">
              {String(record.data['summary'])}
            </div>
          )}
        </header>

        {/* Main Content - Render fields as narrative */}
        <div className="prose prose-lg max-w-none mb-16">
          {fields
            .filter(field => !['title', 'summary'].includes(field.slug)) // Already shown above
            .filter(field => record.data[field.slug]) // Only show populated fields
            .map((field, idx) => {
              const value = record.data[field.slug];
              const quotesForField = quotes.filter(q => q.linked_fields?.includes(field.slug));
              const fieldVerification = verificationResults.find(
                vr => vr.item_type === 'field' && vr.field_slug === field.slug && vr.verified
              );
              
              return (
                <section key={field.slug} className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    {field.name}
                    {fieldVerification && (
                      <span className="text-sm font-normal text-emerald-600" title={`Verified by ${fieldVerification.verifier_name} on ${fieldVerification.completed_at ? new Date(fieldVerification.completed_at).toLocaleDateString() : 'N/A'}`}>
                        ✓ Verified
                      </span>
                    )}
                  </h2>
                  <div className="text-gray-800 leading-relaxed">
                    {/* Render field value based on type */}
                    {field.field_type === 'textarea' || field.field_type === 'text' ? (
                      <p className="whitespace-pre-wrap">{String(value)}</p>
                    ) : Array.isArray(value) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {value.map((item, i) => (
                          <li key={i}>{String(item)}</li>
                        ))}
                      </ul>
                    ) : typeof value === 'object' ? (
                      <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <p>{String(value)}</p>
                    )}
                    
                    {/* Inline footnote references for this field */}
                    {quotesForField.length > 0 && (
                      <span className="text-sm">
                        {quotesForField.map((quote, qIdx) => (
                          <a
                            key={quote.id}
                            href={`#quote-${quote.id}`}
                            className="inline-block ml-1 text-blue-600 hover:text-blue-800 font-medium"
                            title={quote.quote_text.slice(0, 100) + '...'}
                          >
                            [{quotes.findIndex(q => q.id === quote.id) + 1}]
                          </a>
                        ))}
                      </span>
                    )}
                  </div>
                </section>
              );
            })}
        </div>

        {/* Footnotes Section - Quotes */}
        {quotes.length > 0 && (
          <section className="border-t-2 border-gray-300 pt-8 mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">References</h2>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></div>
                  <span>Primary Source</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-50 border border-amber-200"></div>
                  <span>Secondary Source</span>
                </div>
              </div>
            </div>
            <ol className="space-y-6">
              {quotes.map((quote, idx) => {
                const quoteVerification = verificationResults.find(
                  vr => vr.item_type === 'quote' && vr.item_id === quote.id && vr.verified
                );
                
                // Determine source type for color coding
                const isPrimarySource = quote.source_type === 'primary';
                const cardBgColor = isPrimarySource ? 'bg-blue-50' : 'bg-amber-50';
                const cardBorderColor = isPrimarySource ? 'border-blue-200' : 'border-amber-200';
                
                return (
                <li
                  key={quote.id}
                  id={`quote-${quote.id}`}
                  className="text-sm leading-relaxed scroll-mt-8"
                >
                  <div className="flex gap-4">
                    <span className="font-bold text-gray-500 flex-shrink-0">[{idx + 1}]</span>
                    <div className={`flex-1 p-4 rounded-lg border ${cardBgColor} ${cardBorderColor}`}>
                      <div className="flex items-start gap-2">
                        <blockquote className="italic text-gray-700 mb-2 flex-1">
                          &ldquo;{quote.quote_text}&rdquo;
                        </blockquote>
                        {quoteVerification && (
                          <span className="text-emerald-600 text-xs" title={`Verified by ${quoteVerification.verifier_name}`}>
                            ✓
                          </span>
                        )}
                      </div>
                      {quote.source && (
                        <p className="text-gray-600 mt-2">— {quote.source}</p>
                      )}
                      {quote.source_url && (
                        <a
                          href={quote.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          View Source →
                        </a>
                      )}
                      {quote.linked_fields && quote.linked_fields.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Related to: {quote.linked_fields.map(f => fields.find(field => field.slug === f)?.name || f).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sources</h2>
            <ul className="space-y-3">
              {sources.map((source, idx) => {
                const sourceVerification = verificationResults.find(
                  vr => vr.item_type === 'source' && vr.item_id === source.id && vr.verified
                );
                
                return (
                <li key={source.id} className="text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 flex-shrink-0">•</span>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium flex-1"
                        >
                          {source.title || source.url}
                        </a>
                        {sourceVerification && (
                          <span className="text-emerald-600 text-xs" title={`Verified by ${sourceVerification.verifier_name}`}>
                            ✓
                          </span>
                        )}
                      </div>
                      {source.source_type && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                          {source.source_type}
                        </span>
                      )}
                      {source.notes && (
                        <p className="text-gray-600 mt-1">{source.notes}</p>
                      )}
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Verification Activity Section */}
        {verificationResults.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Verification Activity</h2>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <div className="text-sm text-emerald-900 mb-4">
                <strong>Third-party verification completed</strong>
                {verificationResults[0]?.completed_at && (
                  <span className="text-emerald-700 ml-2">
                    on {new Date(verificationResults[0].completed_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                )}
                {verificationResults[0]?.verifier_name && (
                  <span className="text-emerald-700"> by {verificationResults[0].verifier_name}</span>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Verified Fields */}
                {verificationResults.filter(vr => vr.item_type === 'field' && vr.verified).length > 0 && (
                  <div>
                    <div className="font-medium text-emerald-900 mb-2">Verified Fields:</div>
                    <ul className="list-disc list-inside text-sm text-emerald-800 space-y-1">
                      {verificationResults
                        .filter(vr => vr.item_type === 'field' && vr.verified)
                        .map(vr => (
                          <li key={`field-${vr.field_slug}`}>
                            {fields.find(f => f.slug === vr.field_slug)?.name || vr.field_slug}
                            {vr.notes && <span className="text-emerald-700 ml-2">— {vr.notes}</span>}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                
                {/* Verified Quotes */}
                {verificationResults.filter(vr => vr.item_type === 'quote' && vr.verified).length > 0 && (
                  <div>
                    <div className="font-medium text-emerald-900 mb-2">Verified Quotes:</div>
                    <ul className="list-disc list-inside text-sm text-emerald-800 space-y-1">
                      {verificationResults
                        .filter(vr => vr.item_type === 'quote' && vr.verified)
                        .map(vr => {
                          const quote = quotes.find(q => q.id === vr.item_id);
                          return (
                            <li key={`quote-${vr.item_id}`}>
                              {quote ? `"${quote.quote_text.slice(0, 60)}..."` : `Quote #${vr.item_id}`}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
                
                {/* Verified Sources */}
                {verificationResults.filter(vr => vr.item_type === 'source' && vr.verified).length > 0 && (
                  <div>
                    <div className="font-medium text-emerald-900 mb-2">Verified Sources:</div>
                    <ul className="list-disc list-inside text-sm text-emerald-800 space-y-1">
                      {verificationResults
                        .filter(vr => vr.item_type === 'source' && vr.verified)
                        .map(vr => {
                          const source = sources.find(s => s.id === vr.item_id);
                          return (
                            <li key={`source-${vr.item_id}`}>
                              <a
                                href={source?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {source?.title || source?.url || `Source #${vr.item_id}`}
                              </a>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
                
                {/* Items with Issues */}
                {verificationResults.filter(vr => !vr.verified || (vr.issues && vr.issues.length > 0)).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-300">
                    <div className="font-medium text-yellow-900 mb-2">Items with Issues or Not Verified:</div>
                    <ul className="list-disc list-inside text-sm text-yellow-800 space-y-2">
                      {verificationResults
                        .filter(vr => !vr.verified || (vr.issues && vr.issues.length > 0))
                        .map((vr, idx) => {
                          let itemLabel = '';
                          if (vr.item_type === 'field') {
                            itemLabel = fields.find(f => f.slug === vr.field_slug)?.name || vr.field_slug || '';
                          } else if (vr.item_type === 'quote') {
                            const quote = quotes.find(q => q.id === vr.item_id);
                            itemLabel = quote ? `"${quote.quote_text.slice(0, 40)}..."` : `Quote #${vr.item_id}`;
                          } else if (vr.item_type === 'source') {
                            const source = sources.find(s => s.id === vr.item_id);
                            itemLabel = source?.title || source?.url || `Source #${vr.item_id}`;
                          }
                          
                          return (
                            <li key={`issue-${idx}`}>
                              <strong>{itemLabel}</strong>
                              {vr.issues && vr.issues.length > 0 && (
                                <ul className="ml-6 mt-1 list-disc text-xs text-yellow-700">
                                  {vr.issues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                  ))}
                                </ul>
                              )}
                              {vr.notes && <div className="ml-6 text-xs text-yellow-700 mt-1">{vr.notes}</div>}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Metadata Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="font-medium text-gray-700">Verification Status</dt>
              <dd className="mt-1 flex items-center gap-2">
                {getStatusBadge(record.status)}
                {getVerificationLevelBadge(record.verification_level)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Last Updated</dt>
              <dd className="mt-1">{new Date(record.updated_at).toLocaleDateString()}</dd>
            </div>
            {record.validated_by_name && record.validated_at && (
              <div className="col-span-2">
                <dt className="font-medium text-gray-700">Validated By</dt>
                <dd className="mt-1">
                  {record.validated_by_name} on {new Date(record.validated_at).toLocaleDateString()}
                </dd>
              </div>
            )}
            {record.verification_level === 3 && record.verification_date && (
              <div className="col-span-2">
                <dt className="font-medium text-gray-700">Independently Verified</dt>
                <dd className="mt-1">
                  Third-party verification completed on {new Date(record.verification_date).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
          
          {/* Action buttons based on status and permissions */}
          <div className="mt-6 flex flex-wrap gap-3">
            {canReview && (
              <Link
                href={`/projects/${projectSlug}/records/${recordId}/review`}
                className="px-4 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 inline-block"
              >
                Review Record
              </Link>
            )}
            
            {canValidate && (
              <Link
                href={`/projects/${projectSlug}/records/${recordId}/validate`}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
              >
                Validate Record
              </Link>
            )}
            
            {canProposeEdit && (
              <Link
                href={`/projects/${projectSlug}/records/${recordId}/propose-edit`}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
              >
                Propose Edit
              </Link>
            )}
            
            {verificationRequests.length > 0 ? (
              <div className="px-4 py-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded">
                ✓ 3rd Party Verification Requested
                <div className="text-xs mt-1">
                  Status: {verificationRequests[0].status === 'in_progress' ? 'In Progress' : 'Pending Review'}
                </div>
              </div>
            ) : canRequestVerification && record.verification_level !== 3 ? (
              <button
                onClick={() => setVerificationModalOpen(true)}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Request 3rd Party Verification
              </button>
            ) : null}
            
            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Delete Record
              </button>
            )}
          </div>
        </footer>

        {/* Verification Request Modal */}
        {verificationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">Request Third-Party Verification</h3>
              
              <p className="text-gray-600 text-sm mb-6">
                Third-party verification involves an independent review of this record by external verifiers. 
                This provides the highest level of credibility for sensitive or high-profile cases.
              </p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleRequestVerification(
                  formData.get('scope') as 'record' | 'data',
                  formData.get('priority') as 'low' | 'normal' | 'high'
                );
              }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Scope
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="scope" value="record" defaultChecked className="mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Full Record Verification</div>
                        <div className="text-xs text-gray-500">
                          Verify all claims, sources, and data in this record as a whole
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="scope" value="data" className="mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Granular Data Verification</div>
                        <div className="text-xs text-gray-500">
                          Verify individual data points and provide field-level verification status
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select name="priority" defaultValue="normal" className="w-full border rounded px-3 py-2 text-sm">
                    <option value="low">Low - Routine verification</option>
                    <option value="normal">Normal - Standard timeline</option>
                    <option value="high">High - Time-sensitive case</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setVerificationModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    disabled={requestingVerification}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                    disabled={requestingVerification}
                  >
                    {requestingVerification ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </article>
    );
}
