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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: formData }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update record');
    }
    
    setIsEditing(false);
    fetchRecord();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Change status to ${newStatus}?`)) return;
    
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }
      
      fetchRecord();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

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
      
      router.push(`/projects/${projectSlug}/records`);
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

  const canEdit = userRole && ['owner', 'admin', 'reviewer', 'validator'].includes(userRole);
  const canDelete = userRole && ['owner', 'admin'].includes(userRole);
  const canProposeEdit = userRole && record && record.status === 'verified';

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

  // Article-style view for verified/published records
  const isPublished = record.status === 'verified';
  const showArticleView = isPublished && !isEditing;

  if (showArticleView) {
    return (
      <article className="max-w-3xl mx-auto px-6 py-12 bg-white">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/projects/${projectSlug}/records`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Records
          </Link>
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
              
              return (
                <section key={field.slug} className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    {field.name}
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">References</h2>
            <ol className="space-y-6">
              {quotes.map((quote, idx) => (
                <li
                  key={quote.id}
                  id={`quote-${quote.id}`}
                  className="text-sm leading-relaxed scroll-mt-8"
                >
                  <div className="flex gap-4">
                    <span className="font-bold text-gray-500 flex-shrink-0">[{idx + 1}]</span>
                    <div className="flex-1">
                      <blockquote className="italic text-gray-700 mb-2">
                        &ldquo;{quote.quote_text}&rdquo;
                      </blockquote>
                      {quote.source && (
                        <p className="text-gray-600">— {quote.source}</p>
                      )}
                      {quote.source_url && (
                        <a
                          href={quote.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View Source →
                        </a>
                      )}
                      {quote.linked_fields && quote.linked_fields.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Related to: {quote.linked_fields.map(f => fields.find(field => field.slug === f)?.name || f).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sources</h2>
            <ul className="space-y-3">
              {sources.map((source, idx) => (
                <li key={source.id} className="text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 flex-shrink-0">•</span>
                    <div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {source.title || source.url}
                      </a>
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
              ))}
            </ul>
          </section>
        )}

        {/* Metadata Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="font-medium text-gray-700">Verification Status</dt>
              <dd className="mt-1">{getStatusBadge(record.status)}</dd>
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
          </dl>
          
          {canEdit && (
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Edit Record
              </button>
              <Link
                href={`/projects/${projectSlug}/records/${recordId}/review`}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 inline-block"
              >
                Review Mode
              </Link>
            </div>
          )}
        </footer>
      </article>
    );
  }

  // Standard editing/workflow view
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projects/${projectSlug}/records`} className="text-blue-600 hover:underline text-sm">
          ← Back to Records
        </Link>
        
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold">{record.record_type_name} #{record.id}</h1>
            <div className="flex items-center space-x-4 mt-2">
              {getStatusBadge(record.status)}
              <span className="text-sm text-gray-500">
                Created {new Date(record.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {record.status === 'verified' && canProposeEdit && (
              <Link
                href={`/projects/${projectSlug}/records/${record.id}/propose-edit`}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Propose Edit
              </Link>
            )}
            {record.status !== 'verified' && canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Actions */}
      {canEdit && record.status !== 'verified' && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Workflow Actions</h3>
          <div className="flex flex-wrap gap-2">
            {record.status === 'pending_review' && (
              <>
                <button
                  onClick={() => handleStatusChange('pending_validation')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Mark as Reviewed
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Reject
                </button>
              </>
            )}
            {record.status === 'pending_validation' && (
              <>
                <button
                  onClick={() => handleStatusChange('verified')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Verify & Publish
                </button>
                <button
                  onClick={() => handleStatusChange('pending_review')}
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                >
                  Send Back to Review
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Archive Action for Verified Records */}
      {canEdit && record.status === 'verified' && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Workflow Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange('archived')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Archive
            </button>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Submission Info</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Submitted By</dt>
            <dd className="font-medium">
              {record.is_guest_submission ? (
                <span>
                  Guest{record.guest_name ? `: ${record.guest_name}` : ''}
                  {record.guest_email && <span className="text-gray-500 ml-2">({record.guest_email})</span>}
                </span>
              ) : (
                record.submitted_by_name || 'Unknown'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="font-medium">{new Date(record.created_at).toLocaleString()}</dd>
          </div>
          {record.reviewed_by_name && (
            <div>
              <dt className="text-gray-500">Reviewed By</dt>
              <dd className="font-medium">
                {record.reviewed_by_name}
                {record.reviewed_at && (
                  <span className="text-gray-500 ml-2">
                    ({new Date(record.reviewed_at).toLocaleString()})
                  </span>
                )}
              </dd>
            </div>
          )}
          {record.validated_by_name && (
            <div>
              <dt className="text-gray-500">Validated By</dt>
              <dd className="font-medium">
                {record.validated_by_name}
                {record.validated_at && (
                  <span className="text-gray-500 ml-2">
                    ({new Date(record.validated_at).toLocaleString()})
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Record Data */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Record Data</h3>
        
        {isEditing ? (
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
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <DynamicForm
            projectSlug={projectSlug}
            recordTypeSlug={record.record_type_slug}
            recordId={record.id}
            mode="view"
            fields={fields}
            groups={groups}
            initialData={record.data}
            quotes={quotes}
            verifiedFields={record.verified_fields}
            onSubmit={async () => {}}
          />
        )}
      </div>

      {/* Quotes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Quotes ({quotes.length})</h3>
        {quotes.length === 0 ? (
          <p className="text-gray-500">No quotes attached to this record.</p>
        ) : (
          <div className="space-y-4">
            {quotes.map(quote => (
              <div key={quote.id} className="border-l-4 border-blue-300 pl-4 py-2">
                <p className="italic">&ldquo;{quote.quote_text}&rdquo;</p>
                {quote.source && (
                  <p className="text-sm text-gray-500 mt-1">— {quote.source}</p>
                )}
                {quote.source_url && (
                  <a href={quote.source_url} target="_blank" rel="noopener noreferrer" 
                     className="text-xs text-blue-600 hover:underline">
                    View Source
                  </a>
                )}
                {quote.linked_fields && quote.linked_fields.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Linked to: {quote.linked_fields.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Sources ({sources.length})</h3>
        {sources.length === 0 ? (
          <p className="text-gray-500">No sources attached to this record.</p>
        ) : (
          <div className="space-y-3">
            {sources.map(source => (
              <div key={source.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                <span className="text-gray-400">🔗</span>
                <div className="flex-1">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline font-medium">
                    {source.title || source.url}
                  </a>
                  {source.source_type && (
                    <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">
                      {source.source_type}
                    </span>
                  )}
                  {source.notes && (
                    <p className="text-sm text-gray-500 mt-1">{source.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
