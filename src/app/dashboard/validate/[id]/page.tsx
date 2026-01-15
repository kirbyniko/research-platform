'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Types
interface Incident {
  id: number;
  incident_id: string;
  incident_type: string;
  incident_date: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  facility: string | null;
  subject_name: string | null;
  victim_name: string | null;
  subject_age: number | null;
  subject_gender: string | null;
  subject_nationality: string | null;
  subject_immigration_status: string | null;
  subject_occupation: string | null;
  summary: string | null;
  verification_status: string;
  first_reviewer_name?: string | null;
  first_reviewer_email?: string | null;
  second_reviewer_name?: string | null;
  second_reviewer_email?: string | null;
  first_validator_name?: string | null;
  first_validator_email?: string | null;
}

interface Source {
  id: number;
  url: string;
  title: string | null;
  publication: string | null;
  source_type: string;
}

interface Quote {
  id: number;
  quote_text: string;
  category: string | null;
  source_id: number | null;
  source_title?: string | null;
  source_url?: string | null;
  source_publication?: string | null;
  linked_fields?: string[];
}

interface TimelineEntry {
  id: number;
  event_date?: string | null;
  description: string;
  quote_id?: number | null;
  quote_text?: string | null;
  quote_source_title?: string | null;
  quote_source_url?: string | null;
}

interface Media {
  id: number;
  url: string;
  media_type: 'image' | 'video';
  description: string | null;
  verified?: boolean;
}

interface ValidationIssue {
  id: number;
  field_type: string;
  field_name: string;
  issue_reason: string;
  created_by_name?: string;
  created_at: string;
}

interface QuoteFieldLink {
  field_name: string;
  quote_id: number;
  quote_text: string;
  source_title?: string;
  source_url?: string;
}

interface ValidationState {
  [key: string]: {
    checked: boolean;
    reason: string;
  };
}

// Displayable incident fields for validation
const DISPLAY_FIELDS = [
  { key: 'subject_name', label: 'Subject Name' },
  { key: 'incident_date', label: 'Incident Date' },
  { key: 'incident_type', label: 'Incident Type' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'facility', label: 'Facility' },
  { key: 'subject_age', label: 'Age' },
  { key: 'subject_gender', label: 'Gender' },
  { key: 'subject_nationality', label: 'Nationality' },
  { key: 'subject_immigration_status', label: 'Immigration Status' },
  { key: 'subject_occupation', label: 'Occupation' },
  { key: 'summary', label: 'Summary' },
];

export default function ValidatePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const incidentId = params.id as string;

  // Data state
  const [incident, setIncident] = useState<Incident | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [quoteFieldLinks, setQuoteFieldLinks] = useState<QuoteFieldLink[]>([]);
  const [previousIssues, setPreviousIssues] = useState<ValidationIssue[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>({});

  // Load case data
  useEffect(() => {
    async function loadCase() {
      try {
        const response = await fetch(`/api/incidents/${incidentId}/validate`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load case');
        }
        const data = await response.json();

        setIncident(data.incident);
        setSources(data.sources || []);
        setQuotes(data.quotes || []);
        setTimeline(data.timeline || []);
        setMedia(data.media || []);
        setQuoteFieldLinks(data.quote_field_links || []);
        setPreviousIssues(data.previous_issues || []);

        // Initialize validation state - all unchecked by default
        const initialState: ValidationState = {};
        
        // Fields
        for (const field of DISPLAY_FIELDS) {
          const value = data.incident[field.key];
          if (value !== null && value !== undefined && value !== '') {
            initialState[`field_${field.key}`] = { checked: false, reason: '' };
          }
        }
        
        // Quotes
        for (const quote of data.quotes || []) {
          initialState[`quote_${quote.id}`] = { checked: false, reason: '' };
        }
        
        // Timeline
        for (const entry of data.timeline || []) {
          initialState[`timeline_${entry.id}`] = { checked: false, reason: '' };
        }
        
        // Sources
        for (const source of data.sources || []) {
          initialState[`source_${source.id}`] = { checked: false, reason: '' };
        }
        
        // Media
        for (const item of data.media || []) {
          initialState[`media_${item.id}`] = { checked: false, reason: '' };
        }

        setValidationState(initialState);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case');
        setLoading(false);
      }
    }

    if (incidentId) {
      loadCase();
    }
  }, [incidentId]);

  // Toggle checkbox
  const toggleValidation = (key: string) => {
    setValidationState(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: !prev[key]?.checked,
        reason: !prev[key]?.checked ? '' : prev[key]?.reason || ''
      }
    }));
  };

  // Update reason
  const updateReason = (key: string, reason: string) => {
    setValidationState(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        reason
      }
    }));
  };

  // Check if all items are validated
  const allValidated = Object.values(validationState).every(v => v.checked);

  // Get unchecked items
  const getUncheckedItems = () => {
    return Object.entries(validationState)
      .filter(([_, v]) => !v.checked)
      .map(([key, v]) => ({
        key,
        ...v
      }));
  };

  // Check if all unchecked items have reasons
  const allUncheckedHaveReasons = getUncheckedItems().every(item => item.reason.trim() !== '');

  // Submit validation
  const submitValidation = async (action: 'validate' | 'return_to_review' | 'reject') => {
    if (submitting) return;

    try {
      setSubmitting(true);

      // Build issues array for return_to_review
      const issues = getUncheckedItems().map(item => {
        const [type, ...rest] = item.key.split('_');
        return {
          field_type: ['quote', 'timeline', 'source'].includes(type) ? type : 'field',
          field_name: item.key,
          reason: item.reason
        };
      });

      // Validation checks
      if (action === 'validate' && !allValidated) {
        alert('All items must be checked to validate.');
        setSubmitting(false);
        return;
      }

      if (action === 'return_to_review') {
        if (issues.length === 0) {
          alert('At least one item must be unchecked to return to review.');
          setSubmitting(false);
          return;
        }
        if (!allUncheckedHaveReasons) {
          alert('All unchecked items must have a reason.');
          setSubmitting(false);
          return;
        }
      }

      let body: { action: string; issues?: typeof issues; rejection_reason?: string } = { action };

      if (action === 'return_to_review') {
        body.issues = issues;
      }

      if (action === 'reject') {
        const reason = prompt('Enter rejection reason:');
        if (!reason?.trim()) {
          setSubmitting(false);
          return;
        }
        body.rejection_reason = reason;
      }

      const response = await fetch(`/api/incidents/${incidentId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit validation');
      }

      alert(result.message);
      router.push('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit validation');
    } finally {
      setSubmitting(false);
    }
  };

  // Get linked quote for a field
  const getLinkedQuote = (fieldKey: string) => {
    return quoteFieldLinks.find(link => link.field_name === fieldKey);
  };

  // Format incident type
  const formatIncidentType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading case for validation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-gray-500">Case not found</div>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Check if case is in valid state for validation
  if (!['second_review', 'first_validation'].includes(incident.verification_status)) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
            <p className="font-semibold">This case cannot be validated</p>
            <p className="mt-2">
              Current status: <span className="font-mono">{incident.verification_status}</span>
            </p>
            <p className="mt-2">
              Cases must complete two reviews before validation.
            </p>
          </div>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold mt-1">
                Validate: {incident.subject_name || incident.victim_name || 'Unknown'}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>ID: {incident.incident_id}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  incident.verification_status === 'second_review' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {incident.verification_status === 'second_review' 
                    ? 'Awaiting 1st Validation' 
                    : 'Awaiting 2nd Validation'}
                </span>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Read-only validation</div>
              <div>All edits must be done in Review</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Previous Issues Warning */}
        {previousIssues.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">
              ⚠️ Previous Validation Issues ({previousIssues.length})
            </h3>
            <div className="space-y-2">
              {previousIssues.map(issue => (
                <div key={issue.id} className="text-sm text-yellow-700 bg-yellow-100 rounded p-2">
                  <span className="font-mono">{issue.field_name}</span>: {issue.issue_reason}
                  <span className="text-yellow-600 ml-2">
                    - {issue.created_by_name} on {new Date(issue.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviewer Info */}
        <div className="mb-6 bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Review History</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">First Review:</span>{' '}
              {incident.first_reviewer_name || incident.first_reviewer_email || 'Unknown'}
            </div>
            <div>
              <span className="text-gray-500">Second Review:</span>{' '}
              {incident.second_reviewer_name || incident.second_reviewer_email || 'Unknown'}
            </div>
            {incident.first_validator_name && (
              <div>
                <span className="text-gray-500">First Validation:</span>{' '}
                {incident.first_validator_name || incident.first_validator_email}
              </div>
            )}
          </div>
        </div>

        {/* Fields Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Incident Fields</h2>
          <div className="space-y-3">
            {DISPLAY_FIELDS.map(field => {
              const value = incident[field.key as keyof Incident];
              if (value === null || value === undefined || value === '') return null;
              
              const key = `field_${field.key}`;
              const state = validationState[key] || { checked: false, reason: '' };
              const linkedQuote = getLinkedQuote(field.key);
              
              return (
                <div
                  key={field.key}
                  className={`p-4 rounded-lg border ${
                    state.checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <label className="flex items-center mt-1">
                      <input
                        type="checkbox"
                        checked={state.checked}
                        onChange={() => toggleValidation(key)}
                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </label>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-gray-700">{field.label}:</span>
                        <span className="text-gray-900">
                          {field.key === 'incident_type' 
                            ? formatIncidentType(String(value)) 
                            : String(value)}
                        </span>
                      </div>
                      {linkedQuote && (
                        <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          <div className="italic">&ldquo;{linkedQuote.quote_text}&rdquo;</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Source: {linkedQuote.source_title || linkedQuote.source_url}
                          </div>
                        </div>
                      )}
                      {!state.checked && (
                        <input
                          type="text"
                          placeholder="Reason not validated..."
                          value={state.reason}
                          onChange={(e) => updateReason(key, e.target.value)}
                          className="mt-2 w-full px-3 py-2 text-sm border border-red-200 rounded focus:ring-red-500 focus:border-red-500 bg-red-50"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quotes Section */}
        {quotes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Quotes ({quotes.length})</h2>
            <div className="space-y-3">
              {quotes.map(quote => {
                const key = `quote_${quote.id}`;
                const state = validationState[key] || { checked: false, reason: '' };
                
                return (
                  <div
                    key={quote.id}
                    className={`p-4 rounded-lg border ${
                      state.checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <label className="flex items-center mt-1">
                        <input
                          type="checkbox"
                          checked={state.checked}
                          onChange={() => toggleValidation(key)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </label>
                      <div className="flex-1">
                        <div className="italic text-gray-800">&ldquo;{quote.quote_text}&rdquo;</div>
                        <div className="mt-2 text-sm text-gray-500">
                          <a 
                            href={quote.source_url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {quote.source_title || quote.source_publication || quote.source_url || 'Unknown source'}
                          </a>
                        </div>
                        {quote.linked_fields && quote.linked_fields.length > 0 && (
                          <div className="mt-1 text-xs text-gray-400">
                            Links to: {quote.linked_fields.join(', ')}
                          </div>
                        )}
                        {!state.checked && (
                          <input
                            type="text"
                            placeholder="Reason not validated..."
                            value={state.reason}
                            onChange={(e) => updateReason(key, e.target.value)}
                            className="mt-2 w-full px-3 py-2 text-sm border border-red-200 rounded focus:ring-red-500 focus:border-red-500 bg-red-50"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Timeline Section */}
        {timeline.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Timeline ({timeline.length})</h2>
            <div className="space-y-3">
              {timeline.map(entry => {
                const key = `timeline_${entry.id}`;
                const state = validationState[key] || { checked: false, reason: '' };
                
                return (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border ${
                      state.checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <label className="flex items-center mt-1">
                        <input
                          type="checkbox"
                          checked={state.checked}
                          onChange={() => toggleValidation(key)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </label>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-gray-700">
                            {entry.event_date 
                              ? new Date(entry.event_date).toLocaleDateString() 
                              : 'No date'}:
                          </span>
                          <span className="text-gray-900">{entry.description}</span>
                        </div>
                        {entry.quote_text && (
                          <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                            <div className="italic">&ldquo;{entry.quote_text}&rdquo;</div>
                            {entry.quote_source_title && (
                              <div className="text-xs text-gray-500 mt-1">
                                Source: {entry.quote_source_title}
                              </div>
                            )}
                          </div>
                        )}
                        {!entry.quote_text && (
                          <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                            ⚠️ No supporting quote linked
                          </div>
                        )}
                        {!state.checked && (
                          <input
                            type="text"
                            placeholder="Reason not validated..."
                            value={state.reason}
                            onChange={(e) => updateReason(key, e.target.value)}
                            className="mt-2 w-full px-3 py-2 text-sm border border-red-200 rounded focus:ring-red-500 focus:border-red-500 bg-red-50"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Sources ({sources.length})</h2>
            <div className="space-y-3">
              {sources.map(source => {
                const key = `source_${source.id}`;
                const state = validationState[key] || { checked: false, reason: '' };
                
                return (
                  <div
                    key={source.id}
                    className={`p-4 rounded-lg border ${
                      state.checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <label className="flex items-center mt-1">
                        <input
                          type="checkbox"
                          checked={state.checked}
                          onChange={() => toggleValidation(key)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </label>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {source.title || 'Untitled Source'}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {source.publication && <span className="mr-2">{source.publication}</span>}
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {source.url}
                          </a>
                        </div>
                        {!state.checked && (
                          <input
                            type="text"
                            placeholder="Reason not validated..."
                            value={state.reason}
                            onChange={(e) => updateReason(key, e.target.value)}
                            className="mt-2 w-full px-3 py-2 text-sm border border-red-200 rounded focus:ring-red-500 focus:border-red-500 bg-red-50"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Media Section */}
        {media.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Media ({media.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {media.map(item => {
                const key = `media_${item.id}`;
                const state = validationState[key] || { checked: false, reason: '' };
                
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      state.checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <label className="flex items-center mt-1">
                        <input
                          type="checkbox"
                          checked={state.checked}
                          onChange={() => toggleValidation(key)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </label>
                      <div className="flex-1">
                        <div className="mb-2">
                          {item.media_type === 'image' ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={item.url}
                                alt={item.description || 'Media'}
                                className="max-w-full h-40 object-cover rounded border cursor-pointer hover:opacity-90"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                }}
                              />
                            </a>
                          ) : (
                            <video
                              src={item.url}
                              controls
                              className="max-w-full h-40 rounded border"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.media_type === 'image' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.media_type === 'image' ? '🖼️ Image' : '🎬 Video'}
                          </span>
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate text-xs"
                          >
                            View Original
                          </a>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        {!state.checked && (
                          <input
                            type="text"
                            placeholder="Reason not validated..."
                            value={state.reason}
                            onChange={(e) => updateReason(key, e.target.value)}
                            className="mt-2 w-full px-3 py-2 text-sm border border-red-200 rounded focus:ring-red-500 focus:border-red-500 bg-red-50"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Action Bar */}
        <div className="sticky bottom-0 bg-white border-t py-4 mt-8 -mx-4 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {allValidated ? (
                <span className="text-green-600 font-medium">✓ All items validated</span>
              ) : (
                <span>
                  {getUncheckedItems().length} item(s) not validated
                  {!allUncheckedHaveReasons && getUncheckedItems().length > 0 && (
                    <span className="text-red-500 ml-2">(reasons required)</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => submitValidation('reject')}
                disabled={submitting}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                ✗ Reject Case
              </button>
              <button
                onClick={() => submitValidation('return_to_review')}
                disabled={submitting || getUncheckedItems().length === 0 || !allUncheckedHaveReasons}
                className="px-4 py-2 text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50 disabled:opacity-50"
              >
                ↩ Return to Review
              </button>
              <button
                onClick={() => submitValidation('validate')}
                disabled={submitting || !allValidated}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ {incident.verification_status === 'second_review' 
                    ? 'Submit First Validation' 
                    : 'Submit Second Validation & Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
