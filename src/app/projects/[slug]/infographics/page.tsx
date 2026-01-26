'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Infographic, InfographicStatus } from '@/types/platform';

// Simple icon components
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const GlobeAltIcon = ({ className, title }: { className?: string; title?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <title>{title}</title>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);
const CheckBadgeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface RecordType {
  id: number;
  slug: string;
  name: string;
}

export default function InfographicsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [infographics, setInfographics] = useState<Infographic[]>([]);
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InfographicStatus | 'all'>('all');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, resolvedParams.slug, filterStatus, filterScope]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch project info to get user role
      const projectRes = await fetch(`/api/projects/${resolvedParams.slug}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setUserRole(projectData.role);
      }
      
      // Fetch record types for filtering and creation
      const typesRes = await fetch(`/api/projects/${resolvedParams.slug}/record-types`);
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setRecordTypes(typesData.recordTypes || []);
      }
      
      // Build query params
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterScope !== 'all') params.set('scope_type', filterScope);
      
      const res = await fetch(`/api/projects/${resolvedParams.slug}/infographics?${params}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('Infographics table not found. Please run the database migration.');
        } else {
          throw new Error('Failed to fetch infographics');
        }
        return;
      }
      
      const data = await res.json();
      setInfographics(data.infographics || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load infographics');
    } finally {
      setLoading(false);
    }
  }

  async function deleteInfographic(id: number) {
    if (!confirm('Are you sure you want to delete this infographic?')) return;
    
    try {
      const res = await fetch(`/api/projects/${resolvedParams.slug}/infographics/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      
      setInfographics(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert('Failed to delete infographic');
    }
  }

  const canCreate = userRole && ['owner', 'admin', 'reviewer', 'analyst'].includes(userRole);
  const canEdit = userRole && ['owner', 'admin', 'analyst'].includes(userRole);
  const canPublish = userRole && ['owner', 'admin'].includes(userRole);
  const canDelete = userRole && ['owner', 'admin'].includes(userRole);

  const getStatusBadge = (status: InfographicStatus) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending_review: 'bg-yellow-100 text-yellow-700',
      published: 'bg-green-100 text-green-700',
      archived: 'bg-red-100 text-red-700'
    };
    const labels = {
      draft: 'Draft',
      pending_review: 'Pending Review',
      published: 'Published',
      archived: 'Archived'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getVerificationBadge = (status: string) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 text-green-600 text-xs">
          <CheckBadgeIcon className="w-4 h-4" />
          Verified
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-yellow-600 text-xs">
          <ClockIcon className="w-4 h-4" />
          Pending
        </span>
      );
    }
    return null;
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'dot-grid':
        return '⬤⬤⬤';
      case 'counter':
        return '123';
      case 'scrollytelling':
        return '📜';
      case 'timeline':
        return '📅';
      case 'bar-chart':
        return '📊';
      case 'comparison':
        return '⚖️';
      case 'map':
        return '🗺️';
      default:
        return '📈';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${resolvedParams.slug}`}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Project
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <ChartBarIcon className="w-7 h-7" />
                Infographics
              </h1>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <PlusIcon className="w-5 h-5" />
                New Infographic
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">{error}</p>
            {error.includes('migration') && (
              <p className="text-sm text-yellow-600 mt-2">
                Run the migration at <code className="bg-yellow-100 px-1 rounded">scripts/migrations/025-infographics.sql</code>
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as InfographicStatus | 'all')}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <select
                    value={filterScope}
                    onChange={(e) => setFilterScope(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Scopes</option>
                    <option value="record">Single Record</option>
                    <option value="record_type">Record Type</option>
                    <option value="project">Entire Project</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Infographics Grid */}
            {infographics.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No infographics yet</h3>
                <p className="text-gray-500 mb-6">
                  Create beautiful, interactive visualizations from your data.
                </p>
                {canCreate && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create Your First Infographic
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {infographics.map((infographic) => (
                  <div
                    key={infographic.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition"
                  >
                    {/* Preview thumbnail */}
                    <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-4xl opacity-50">{getComponentIcon(infographic.component_type)}</span>
                    </div>
                    
                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 truncate flex-1">{infographic.name}</h3>
                        {getStatusBadge(infographic.status)}
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {infographic.description || 'No description'}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                        <span className="capitalize">{infographic.component_type.replace('-', ' ')}</span>
                        <span className="capitalize">{infographic.scope_type.replace('_', ' ')} scope</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {infographic.is_public && (
                            <GlobeAltIcon className="w-4 h-4 text-green-500" title="Public" />
                          )}
                          {getVerificationBadge(infographic.verification_status)}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {infographic.status === 'published' && (
                            <Link
                              href={`/infographics/${infographic.id}`}
                              target="_blank"
                              className="p-2 text-gray-400 hover:text-blue-600 transition"
                              title="View Public"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Link>
                          )}
                          {canEdit && (
                            <Link
                              href={`/projects/${resolvedParams.slug}/infographics/${infographic.id}`}
                              className="p-2 text-gray-400 hover:text-blue-600 transition"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => deleteInfographic(infographic.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateInfographicModal
          projectSlug={resolvedParams.slug}
          recordTypes={recordTypes}
          onClose={() => setShowCreateModal(false)}
          onCreate={(newInfographic) => {
            setInfographics(prev => [newInfographic, ...prev]);
            setShowCreateModal(false);
            // Redirect to editor
            router.push(`/projects/${resolvedParams.slug}/infographics/${newInfographic.id}`);
          }}
        />
      )}
    </div>
  );
}

// Create Modal Component
function CreateInfographicModal({
  projectSlug,
  recordTypes,
  onClose,
  onCreate
}: {
  projectSlug: string;
  recordTypes: RecordType[];
  onClose: () => void;
  onCreate: (infographic: Infographic) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<'record_type' | 'project'>('record_type');
  const [recordTypeId, setRecordTypeId] = useState<number | null>(
    recordTypes.length > 0 ? recordTypes[0].id : null
  );
  const [componentType, setComponentType] = useState<string>('dot-grid');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const componentTypes = [
    { value: 'dot-grid', label: 'Dot Grid', description: 'Each item as a dot - powerful for showing scale' },
    { value: 'counter', label: 'Counter', description: 'Animated number that counts up' },
    { value: 'scrollytelling', label: 'Scrollytelling', description: 'Narrative that unfolds as you scroll' },
    { value: 'timeline', label: 'Timeline', description: 'Events displayed chronologically' },
    { value: 'bar-chart', label: 'Bar Chart', description: 'Compare quantities across categories' },
    { value: 'comparison', label: 'Comparison', description: 'Side-by-side visualization' },
  ];

  async function handleCreate() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (scopeType === 'record_type' && !recordTypeId) {
      setError('Please select a record type');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectSlug}/infographics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          scope_type: scopeType,
          record_type_id: scopeType === 'record_type' ? recordTypeId : undefined,
          component_type: componentType
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create infographic');
      }

      const data = await res.json();
      onCreate(data.infographic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Create New Infographic</h2>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Deaths by Year"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="What does this infographic show?"
            />
          </div>

          {/* Data Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={scopeType === 'record_type'}
                  onChange={() => setScopeType('record_type')}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-sm">Single Record Type</div>
                  <div className="text-xs text-gray-500">Visualize all records of a specific type</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={scopeType === 'project'}
                  onChange={() => setScopeType('project')}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-sm">Entire Project</div>
                  <div className="text-xs text-gray-500">Aggregate data across all record types</div>
                </div>
              </label>
            </div>
          </div>

          {/* Record Type Selector */}
          {scopeType === 'record_type' && recordTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
              <select
                value={recordTypeId || ''}
                onChange={(e) => setRecordTypeId(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {recordTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Component Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visualization Type</label>
            <div className="grid grid-cols-2 gap-2">
              {componentTypes.map((ct) => (
                <label
                  key={ct.value}
                  className={`flex flex-col p-3 border rounded-lg cursor-pointer transition ${
                    componentType === ct.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    checked={componentType === ct.value}
                    onChange={() => setComponentType(ct.value)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{ct.label}</span>
                  <span className="text-xs text-gray-500 mt-1">{ct.description}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {creating ? 'Creating...' : 'Create Infographic'}
          </button>
        </div>
      </div>
    </div>
  );
}
