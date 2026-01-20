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
  verified_fields: Record<string, { verified: boolean; by: number; at: string }>;
  submitted_by_name?: string;
  reviewed_by_name?: string;
  is_guest_submission: boolean;
  guest_name?: string;
  guest_email?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
}

export default function RecordValidatePage({ 
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
  const [verifiedFields, setVerifiedFields] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');

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
      
      // Initialize verified fields state from record
      const vf: Record<string, boolean> = {};
      for (const [slug, info] of Object.entries(data.record.verified_fields || {})) {
        vf[slug] = (info as { verified: boolean }).verified;
      }
      setVerifiedFields(vf);
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

  const handleVerifyField = async (fieldSlug: string, verified: boolean) => {
    // Optimistic update
    setVerifiedFields(prev => ({ ...prev, [fieldSlug]: verified }));

    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}/verify-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldSlug, verified }),
      });

      if (!response.ok) {
        // Revert on error
        setVerifiedFields(prev => ({ ...prev, [fieldSlug]: !verified }));
        throw new Error('Failed to update verification');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to verify field');
    }
  };

  const handlePublish = async () => {
    // Check if all required fields are verified
    const requiredFields = fields.filter(f => f.is_required && isFieldVisible(f));
    const unverifiedRequired = requiredFields.filter(f => !verifiedFields[f.slug]);
    
    if (unverifiedRequired.length > 0) {
      alert(`Please verify all required fields before publishing:\n- ${unverifiedRequired.map(f => f.name).join('\n- ')}`);
      return;
    }

    if (!confirm('Publish this record? It will become publicly visible.')) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'verified',
          validation_notes: validationNotes 
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish');
      }
      
      router.push(`/projects/${projectSlug}/records/${recordId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleSendBack = async () => {
    if (!validationNotes.trim()) {
      alert('Please provide notes explaining why this needs more review');
      return;
    }
    if (!confirm('Send this back to review?')) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'pending_review',
          validation_notes: validationNotes 
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }
      
      router.push(`/projects/${projectSlug}/records/${recordId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send back');
    } finally {
      setSaving(false);
    }
  };

  const isFieldVisible = (field: FieldDefinition): boolean => {
    // Use the show_in_validation_form flag
    return field.show_in_validation_form !== false;
  };

  const getQuotesForField = (fieldSlug: string): RecordQuote[] => {
    return quotes.filter(q => q.linked_fields?.includes(fieldSlug));
  };

  const getSourcesForField = (fieldSlug: string): RecordSource[] => {
    return sources.filter(s => s.linked_fields?.includes(fieldSlug));
  };

  const formatFieldValue = (field: FieldDefinition, value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—';
    
    switch (field.field_type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value as string).toLocaleDateString();
      case 'datetime':
        return new Date(value as string).toLocaleString();
      case 'multi_select':
      case 'checkbox_group':
        return Array.isArray(value) ? value.join(', ') : String(value);
      default:
        return String(value);
    }
  };

  // Group fields by their groups
  const groupedFields = fields.reduce((acc, field) => {
    if (!isFieldVisible(field)) return acc;
    
    const groupName = field.field_group || 'General';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(field);
    return acc;
  }, {} as Record<string, FieldDefinition[]>);

  // Count verification stats
  const visibleFields = fields.filter(isFieldVisible);
  const totalFields = visibleFields.length;
  const verifiedCount = visibleFields.filter(f => verifiedFields[f.slug]).length;
  const requiredFields = visibleFields.filter(f => f.is_required);
  const requiredVerified = requiredFields.filter(f => verifiedFields[f.slug]).length;

  const canValidate = userRole && ['owner', 'admin', 'validator'].includes(userRole);

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

  if (!canValidate) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          You do not have permission to validate this record.
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
            <h1 className="text-2xl font-bold">Validate: {record.record_type_name} #{record.id}</h1>
            <p className="text-gray-500 mt-1">
              Verify each field against supporting evidence before publishing.
            </p>
          </div>
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            {record.status === 'pending_validation' ? 'Awaiting Validation' : record.status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Verification Progress</span>
          <span className="text-sm text-gray-500">
            {verifiedCount} of {totalFields} fields verified
            {requiredFields.length > 0 && (
              <span className="ml-2">
                ({requiredVerified} of {requiredFields.length} required)
              </span>
            )}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${totalFields > 0 ? (verifiedCount / totalFields) * 100 : 0}%` }}
          />
        </div>
        {requiredFields.length > 0 && requiredVerified < requiredFields.length && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠ All required fields must be verified before publishing
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Validation Form - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(groupedFields).map(([groupName, groupFields]) => (
            <div key={groupName} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4 pb-2 border-b">{groupName}</h3>
              <div className="space-y-6">
                {groupFields.map(field => {
                  const value = record.data[field.slug];
                  const fieldQuotes = getQuotesForField(field.slug);
                  const fieldSources = getSourcesForField(field.slug);
                  const isVerified = verifiedFields[field.slug];
                  
                  return (
                    <div key={field.slug} className={`p-4 rounded-lg border-2 transition-colors ${
                      isVerified ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                    }`}>
                      {/* Field Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <label className="font-medium">
                            {field.name}
                            {field.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {(field.help_text || field.description) && (
                            <p className="text-xs text-gray-500 mt-0.5">{field.help_text || field.description}</p>
                          )}
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isVerified || false}
                            onChange={(e) => handleVerifyField(field.slug, e.target.checked)}
                            className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Verified</span>
                        </label>
                      </div>
                      
                      {/* Field Value */}
                      <div className="bg-white border border-gray-200 rounded p-3 mb-3">
                        <p className={value ? 'text-gray-900' : 'text-gray-400 italic'}>
                          {formatFieldValue(field, value)}
                        </p>
                      </div>
                      
                      {/* Supporting Evidence */}
                      {(fieldQuotes.length > 0 || fieldSources.length > 0) && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase">Supporting Evidence</p>
                          
                          {fieldQuotes.map(quote => (
                            <div key={quote.id} className="border-l-2 border-blue-300 pl-3 py-1 text-sm bg-blue-50 rounded-r">
                              <p className="italic">&ldquo;{quote.quote_text}&rdquo;</p>
                              {quote.source && <p className="text-gray-500 text-xs">— {quote.source}</p>}
                              {quote.source_url && (
                                <a href={quote.source_url} target="_blank" rel="noopener noreferrer"
                                   className="text-xs text-blue-600 hover:underline">
                                  View source ↗
                                </a>
                              )}
                            </div>
                          ))}
                          
                          {fieldSources.map(source => (
                            <div key={source.id} className="flex items-center space-x-2 text-sm bg-gray-50 rounded p-2">
                              <span>🔗</span>
                              <a href={source.url} target="_blank" rel="noopener noreferrer"
                                 className="text-blue-600 hover:underline truncate">
                                {source.title || source.url}
                              </a>
                              {source.source_type && (
                                <span className="text-xs bg-gray-200 px-1 rounded">{source.source_type}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* No evidence warning */}
                      {fieldQuotes.length === 0 && fieldSources.length === 0 && (
                        <p className="text-xs text-amber-600">
                          ⚠ No quotes or sources linked to this field
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-4">Validation Actions</h3>
            
            <textarea
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
              placeholder="Validation notes (optional for publish, required for send back)..."
              className="w-full border border-gray-300 rounded-md p-3 mb-4 text-sm"
              rows={4}
            />
            
            <div className="space-y-2">
              <button
                onClick={handlePublish}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Publish Record
              </button>
              <button
                onClick={handleSendBack}
                disabled={saving}
                className="w-full px-4 py-2 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 disabled:opacity-50"
              >
                ← Send Back to Review
              </button>
            </div>
          </div>

          {/* All Quotes */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">All Quotes ({quotes.length})</h3>
            {quotes.length === 0 ? (
              <p className="text-sm text-gray-500">No quotes attached.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {quotes.map(quote => (
                  <div key={quote.id} className="border-l-2 border-gray-300 pl-2 text-xs">
                    <p className="italic line-clamp-2">&ldquo;{quote.quote_text}&rdquo;</p>
                    {quote.linked_fields && quote.linked_fields.length > 0 && (
                      <p className="text-blue-600 mt-0.5">→ {quote.linked_fields.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Sources */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">All Sources ({sources.length})</h3>
            {sources.length === 0 ? (
              <p className="text-sm text-gray-500">No sources attached.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sources.map(source => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer"
                     className="block text-xs text-blue-600 hover:underline truncate">
                    {source.title || source.url}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Review Info */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">Review Info</h3>
            <dl className="text-sm space-y-2">
              {record.reviewed_by_name && (
                <div>
                  <dt className="text-gray-500">Reviewed By</dt>
                  <dd className="font-medium">{record.reviewed_by_name}</dd>
                </div>
              )}
              {record.reviewed_at && (
                <div>
                  <dt className="text-gray-500">Reviewed At</dt>
                  <dd className="font-medium">{new Date(record.reviewed_at).toLocaleString()}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Submitted By</dt>
                <dd className="font-medium">
                  {record.is_guest_submission ? (
                    <span>Guest{record.guest_name ? `: ${record.guest_name}` : ''}</span>
                  ) : (
                    record.submitted_by_name || 'Unknown'
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
