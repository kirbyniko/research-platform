'use client';

import { useState } from 'react';

interface DuplicateMatch {
  id: number;
  name: string;
  incident_date?: string;
  city?: string;
  state?: string;
  status?: string;
  record_type?: string;
}

interface DuplicateCheckerProps {
  /** The field to watch for name changes */
  nameValue: string;
  /** API base URL - will search /api/projects/[slug]/records/search */
  projectSlug: string;
  /** Optional: Callback when a duplicate is selected */
  onDuplicateSelect?: (record: DuplicateMatch) => void;
  /** Optional: Record type slug to filter by */
  recordTypeSlug?: string;
  /** Optional: Exclude this record ID from results (for editing existing records) */
  excludeRecordId?: number;
}

export function DuplicateChecker({
  nameValue,
  projectSlug,
  onDuplicateSelect,
  recordTypeSlug,
  excludeRecordId
}: DuplicateCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DuplicateMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  
  const checkForDuplicates = async () => {
    const name = nameValue?.trim() || '';
    
    if (!name || name.length < 2) {
      setError('Enter at least 2 characters in the name field to check for duplicates.');
      setResults(null);
      setSearched(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSearched(true);
    
    try {
      const params = new URLSearchParams({ q: name });
      if (recordTypeSlug) {
        params.append('type', recordTypeSlug);
      }
      if (excludeRecordId) {
        params.append('exclude', excludeRecordId.toString());
      }
      
      const response = await fetch(`/api/projects/${projectSlug}/records/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResults(data.records || []);
    } catch (err) {
      console.error('Duplicate check error:', err);
      setError('Failed to check for duplicates. Please try again.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const datePart = String(dateStr).split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };
  
  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_validation':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'validated': return 'Validated';
      case 'pending_review': return 'Pending Review';
      case 'pending_validation': return 'Pending Validation';
      case 'rejected': return 'Rejected';
      case 'draft': return 'Draft';
      default: return status || 'Unknown';
    }
  };
  
  return (
    <div className="border-t border-gray-200 pt-3">
      {/* Search Button */}
      <button
        type="button"
        onClick={checkForDuplicates}
        disabled={loading}
        className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>🔍</span>
        {loading ? 'Checking...' : 'Check for Duplicates & Related Cases'}
      </button>
      
      {/* Results */}
      {searched && (
        <div className={`mt-3 p-3 rounded text-sm ${
          error ? 'bg-red-50 border border-red-200' :
          results && results.length > 0 ? 'bg-yellow-50 border border-yellow-300' :
          results ? 'bg-green-50 border border-green-200' : ''
        }`}>
          {error && (
            <div className="text-red-700">{error}</div>
          )}
          
          {results && results.length === 0 && (
            <div className="text-green-700 flex items-center gap-2">
              <span>✓</span>
              No existing records found matching this name.
            </div>
          )}
          
          {results && results.length > 0 && (
            <>
              <div className="text-yellow-800 font-medium mb-2">
                ⚠️ {results.length} potential match{results.length !== 1 ? 'es' : ''} found:
              </div>
              
              <div className="space-y-2">
                {results.map(record => (
                  <div 
                    key={record.id}
                    className="bg-white p-3 rounded border border-gray-200"
                  >
                    <div className="font-medium text-gray-900">{record.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {record.incident_date && formatDate(record.incident_date)}
                      {record.city && ` • ${record.city}`}
                      {record.state && `, ${record.state}`}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${getStatusStyle(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                      {record.record_type && (
                        <span className="text-xs text-gray-500">{record.record_type}</span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <a
                        href={`/projects/${projectSlug}/records/${record.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View record →
                      </a>
                      {onDuplicateSelect && (
                        <button
                          type="button"
                          onClick={() => onDuplicateSelect(record)}
                          className="text-xs text-gray-600 hover:underline"
                        >
                          Link as related
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="mt-3 text-xs text-gray-600">
                If this is a new record, proceed with entry. If this matches an existing record, consider adding information to the existing record instead.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DuplicateChecker;
