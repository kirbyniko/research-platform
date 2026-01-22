'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setAutoSlug(false);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    
    if (!slug || slug.length < 3) {
      setError('Slug must be at least 3 characters');
      return;
    }
    
    setCreating(true);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim() || null,
          is_public: isPublic,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }
      
      router.push(`/projects/${data.project.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setCreating(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Project</h1>
          <p className="text-gray-600 mb-6">
            Set up a new research investigation with custom record types and fields.
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., ICE Deaths Investigation"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={255}
              />
            </div>

            {showAdvanced && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">/projects/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="ice-deaths"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    maxLength={100}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Lowercase letters, numbers, and hyphens only. At least 3 characters.
                </p>
              </div>
            )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this research project..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make this project public
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-4 ml-7">
              Public projects allow anyone to view verified records. You can change this later.
            </p>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
              <Link
                href="/projects"
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="font-semibold text-blue-900 mb-2">What&apos;s Next?</h2>
          <ol className="text-sm text-blue-800 space-y-2">
            <li>1. Create <strong>Record Types</strong> (e.g., &ldquo;Incident&rdquo;, &ldquo;Statement&rdquo;)</li>
            <li>2. Define <strong>Fields</strong> for each record type (text, dates, dropdowns, etc.)</li>
            <li>3. Configure which fields appear in <strong>Guest</strong>, <strong>Review</strong>, and <strong>Validation</strong> forms</li>
            <li>4. <strong>Invite team members</strong> with appropriate roles</li>
            <li>5. Start collecting and verifying data!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
