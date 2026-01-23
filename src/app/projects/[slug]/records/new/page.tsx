'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DynamicForm } from '@/components/dynamic-form';
import { FieldDefinition, FieldGroup } from '@/types/platform';

interface RecordType {
  id: number;
  slug: string;
  name: string;
  description?: string;
  workflow_config?: {
    guest_form_enabled?: boolean;
  };
}

interface RecordTypeSettings {
  use_quotes: boolean;
  use_sources: boolean;
  use_media: boolean;
}

export default function NewRecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [selectedType, setSelectedType] = useState<RecordType | null>(null);
  const [settings, setSettings] = useState<RecordTypeSettings | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    params.then(p => setProjectSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!projectSlug) return;
    
    // Fetch record types
    fetch(`/api/projects/${projectSlug}/record-types`)
      .then(res => res.json())
      .then(data => {
        setRecordTypes(data.recordTypes || []);
        
        // Auto-select from URL param
        const typeParam = searchParams.get('type');
        if (typeParam) {
          const found = data.recordTypes?.find((rt: RecordType) => rt.slug === typeParam);
          if (found) setSelectedType(found);
        }
        
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectSlug, searchParams]);

  useEffect(() => {
    if (!selectedType || !projectSlug) return;
    
    // Fetch both fields and settings for selected record type
    Promise.all([
      fetch(`/api/projects/${projectSlug}/record-types/${selectedType.slug}/fields`).then(r => r.json()),
      fetch(`/api/projects/${projectSlug}/record-types/${selectedType.slug}/settings`).then(r => r.json())
    ])
      .then(([fieldsData, settingsData]) => {
        setFields(fieldsData.fields || []);
        setGroups(fieldsData.groups || []);
        setSettings({
          use_quotes: settingsData.recordType?.use_quotes || false,
          use_sources: settingsData.recordType?.use_sources || false,
          use_media: settingsData.recordType?.use_media || false,
        });
      })
      .catch(console.error);
  }, [selectedType, projectSlug]);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (!selectedType) return;
    
    const body: Record<string, unknown> = {
      record_type_slug: selectedType.slug,
      data: formData,
    };
    
    if (isGuest) {
      body.is_guest_submission = true;
      body.guest_email = guestEmail;
      body.guest_name = guestName;
    }
    
    const response = await fetch(`/api/projects/${projectSlug}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create record');
    }
    
    const data = await response.json();
    
    // Show success message for guests, redirect analysts to review page
    if (isGuest) {
      alert(data.message || 'Thank you for your submission!');
      router.push(`/projects/${projectSlug}`);
    } else {
      // Analysts go to review page to add quotes/sources/media
      router.push(`/projects/${projectSlug}/records/${data.record.id}/review`);
    }
  };

  if (!projectSlug) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href={`/projects/${projectSlug}/records`} className="text-blue-600 hover:underline text-sm">
          ← Back to Records
        </Link>
        <h1 className="text-2xl font-bold mt-2">Create New Record</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Record Type Selector */}
      {!selectedType && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Select Record Type</h2>
          {recordTypes.length === 0 ? (
            <p className="text-gray-500">No record types defined for this project.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recordTypes.map(rt => (
                <button
                  key={rt.id}
                  onClick={() => setSelectedType(rt)}
                  className="p-4 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <h3 className="font-medium">{rt.name}</h3>
                  {rt.description && (
                    <p className="text-sm text-gray-500 mt-1">{rt.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {selectedType && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">New {selectedType.name}</h2>
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change Type
            </button>
          </div>

          {/* Mode Selector - Analyst vs Guest */}
          <div className="mb-6">
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-4">
                <button
                  onClick={() => setIsGuest(false)}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    !isGuest
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📝 Analyst Mode
                </button>
                <button
                  onClick={() => setIsGuest(true)}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    isGuest
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  👤 Guest Submission
                </button>
              </nav>
            </div>
            
          {!isGuest ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
              <div>
                <strong className="text-blue-900">Analyst Mode:</strong>
                <span className="text-blue-800 ml-1">
                  You'll be able to add quotes, sources, and media after filling the form.
                </span>
              </div>
              {settings && (settings.use_quotes || settings.use_sources || settings.use_media) && (
                <div className="pt-2 border-t border-blue-200 text-xs">
                  <strong className="text-blue-900 block mb-1">Available data types:</strong>
                  <div className="flex flex-wrap gap-2">
                    {settings.use_quotes && (
                      <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded">💬 Quotes</span>
                    )}
                    {settings.use_sources && (
                      <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded">📎 Sources</span>
                    )}
                    {settings.use_media && (
                      <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded">🎥 Media</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <strong className="text-yellow-900">Guest Submission:</strong>
                  <span className="text-yellow-800 ml-1">
                    Anonymous submission that will go through review.
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name (optional)
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Anonymous"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Email (optional)
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="For follow-up"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {fields.length === 0 && !isGuest ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
                <p className="text-sm">
                  No fields defined yet, but you can still create a record and add quotes, sources, and media in the review page.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const response = await fetch(`/api/projects/${projectSlug}/records`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        record_type_slug: selectedType.slug,
                        data: {},
                      }),
                    });
                    if (!response.ok) {
                      const data = await response.json();
                      alert(data.error || 'Failed to create record');
                      return;
                    }
                    const data = await response.json();
                    router.push(`/projects/${projectSlug}/records/${data.record.id}/review`);
                  }}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                >
                  Create Empty Record
                </button>
                <Link 
                  href={`/projects/${projectSlug}/record-types/${selectedType.slug}/fields`}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Add Fields First
                </Link>
              </div>
            </div>
          ) : fields.length === 0 ? (
            <p className="text-gray-500">
              No fields defined for this record type.{' '}
              <Link 
                href={`/projects/${projectSlug}/record-types/${selectedType.slug}/fields`}
                className="text-blue-600 hover:underline"
              >
                Add fields
              </Link>
            </p>
          ) : (
            <DynamicForm
              projectSlug={projectSlug}
              recordTypeSlug={selectedType.slug}
              mode={isGuest ? 'guest' : 'review'}
              fields={fields}
              groups={groups}
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/projects/${projectSlug}/records`)}
            />
          )}
        </div>
      )}
    </div>
  );
}
