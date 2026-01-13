'use client';

import { useState, useCallback } from 'react';

interface SimilarCase {
  id: number;
  incident_id?: string;
  name: string;
  type: 'verified' | 'unverified' | 'in_review' | 'guest_report';
  incident_type?: string;
  incident_date?: string;
  city?: string;
  state?: string;
  facility?: string;
  sources?: { id: number; url: string; title?: string }[];
  summary?: string;
  status?: string;
}

interface DuplicateCheckerProps {
  /** Initial search query (e.g., current victim name) */
  initialQuery?: string;
  /** Current incident ID to exclude from results */
  excludeIncidentId?: number;
  /** Callback when a case is selected */
  onCaseSelect?: (caseData: SimilarCase) => void;
  /** Whether to show the sources inline */
  showSources?: boolean;
  /** Custom class names */
  className?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

const TYPE_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' },
  unverified: { label: 'Unverified', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⚠️' },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🔍' },
  guest_report: { label: 'Guest Report', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '📝' },
};

export default function DuplicateChecker({
  initialQuery = '',
  excludeIncidentId,
  onCaseSelect,
  showSources = true,
  className = '',
  compact = false,
}: DuplicateCheckerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SimilarCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchDuplicates = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) {
      setError('Enter at least 2 characters to search');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch(`/api/duplicate-check?name=${encodeURIComponent(query.trim())}${excludeIncidentId ? `&exclude=${excludeIncidentId}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.cases || []);
    } catch (err) {
      console.error('Duplicate check error:', err);
      setError('Failed to search for duplicates');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, excludeIncidentId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchDuplicates();
    }
  };

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className={`${compact ? 'p-2' : 'p-3'} border-b bg-gray-50`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔎</span>
          <h3 className={`font-medium text-gray-800 ${compact ? 'text-sm' : ''}`}>
            Duplicate & Related Cases
          </h3>
        </div>
        
        {/* Search Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name..."
            className={`flex-1 border rounded px-3 ${compact ? 'py-1.5 text-sm' : 'py-2'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          <button
            onClick={searchDuplicates}
            disabled={loading || !query.trim()}
            className={`${compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors`}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Results */}
      <div className={`${compact ? 'max-h-64' : 'max-h-96'} overflow-y-auto`}>
        {!searched ? (
          <div className={`${compact ? 'p-3' : 'p-4'} text-center text-gray-500 text-sm`}>
            Enter a name and click Search to find related cases
          </div>
        ) : loading ? (
          <div className={`${compact ? 'p-3' : 'p-4'} text-center text-gray-500`}>
            <div className="animate-spin inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
            Searching...
          </div>
        ) : results.length === 0 ? (
          <div className={`${compact ? 'p-3' : 'p-4'} text-center text-gray-500`}>
            <p className="text-green-600 font-medium">✓ No duplicates found</p>
            <p className="text-sm mt-1">No similar cases match "{query}"</p>
          </div>
        ) : (
          <div className="divide-y">
            {results.map((item) => {
              const badge = TYPE_BADGES[item.type] || TYPE_BADGES.unverified;
              const isExpanded = expanded === item.id;
              
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`${compact ? 'p-2' : 'p-3'} hover:bg-gray-50 transition-colors`}
                >
                  {/* Main Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${badge.color}`}>
                          {badge.icon} {badge.label}
                        </span>
                        <span className={`font-medium text-gray-900 ${compact ? 'text-sm' : ''}`}>
                          {item.name}
                        </span>
                        {item.incident_id && (
                          <span className="text-xs text-gray-500">{item.incident_id}</span>
                        )}
                      </div>
                      
                      {/* Meta info */}
                      <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                        {item.incident_type && (
                          <span className="capitalize">{item.incident_type.replace(/_/g, ' ')}</span>
                        )}
                        {item.incident_date && (
                          <span> • {new Date(item.incident_date).toLocaleDateString()}</span>
                        )}
                        {(item.city || item.state) && (
                          <span> • {[item.city, item.state].filter(Boolean).join(', ')}</span>
                        )}
                        {item.facility && (
                          <span> • {item.facility}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {showSources && item.sources && item.sources.length > 0 && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : item.id)}
                          className={`${compact ? 'px-2 py-1 text-xs' : 'px-2 py-1 text-sm'} text-blue-600 hover:bg-blue-50 rounded transition-colors`}
                          title="View sources"
                        >
                          📎 {item.sources.length}
                        </button>
                      )}
                      
                      {item.type !== 'guest_report' && item.incident_id && (
                        <a
                          href={`/dashboard/review/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${compact ? 'px-2 py-1 text-xs' : 'px-2 py-1 text-sm'} text-gray-600 hover:bg-gray-100 rounded transition-colors`}
                          title="Open case"
                        >
                          ↗️
                        </a>
                      )}
                      
                      {onCaseSelect && (
                        <button
                          onClick={() => onCaseSelect(item)}
                          className={`${compact ? 'px-2 py-1 text-xs' : 'px-2 py-1 text-sm'} text-green-600 hover:bg-green-50 rounded transition-colors font-medium`}
                          title="Use this case"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Sources */}
                  {isExpanded && item.sources && item.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-1">Sources:</p>
                      <div className="space-y-1">
                        {item.sources.map((source, idx) => (
                          <a
                            key={source.id || idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-600 hover:underline truncate"
                          >
                            {source.title || source.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary preview */}
                  {item.summary && !compact && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {searched && results.length > 0 && (
        <div className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-t bg-gray-50 text-xs text-gray-600`}>
          Found {results.length} potential match{results.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
}
