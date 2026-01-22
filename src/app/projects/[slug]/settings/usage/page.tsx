'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UsageSummary {
  record_count: number;
  quote_count: number;
  source_count: number;
  field_count: number;
  estimated_bytes: number;
}

interface RecordTypeUsage {
  record_type_slug: string;
  record_type_name: string;
  count: number;
}

interface StatusUsage {
  status: string;
  count: number;
}

interface DatabaseUsage {
  summary: UsageSummary;
  by_record_type: RecordTypeUsage[];
  by_status: StatusUsage[];
}

interface StorageInfo {
  subscription: {
    plan: {
      name: string;
      storage_limit_bytes: number;
    };
  };
  usage: {
    bytes_used: number;
    file_count: number;
    bytes_limit: number;
    percentage_used: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isHigh = percentage > 80;
  const isCritical = percentage > 95;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isCritical ? 'text-red-600 font-medium' : ''}>
          {formatBytes(value)} / {formatBytes(max)} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded overflow-hidden">
        <div 
          className={`h-full transition-all ${
            isCritical ? 'bg-red-500' : isHigh ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function ProjectUsagePage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug: projectSlug } = use(params);
  const router = useRouter();
  
  const [dbUsage, setDbUsage] = useState<DatabaseUsage | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const [dbRes, storageRes] = await Promise.all([
        fetch(`/api/projects/${projectSlug}/usage/database`),
        fetch(`/api/projects/${projectSlug}/storage`)
      ]);
      
      if (!dbRes.ok) throw new Error('Failed to fetch database usage');
      
      const dbData = await dbRes.json();
      setDbUsage(dbData);
      
      if (storageRes.ok) {
        const storageData = await storageRes.json();
        setStorageInfo(storageData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">Loading usage data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href={`/projects/${projectSlug}/settings`} className="hover:text-gray-700">
              Settings
            </Link>
            <span>/</span>
            <span>Usage</span>
          </div>
          <h1 className="text-2xl font-bold">Storage & Usage</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Storage Overview */}
        {storageInfo && storageInfo.subscription && storageInfo.usage && (
          <section className="mb-8 bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Storage Overview</h2>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                {storageInfo.subscription.plan?.name || 'Free'} Plan
              </span>
            </div>
            
            <div className="space-y-4">
              <ProgressBar 
                value={storageInfo.usage.bytes_used || 0}
                max={storageInfo.usage.bytes_limit || 1073741824}
                label="Media Storage"
              />
              
              <div className="pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold">{formatBytes(dbUsage?.summary?.estimated_bytes || 0)}</div>
                    <div className="text-sm text-gray-500">Database</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{formatBytes(storageInfo.usage.bytes_used || 0)}</div>
                    <div className="text-sm text-gray-500">Media Files</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {formatBytes((storageInfo.usage.bytes_used || 0) + (dbUsage?.summary?.estimated_bytes || 0))}
                    </div>
                    <div className="text-sm text-gray-500">Total Used</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Database Usage Summary */}
        {dbUsage && dbUsage.summary && (
          <>
            <section className="mb-8 bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Database Usage</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-semibold">{formatNumber(dbUsage.summary.record_count || 0)}</div>
                  <div className="text-sm text-gray-500">Records</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-semibold">{formatNumber(dbUsage.summary.quote_count || 0)}</div>
                  <div className="text-sm text-gray-500">Quotes</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-semibold">{formatNumber(dbUsage.summary.source_count || 0)}</div>
                  <div className="text-sm text-gray-500">Sources</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-semibold">{formatNumber(dbUsage.summary.field_count || 0)}</div>
                  <div className="text-sm text-gray-500">Field Values</div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                Estimated database size: {formatBytes(dbUsage.summary.estimated_bytes || 0)}
              </div>
            </section>

            {/* By Record Type */}
            <section className="mb-8 bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Records by Type</h2>
              
              {!dbUsage.by_record_type || dbUsage.by_record_type.length === 0 ? (
                <p className="text-gray-500">No records yet</p>
              ) : (
                <div className="space-y-3">
                  {dbUsage.by_record_type.map(rt => {
                    const percentage = dbUsage.summary.record_count > 0 
                      ? (rt.count / dbUsage.summary.record_count) * 100 
                      : 0;
                    return (
                      <div key={rt.record_type_slug} className="flex items-center gap-4">
                        <span className="w-32 text-sm truncate">{rt.record_type_name}</span>
                        <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-sm font-medium">
                          {formatNumber(rt.count)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* By Status */}
            <section className="mb-8 bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Records by Status</h2>
              
              {!dbUsage.by_status || dbUsage.by_status.length === 0 ? (
                <p className="text-gray-500">No records yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dbUsage.by_status.map(s => {
                    const statusColors: Record<string, string> = {
                      draft: 'bg-gray-100 text-gray-700',
                      pending_review: 'bg-yellow-100 text-yellow-700',
                      pending_validation: 'bg-blue-100 text-blue-700',
                      verified: 'bg-green-100 text-green-700',
                      rejected: 'bg-red-100 text-red-700'
                    };
                    
                    return (
                      <div 
                        key={s.status} 
                        className={`p-4 rounded ${statusColors[s.status] || 'bg-gray-100'}`}
                      >
                        <div className="text-xl font-semibold">{formatNumber(s.count)}</div>
                        <div className="text-sm capitalize">{s.status.replace(/_/g, ' ')}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* Upgrade Notice */}
        {storageInfo && storageInfo.subscription?.plan?.name === 'Free' && (
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Need more storage?</h2>
            <p className="text-gray-600 mb-4">
              Upgrade to a paid plan for increased storage limits and additional features.
            </p>
            <Link 
              href={`/projects/${projectSlug}/settings`}
              className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              View Plans
            </Link>
          </section>
        )}

        <div className="mt-8">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </main>
    </div>
  );
}
