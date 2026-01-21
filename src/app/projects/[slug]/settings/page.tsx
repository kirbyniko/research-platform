'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { TagManager } from '@/components/tags';
import { StorageUsageBar } from '@/components/uploads';

// Format bytes to human readable (e.g., 1.5 GB)
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

// Format file size with more precision for smaller files
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  tags_enabled?: boolean;
}

export default function ProjectSettings({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'tags' | 'storage' | 'permissions'>('general');
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [guestUploadSettings, setGuestUploadSettings] = useState({
    guest_upload_enabled: false,
    guest_upload_quota_bytes: 10485760, // 10MB
    guest_upload_max_file_size: 5242880 // 5MB
  });
  const [saving, setSaving] = useState(false);
  
  // Form state for general settings
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags_enabled: true,
    require_different_validator: false
  });

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Project not found');
        throw new Error('Failed to fetch project');
      }
      const data = await res.json();
      setProject(data.project);
      setFormData({
        name: data.project.name || '',
        description: data.project.description || '',
        tags_enabled: data.project.tags_enabled ?? true,
        require_different_validator: data.project.require_different_validator ?? false
      });
      setGuestUploadSettings({
        guest_upload_enabled: data.project.guest_upload_enabled ?? false,
        guest_upload_quota_bytes: data.project.guest_upload_quota_bytes ?? 10485760,
        guest_upload_max_file_size: data.project.guest_upload_max_file_size ?? 5242880
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };
useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      
      const data = await res.json();
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fetchStorageInfo = async () => {
    setLoadingStorage(true);
    try {
      const [storageRes, subRes] = await Promise.all([
        fetch(`/api/projects/${slug}/storage`),
        fetch(`/api/projects/${slug}/subscription`)
      ]);
      if (storageRes.ok) {
        const data = await storageRes.json();
        setStorageInfo(data);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubscriptionInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch storage info:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleChangePlan = async (planSlug: string) => {
    try {
      const res = await fetch(`/api/projects/${slug}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug })
      });
      if (res.ok) {
        await fetchStorageInfo();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to change plan');
      }
    } catch (err) {
      alert('Failed to change plan');
    }
  };

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (activeTab === 'storage' && !storageInfo) {
      fetchStorageInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'tags' as const, label: 'Tags' },
    { id: 'storage' as const, label: 'Storage' },
    { id: 'permissions' as const, label: 'Permissions' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push(`/projects/${slug}`)}
                className="text-sm text-gray-500 hover:text-gray-700 mb-1"
              >
                ← Back to {project.name}
              </button>
              <h1 className="text-2xl font-bold">Project Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">General Settings</h2>
            
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full max-w-md px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your research project..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tags_enabled"
                  checked={formData.tags_enabled}
                  onChange={e => setFormData({ ...formData, tags_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="tags_enabled" className="text-sm text-gray-700">
                  Enable tags for this project
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="require_different_validator"
                  checked={formData.require_different_validator}
                  onChange={e => setFormData({ ...formData, require_different_validator: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="require_different_validator" className="text-sm text-gray-700">
                  Require different user for validation than review
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-7 -mt-2">
                When enabled, records must be validated by a different user than the one who reviewed them
              </p>

              <div className="pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tags Settings */}
        {activeTab === 'tags' && (
          <div className="bg-white rounded-lg shadow p-6">
            {formData.tags_enabled ? (
              <TagManager projectSlug={slug} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Tags are disabled for this project.</p>
                <p className="text-sm mt-2">
                  Enable tags in the General settings to manage project tags.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Storage Settings */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Storage & Files</h2>
              
              {loadingStorage ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : storageInfo ? (
                <div className="space-y-6">
                  {/* Current Usage */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Current Usage</h3>
                    <StorageUsageBar
                      bytesUsed={storageInfo.usedBytes || 0}
                      bytesLimit={storageInfo.quotaBytes || 0}
                    />
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">{storageInfo.fileCount || 0}</span> files uploaded
                    </div>
                  </div>

                  {/* Current Plan */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Current Plan</h3>
                    {subscriptionInfo?.subscription ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-blue-900">{subscriptionInfo.subscription.name}</p>
                            <p className="text-sm text-blue-700">
                              {formatBytes(subscriptionInfo.subscription.storage_limit_bytes)} storage
                              {subscriptionInfo.subscription.price_monthly_cents > 0 && (
                                <span> · ${(subscriptionInfo.subscription.price_monthly_cents / 100).toFixed(0)}/month</span>
                              )}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                            Active
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-600">No active storage plan</p>
                        <p className="text-sm text-gray-500">Subscribe to a plan to enable file uploads</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load storage info
                </div>
              )}
            </div>

            {/* Available Plans */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Available Plans</h2>
              
              {subscriptionInfo?.availablePlans ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {subscriptionInfo.availablePlans.map((plan: any) => {
                    const isCurrentPlan = subscriptionInfo.subscription?.plan_slug === plan.slug;
                    return (
                      <div
                        key={plan.id}
                        className={`border rounded-lg p-4 ${
                          isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-2xl font-bold my-2">
                          {plan.price_monthly_cents === 0 ? (
                            'Free'
                          ) : (
                            <>${(plan.price_monthly_cents / 100).toFixed(0)}<span className="text-sm font-normal">/mo</span></>
                          )}
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1 mb-4">
                          <li>✓ {formatBytes(plan.storage_limit_bytes)} storage</li>
                          <li>✓ {formatBytes(plan.bandwidth_limit_bytes)}/mo bandwidth</li>
                          <li>✓ {formatFileSize(plan.max_file_size_bytes)} max file size</li>
                        </ul>
                        {isCurrentPlan ? (
                          <span className="block w-full text-center py-2 bg-blue-600 text-white rounded text-sm">
                            Current Plan
                          </span>
                        ) : (
                          <button
                            onClick={() => handleChangePlan(plan.slug)}
                            className="w-full py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 text-sm"
                          >
                            {plan.price_monthly_cents === 0 ? 'Select' : 'Upgrade'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : loadingStorage ? (
                <div className="text-center py-8 text-gray-500">Loading plans...</div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load available plans
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-4">
                * Billing integration coming soon. Plans can currently be assigned by administrators.
              </p>
            </div>
          </div>
        )}

        {/* Permissions Settings */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {/* Guest Upload Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Guest Upload Settings</h2>
              <p className="text-sm text-gray-600 mb-6">
                Control whether guests (non-members) can upload files to this project.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="guest_upload_enabled"
                    checked={guestUploadSettings.guest_upload_enabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      setGuestUploadSettings({ ...guestUploadSettings, guest_upload_enabled: enabled });
                      try {
                        await fetch(`/api/projects/${slug}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ guest_upload_enabled: enabled })
                        });
                      } catch (err) {
                        alert('Failed to update setting');
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="guest_upload_enabled" className="text-sm text-gray-700 font-medium">
                    Allow guests to upload files
                  </label>
                </div>
                
                {guestUploadSettings.guest_upload_enabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guest Upload Quota
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={Math.round(guestUploadSettings.guest_upload_quota_bytes / (1024 * 1024))}
                          onChange={async (e) => {
                            const mb = parseInt(e.target.value) || 10;
                            const bytes = mb * 1024 * 1024;
                            setGuestUploadSettings({ ...guestUploadSettings, guest_upload_quota_bytes: bytes });
                          }}
                          onBlur={async () => {
                            try {
                              await fetch(`/api/projects/${slug}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ guest_upload_quota_bytes: guestUploadSettings.guest_upload_quota_bytes })
                              });
                            } catch (err) {
                              alert('Failed to update quota');
                            }
                          }}
                          className="w-32 px-3 py-2 border rounded text-sm"
                          min="1"
                        />
                        <span className="text-sm text-gray-600">MB total per guest</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max File Size
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={Math.round(guestUploadSettings.guest_upload_max_file_size / (1024 * 1024))}
                          onChange={async (e) => {
                            const mb = parseInt(e.target.value) || 5;
                            const bytes = mb * 1024 * 1024;
                            setGuestUploadSettings({ ...guestUploadSettings, guest_upload_max_file_size: bytes });
                          }}
                          onBlur={async () => {
                            try {
                              await fetch(`/api/projects/${slug}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ guest_upload_max_file_size: guestUploadSettings.guest_upload_max_file_size })
                              });
                            } catch (err) {
                              alert('Failed to update file size limit');
                            }
                          }}
                          className="w-32 px-3 py-2 border rounded text-sm"
                          min="1"
                        />
                        <span className="text-sm text-gray-600">MB per file</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Team Upload Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Team Upload Permissions</h2>
              <p className="text-sm text-gray-600 mb-4">
                Manage which team members can upload files and their individual quotas.
              </p>
              <a 
                href={`/projects/${slug}/team`} 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Manage Team Permissions →
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
