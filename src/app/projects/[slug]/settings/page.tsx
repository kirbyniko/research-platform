'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { TagManager } from '@/components/tags';

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
  const [activeTab, setActiveTab] = useState<'general' | 'tags' | 'permissions'>('general');
  const [saving, setSaving] = useState(false);
  
  // Form state for general settings
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags_enabled: true
  });

  useEffect(() => {
    fetchProject();
  }, [slug]);

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
        tags_enabled: data.project.tags_enabled ?? true
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Permissions Settings */}
        {activeTab === 'permissions' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Permissions</h2>
            <p className="text-gray-500">
              Permission settings coming soon. 
              For team management, visit the{' '}
              <a href={`/projects/${slug}/team`} className="text-blue-600 hover:underline">
                Team page
              </a>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
