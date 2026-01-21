'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm } from '@/components/dynamic-form';
import { FieldDefinition, FieldGroup } from '@/types/platform';

interface RecordType {
  id: number;
  slug: string;
  name: string;
  description?: string;
}

interface Project {
  id: number;
  name: string;
  slug: string;
  guest_submissions_public: boolean;
}

export default function GuestSubmitPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [selectedType, setSelectedType] = useState<RecordType | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    params.then(p => setProjectSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!projectSlug) return;
    
    // Check if guest submissions are enabled
    fetch(`/api/projects/${projectSlug}`)
      .then(res => res.json())
      .then(data => {
        if (!data.project?.guest_submissions_public) {
          setError('Guest submissions are not enabled for this project.');
          setLoading(false);
          return;
        }
        
        setProject(data.project);
        
        // Fetch record types
        return fetch(`/api/projects/${projectSlug}/record-types`);
      })
      .then(res => res ? res.json() : null)
      .then(data => {
        if (data) {
          setRecordTypes(data.recordTypes || []);
          setLoading(false);
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectSlug]);

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
    
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_type_slug: selectedType.slug,
          data: formData,
          is_guest_submission: true,
          guest_email: guestEmail || undefined,
          guest_name: guestName || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create submission');
      }
      
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    }
  };

  if (!projectSlug) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h2 className="font-medium mb-2">Access Not Available</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-8 rounded-lg">
            <h2 className="text-xl font-medium mb-2">Thank You!</h2>
            <p className="mb-4">Your submission has been received and will be reviewed.</p>
            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedType(null);
                setGuestEmail('');
                setGuestName('');
              }}
              className="text-sm text-green-700 hover:text-green-800 underline"
            >
              Submit another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit Information
          </h1>
          {project && (
            <p className="text-gray-600">
              Contribute to {project.name}
            </p>
          )}
        </div>

        {/* Record Type Selector */}
        {!selectedType && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">What would you like to submit?</h2>
            {recordTypes.length === 0 ? (
              <p className="text-gray-500">No submission types available at this time.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recordTypes.map(rt => (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedType(rt)}
                    className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900">{rt.name}</h3>
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Submit {selectedType.name}</h2>
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change Type
              </button>
            </div>

            {/* Guest info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Your Information (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll only use this to follow up if needed
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic form */}
            {fields.length === 0 ? (
              <p className="text-gray-500">
                Form configuration is incomplete. Please contact the project administrator.
              </p>
            ) : (
              <DynamicForm
                projectSlug={projectSlug}
                recordTypeSlug={selectedType.slug}
                mode="guest"
                fields={fields}
                groups={groups}
                onSubmit={handleSubmit}
                onCancel={() => setSelectedType(null)}
                submitLabel="Submit"
                cancelLabel="Back"
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All submissions will be reviewed before being published.</p>
        </div>
      </div>
    </div>
  );
}
