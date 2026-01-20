'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecordType {
  id: number;
  slug: string;
  name: string;
  name_plural: string;
  description: string;
  guest_form_enabled: boolean;
  requires_review: boolean;
  requires_validation: boolean;
  record_count?: number;
}

interface Project {
  id: number;
  slug: string;
  name: string;
}

export default function RecordTypePage({ 
  params 
}: { 
  params: Promise<{ slug: string; type: string }> 
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [recordType, setRecordType] = useState<RecordType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    params.then(({ slug, type }) => {
      // Fetch project
      fetch(`/api/projects/${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.project) {
            setProject(data.project);
            return fetch(`/api/projects/${slug}/record-types`);
          }
        })
        .then(res => res?.json())
        .then(data => {
          if (data.recordTypes) {
            const rt = data.recordTypes.find((r: RecordType) => r.slug === type);
            if (rt) {
              setRecordType(rt);
            }
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading record type:', err);
          setLoading(false);
        });
    });
  }, [params]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!project || !recordType) {
    return <div className="min-h-screen flex items-center justify-center">Record type not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/projects" className="hover:text-black">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${project.slug}`} className="hover:text-black">{project.name}</Link>
            <span>/</span>
            <span className="text-black">{recordType.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{recordType.name}</h1>
          {recordType.description && (
            <p className="text-gray-600 mt-1">{recordType.description}</p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Total Records</h3>
            <p className="text-3xl font-bold">{recordType.record_count || 0}</p>
          </div>
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Guest Submissions</h3>
            <p className="text-3xl font-bold">
              {recordType.guest_form_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Workflow</h3>
            <p className="text-sm">
              {recordType.requires_review && 'Review → '}
              {recordType.requires_validation && 'Validation'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Manage {recordType.name}</h2>
          
          <div className="space-y-3">
            <Link
              href={`/projects/${project.slug}/record-types/${recordType.slug}/fields`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h3 className="font-medium">Configure Fields</h3>
              <p className="text-sm text-gray-600">Define custom fields for this record type</p>
            </Link>

            <Link
              href={`/projects/${project.slug}/records?type=${recordType.slug}`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h3 className="font-medium">View Records</h3>
              <p className="text-sm text-gray-600">See all {recordType.name_plural || recordType.name + 's'}</p>
            </Link>

            <Link
              href={`/projects/${project.slug}/records/new?type=${recordType.slug}`}
              className="block p-4 border rounded hover:bg-gray-50 bg-black text-white"
            >
              <h3 className="font-medium">Create New Record</h3>
              <p className="text-sm text-gray-300">Add a new {recordType.name}</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
