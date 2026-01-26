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
  const [error, setError] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [recordTypeSlug, setRecordTypeSlug] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    params.then(({ slug, type }) => {
      setProjectSlug(slug);
      setRecordTypeSlug(type);
      Promise.all([
        fetch(`/api/projects/${slug}`).then(r => r.json()),
        fetch(`/api/projects/${slug}/record-types/${type}`).then(r => r.json())
      ])
        .then(([projectData, recordTypeData]) => {
          if (projectData.project) setProject(projectData.project);
          else if (projectData.error) setError(projectData.error);
          
          if (recordTypeData.recordType) {
            // Merge recordCount into recordType
            setRecordType({
              ...recordTypeData.recordType,
              record_count: recordTypeData.recordCount
            });
          }
          else if (recordTypeData.error) setError(recordTypeData.error);

          // Check if user can delete record types
          if (recordTypeData.can_delete) {
            setCanDelete(recordTypeData.can_delete);
          }
          
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    });
  }, [params]);

  const handleDelete = async () => {
    const recordCount = recordType?.record_count || 0;
    const confirmMessage = recordCount > 0
      ? `Are you sure you want to delete "${recordType?.name}" record type and ALL ${recordCount} record${recordCount !== 1 ? 's' : ''}? This action cannot be undone.`
      : `Are you sure you want to delete the "${recordType?.name}" record type? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/projects/${projectSlug}/record-types/${recordTypeSlug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete record type');
      }

      // Redirect back to project
      router.push(`/projects/${projectSlug}`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete record type');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  if (!project || !recordType) {
    return <div className="min-h-screen flex items-center justify-center">Record type not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Total Records</h3>
            <p className="text-3xl font-bold">{recordType.record_count || 0}</p>
          </div>
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Guest Submissions</h3>
            <p className="text-lg font-medium">
              {recordType.guest_form_enabled ? '✓ Enabled' : '✗ Disabled'}
            </p>
          </div>
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Workflow</h3>
            <p className="text-sm">
              {recordType.requires_review && <span className="mr-2">📋 Review</span>}
              {recordType.requires_validation && <span>✓ Validation</span>}
              {!recordType.requires_review && !recordType.requires_validation && 'Direct publish'}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Manage {recordType.name}</h2>
          
          <div className="space-y-3">
            <Link
              href={`/projects/${project.slug}/record-types/${recordType.slug}/fields`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h3 className="font-medium">⚙️ Configure Fields</h3>
              <p className="text-sm text-gray-600">Define custom fields for this record type</p>
            </Link>

            <Link
              href={`/projects/${project.slug}/record-types/${recordType.slug}/settings`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h3 className="font-medium">🔧 Advanced Settings</h3>
              <p className="text-sm text-gray-600">Configure forms, quotes, and validation requirements</p>
            </Link>

            <Link
              href={`/projects/${project.slug}/record-types/${recordType.slug}/templates`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h3 className="font-medium">🎨 Display Templates</h3>
              <p className="text-sm text-gray-600">Customize how records are displayed to viewers</p>
            </Link>

            <Link
              href={`/projects/${project.slug}/records?type=${recordType.slug}`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h3 className="font-medium">📄 View Records</h3>
              <p className="text-sm text-gray-600">See all {recordType.name_plural || recordType.name + 's'}</p>
            </Link>

            <Link
              href={`/projects/${project.slug}/records/new?type=${recordType.slug}`}
              className="block p-4 border rounded hover:bg-gray-50 bg-black text-white"
            >
              <h3 className="font-medium">➕ Create New Record</h3>
              <p className="text-sm text-gray-300">Add a new {recordType.name}</p>
            </Link>

            {canDelete && (
              <div className="pt-4 border-t">
                {deleteError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                    {deleteError}
                  </div>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="block w-full p-4 border-2 border-red-300 rounded hover:bg-red-50 text-red-600 font-medium disabled:opacity-50"
                >
                  🗑️ {deleting ? 'Deleting...' : 'Delete Record Type'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
