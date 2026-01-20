'use client';

import { useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ICONS = ['📄', '📋', '📝', '📊', '📁', '🗂️', '📰', '🎯', '⚠️', '🚨', '💀', '🏛️', '👤', '🗣️', '📜', '🔍'];

export default function NewRecordTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [typeSlug, setTypeSlug] = useState('');
  const [namePlural, setNamePlural] = useState('');
  const [icon, setIcon] = useState('📄');
  const [description, setDescription] = useState('');
  const [guestFormEnabled, setGuestFormEnabled] = useState(true);
  const [requiresReview, setRequiresReview] = useState(true);
  const [requiresValidation, setRequiresValidation] = useState(true);
  const [autoSlug, setAutoSlug] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) {
      setTypeSlug(generateSlug(value));
    }
    // Auto-generate plural if not manually set
    if (!namePlural || namePlural === name + 's') {
      setNamePlural(value + 's');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!typeSlug || typeSlug.length < 2) {
      setError('Slug must be at least 2 characters');
      return;
    }
    
    setCreating(true);
    
    try {
      const response = await fetch(`/api/projects/${resolvedParams.slug}/record-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: typeSlug,
          name: name.trim(),
          name_plural: namePlural.trim() || name.trim() + 's',
          icon,
          description: description.trim() || null,
          guest_form_enabled: guestFormEnabled,
          requires_review: requiresReview,
          requires_validation: requiresValidation,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create record type');
      }
      
      // Redirect to the field editor
      router.push(`/projects/${resolvedParams.slug}/record-types/${data.recordType.slug}/fields`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record type');
      setCreating(false);
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/projects/${resolvedParams.slug}`} className="text-blue-600 hover:text-blue-800">
            ← Back to Project
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Record Type</h1>
          <p className="text-gray-600 mb-6">
            Define a type of data to collect (e.g., &ldquo;Incident&rdquo;, &ldquo;Statement&rdquo;, &ldquo;Document&rdquo;)
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Icon Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`w-10 h-10 text-xl rounded-lg border-2 transition ${
                      icon === i 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Singular) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Incident"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Plural Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Plural)
              </label>
              <input
                type="text"
                value={namePlural}
                onChange={(e) => setNamePlural(e.target.value)}
                placeholder="e.g., Incidents"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={typeSlug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setTypeSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                }}
                placeholder="e.g., incident"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used in URLs and API. Lowercase letters, numbers, underscores only.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of data does this record type capture?"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Workflow Options */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Workflow Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guestFormEnabled}
                    onChange={(e) => setGuestFormEnabled(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Guest Submissions</span>
                    <p className="text-sm text-gray-500">
                      Allow anonymous users to submit records via a simplified form
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresReview}
                    onChange={(e) => setRequiresReview(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Requires Review</span>
                    <p className="text-sm text-gray-500">
                      Records go through a review stage where all fields can be edited
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresValidation}
                    onChange={(e) => setRequiresValidation(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Requires Validation</span>
                    <p className="text-sm text-gray-500">
                      Reviewed records must be validated field-by-field before publishing
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
              >
                {creating ? 'Creating...' : 'Create & Add Fields'}
              </button>
              <Link
                href={`/projects/${resolvedParams.slug}`}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
