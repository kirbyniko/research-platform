'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface RecordType {
  id: number;
  slug: string;
  name: string;
  name_plural: string;
  icon?: string;
  color?: string;
  record_count?: number;
}

interface Project {
  id: number;
  slug: string;
  name: string;
  description?: string;
}

interface RecordData {
  id: number;
  record_type_id: number;
  record_type_slug: string;
  record_type_name: string;
  status: string;
  created_at: string;
  created_by_name?: string;
  data: { [key: string]: any };
}

type TabType = 'records' | 'review' | 'validate';

export default function ProjectDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<TabType>('records');
  const [project, setProject] = useState<Project | null>(null);
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [records, setRecords] = useState<RecordData[]>([]);
  const [reviewQueue, setReviewQueue] = useState<RecordData[]>([]);
  const [validateQueue, setValidateQueue] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProject();
    }
  }, [status, resolvedParams.slug]);

  useEffect(() => {
    const tab = searchParams?.get('tab') as TabType;
    if (tab && ['records', 'review', 'validate'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (project) {
      if (activeTab === 'records') fetchRecords();
      else if (activeTab === 'review') fetchReviewQueue();
      else if (activeTab === 'validate') fetchValidateQueue();
    }
  }, [activeTab, project, selectedType]);

  async function fetchProject() {
    try {
      const [projectRes, typesRes] = await Promise.all([
        fetch(`/api/projects/${resolvedParams.slug}`),
        fetch(`/api/projects/${resolvedParams.slug}/record-types`)
      ]);
      
      if (!projectRes.ok || !typesRes.ok) {
        throw new Error('Failed to fetch project data');
      }
      
      const projectData = await projectRes.json();
      const typesData = await typesRes.json();
      
      setProject(projectData.project);
      setRecordTypes(typesData.recordTypes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecords() {
    try {
      const typeParam = selectedType !== 'all' ? `?type=${selectedType}` : '';
      const res = await fetch(`/api/projects/${resolvedParams.slug}/records${typeParam}`);
      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    }
  }

  async function fetchReviewQueue() {
    try {
      const typeParam = selectedType !== 'all' ? `&type=${selectedType}` : '';
      const res = await fetch(`/api/projects/${resolvedParams.slug}/records?status=pending_review${typeParam}`);
      if (!res.ok) throw new Error('Failed to fetch review queue');
      const data = await res.json();
      setReviewQueue(data.records || []);
    } catch (err) {
      console.error('Error fetching review queue:', err);
    }
  }

  async function fetchValidateQueue() {
    try {
      const typeParam = selectedType !== 'all' ? `&type=${selectedType}` : '';
      const res = await fetch(`/api/projects/${resolvedParams.slug}/records?status=pending_validation${typeParam}`);
      if (!res.ok) throw new Error('Failed to fetch validation queue');
      const data = await res.json();
      setValidateQueue(data.records || []);
    } catch (err) {
      console.error('Error fetching validation queue:', err);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending_review: 'bg-yellow-100 text-yellow-700',
      pending_validation: 'bg-blue-100 text-blue-700',
      verified: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Error</h1>
          <p className="text-gray-600">{error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  const currentRecords = activeTab === 'records' ? records : 
                         activeTab === 'review' ? reviewQueue : validateQueue;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/projects" className="hover:text-gray-700">Projects</Link>
                <span>/</span>
                <span>{project.name}</span>
              </div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/projects/${project.slug}/settings`}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Settings
              </Link>
              <Link
                href={`/projects/${project.slug}/records/new`}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                + New Record
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs + Type Filter */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center justify-between">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('records')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'records'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📊 View Records
                </button>
                <button
                  onClick={() => setActiveTab('review')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'review'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📝 Review Queue
                  {reviewQueue.length > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">
                      {reviewQueue.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('validate')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'validate'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ✅ Validation Queue
                  {validateQueue.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                      {validateQueue.length}
                    </span>
                  )}
                </button>
              </nav>

              {/* Record Type Filter */}
              {recordTypes.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Filter:</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="text-sm border rounded px-3 py-1.5"
                  >
                    <option value="all">All Types</option>
                    {recordTypes.map(rt => (
                      <option key={rt.slug} value={rt.slug}>
                        {rt.icon} {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'records' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">All Records</h2>
                  <div className="flex gap-2">
                    <Link
                      href={`/projects/${project.slug}/record-types/new`}
                      className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                    >
                      + Record Type
                    </Link>
                  </div>
                </div>

                {currentRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold mb-2">No records yet</h3>
                    <p className="text-gray-600 mb-4">
                      {selectedType !== 'all' 
                        ? `No records found for this type` 
                        : 'Create your first record to get started'}
                    </p>
                    <Link
                      href={`/projects/${project.slug}/records/new`}
                      className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                    >
                      Create First Record
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentRecords.map(record => (
                      <Link
                        key={record.id}
                        href={`/projects/${project.slug}/records/${record.id}`}
                        className="block p-4 border rounded hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{record.record_type_name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(record.status)}`}>
                                {record.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {Object.values(record.data).slice(0, 2).join(' • ')}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(record.created_at).toLocaleDateString()} 
                              {record.created_by_name && ` • by ${record.created_by_name}`}
                            </div>
                          </div>
                          <span className="text-gray-400">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'review' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Pending Review</h2>
                  <span className="text-sm text-gray-600">
                    {reviewQueue.length} record{reviewQueue.length !== 1 ? 's' : ''} awaiting review
                  </span>
                </div>

                {reviewQueue.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">✨</div>
                    <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                    <p className="text-gray-600">No records pending review</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviewQueue.map(record => (
                      <Link
                        key={record.id}
                        href={`/projects/${project.slug}/records/${record.id}/review`}
                        className="block p-4 border rounded hover:bg-yellow-50 border-yellow-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{record.record_type_name}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                Needs Review
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {Object.values(record.data).slice(0, 2).join(' • ')}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Submitted {new Date(record.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="text-gray-400">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'validate' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Pending Validation</h2>
                  <span className="text-sm text-gray-600">
                    {validateQueue.length} record{validateQueue.length !== 1 ? 's' : ''} awaiting validation
                  </span>
                </div>

                {validateQueue.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">✨</div>
                    <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                    <p className="text-gray-600">No records pending validation</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {validateQueue.map(record => (
                      <Link
                        key={record.id}
                        href={`/projects/${project.slug}/records/${record.id}/validate`}
                        className="block p-4 border rounded hover:bg-blue-50 border-blue-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{record.record_type_name}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                Needs Validation
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {Object.values(record.data).slice(0, 2).join(' • ')}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Reviewed {new Date(record.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="text-gray-400">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Record Types Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Record Types</h2>
              <p className="text-sm text-gray-600">Manage data collection structures</p>
            </div>
            <Link
              href={`/projects/${project.slug}/record-types/new`}
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
            >
              + Add Type
            </Link>
          </div>

          {recordTypes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No record types yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {recordTypes.map(rt => (
                <Link
                  key={rt.id}
                  href={`/projects/${project.slug}/record-types/${rt.slug}`}
                  className="p-4 border rounded hover:bg-gray-50 text-center"
                >
                  <div className="text-3xl mb-2">{rt.icon || '📄'}</div>
                  <div className="font-medium text-sm">{rt.name}</div>
                  {rt.record_count !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {rt.record_count} record{rt.record_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
