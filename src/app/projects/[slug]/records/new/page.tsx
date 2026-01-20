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

export default function NewRecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [selectedType, setSelectedType] = useState<RecordType | null>(null);
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
    
    // Fetch fields for selected record type
    fetch(`/api/projects/${projectSlug}/record-types/${selectedType.slug}/fields`)
      .then(res => res.json())
      .then(data => {
        setFields(data.fields || []);
        setGroups(data.groups || []);
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
    
    // Show success message for guests, redirect for users
    if (isGuest) {
      alert(data.message || 'Thank you for your submission!');
      router.push(`/projects/${projectSlug}`);
    } else {
      router.push(`/projects/${projectSlug}/records/${data.record.id}`);
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

          {/* Guest submission toggle */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isGuest}
                onChange={(e) => setIsGuest(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm">Submit as guest (no account required)</span>
            </label>
            
            {isGuest && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Optional - for follow-up"
                  />
                </div>
              </div>
            )}
          </div>

          {fields.length === 0 ? (
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
