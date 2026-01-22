'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecordItem {
  id: number;
  data: Record<string, unknown>;
  status: string;
  record_type_slug: string;
  record_type_name: string;
  submitted_by_name?: string;
  created_at: string;
  is_guest_submission: boolean;
}

interface RecordType {
  id: number;
  slug: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function RecordsPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  
  // Filters
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRecords = useCallback(async () => {
    if (!projectSlug) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(currentPage));
      if (selectedType) queryParams.set('type', selectedType);
      if (selectedStatus) queryParams.set('status', selectedStatus);
      if (searchQuery) queryParams.set('search', searchQuery);
      
      const response = await fetch(`/api/projects/${projectSlug}/records?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      
      const data = await response.json();
      setRecords(data.records);
      setPagination(data.pagination);
      setUserRole(data.role || null);
      setProjectName(data.projectName || projectSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [projectSlug, currentPage, selectedType, selectedStatus, searchQuery]);

  useEffect(() => {
    params.then(p => setProjectSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!projectSlug) return;
    
    // Fetch record types for filter
    fetch(`/api/projects/${projectSlug}/record-types`)
      .then(res => res.json())
      .then(data => setRecordTypes(data.recordTypes || []))
      .catch(console.error);
      
    fetchRecords();
  }, [projectSlug, fetchRecords]);

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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  // Get display title from record data
  const getRecordTitle = (record: RecordItem) => {
    const data = record.data;
    // Try common title fields
    for (const key of ['title', 'name', 'subject_name', 'victim_name', 'headline']) {
      if (data[key] && typeof data[key] === 'string') {
        return data[key] as string;
      }
    }
    // Fallback to record type + ID
    return `${record.record_type_name} #${record.id}`;
  };

  if (!projectSlug) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {userRole ? (
            <Link href={`/projects/${projectSlug}`} className="text-blue-600 hover:underline text-sm">
              ← Back to Project
            </Link>
          ) : (
            <h1 className="text-3xl font-bold">{projectName || 'Verified Records'}</h1>
          )}
          {userRole && <h1 className="text-2xl font-bold mt-2">Records</h1>}
          {!userRole && (
            <p className="text-gray-600 mt-2">Browse all independently verified records</p>
          )}
        </div>
        
        {userRole && (
          <div className="flex space-x-2">
            {recordTypes.map(rt => (
              <Link
                key={rt.id}
                href={`/projects/${projectSlug}/records/new?type=${rt.slug}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                + New {rt.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Filters - Only show for authenticated users */}
      {userRole && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
              <select
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Types</option>
                {recordTypes.map(rt => (
                  <option key={rt.id} value={rt.slug}>{rt.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="pending_validation">Pending Validation</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
                placeholder="Search records..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Records List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading records...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No records found</p>
          {userRole && recordTypes.length > 0 && (
            <Link
              href={`/projects/${projectSlug}/records/new?type=${recordTypes[0].slug}`}
              className="text-blue-600 hover:underline"
            >
              Create your first record
            </Link>
          )}
        </div>
      ) : userRole ? (
        // Admin table view
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Record
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/projects/${projectSlug}/records/${record.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {getRecordTitle(record)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.record_type_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.is_guest_submission ? (
                      <span className="text-orange-600">Guest</span>
                    ) : (
                      record.submitted_by_name || 'Unknown'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/projects/${projectSlug}/records/${record.id}`}
                      className="text-gray-600 hover:text-gray-900 mr-3"
                    >
                      View
                    </Link>
                    {record.status === 'pending_review' && (
                      <Link
                        href={`/projects/${projectSlug}/records/${record.id}/review`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Review
                      </Link>
                    )}
                    {record.status === 'pending_validation' && (
                      <Link
                        href={`/projects/${projectSlug}/records/${record.id}/validate`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Validate
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Public card view
        <div className="space-y-6">
          {records.map(record => {
            const title = getRecordTitle(record);
            const summary = record.data['summary'] || record.data['description'] || '';
            
            return (
              <Link
                key={record.id}
                href={`/projects/${projectSlug}/records/${record.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="uppercase tracking-wide">{record.record_type_name}</span>
                      <span>•</span>
                      <span>{new Date(record.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-medium">
                    ✓ Verified
                  </div>
                </div>
                
                {summary && (
                  <p className="text-gray-600 line-clamp-2 mt-3">
                    {String(summary)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
      
      {/* Pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className={`${userRole ? 'bg-gray-50 px-6 py-3 border-t' : 'mt-8'} flex items-center justify-between`}>
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} records
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
