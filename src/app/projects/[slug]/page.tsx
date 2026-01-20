'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecordType {
  id: number;
  slug: string;
  name: string;
  name_plural: string;
  icon?: string;
  description?: string;
  color?: string;
  guest_form_enabled: boolean;
  requires_review: boolean;
  requires_validation: boolean;
}

interface Project {
  id: number;
  slug: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  memberCount: number;
  recordCount: number;
}

export default function ProjectDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [project, setProject] = useState<Project | null>(null);
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProject();
    }
  }, [status, resolvedParams.slug]);

  async function fetchProject() {
    try {
      const response = await fetch(`/api/projects/${resolvedParams.slug}`);
      
      if (response.status === 404) {
        setError('Project not found');
        setLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch project');
      
      const data = await response.json();
      setProject(data.project);
      setRecordTypes(data.recordTypes);
      setStats(data.stats);
      setRole(data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  const canManage = role === 'owner' || role === 'admin';

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Project not found'}
          </h1>
          <Link href="/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/projects" className="text-blue-600 hover:text-blue-800 text-sm">
            ← All Projects
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <span className={project.is_public ? 'text-green-600' : ''}>
                  {project.is_public ? '🌐 Public' : '🔒 Private'}
                </span>
                <span>•</span>
                <span>{stats?.memberCount || 1} members</span>
                <span>•</span>
                <span>{stats?.recordCount || 0} records</span>
                <span>•</span>
                <span className="capitalize">{role}</span>
              </div>
            </div>
            {canManage && (
              <Link
                href={`/projects/${project.slug}/settings`}
                className="text-gray-500 hover:text-gray-700"
              >
                ⚙️ Settings
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Link
            href={`/projects/${project.slug}/records`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900">View Records</h3>
            <p className="text-sm text-gray-600">Browse all records in this project</p>
          </Link>
          
          <Link
            href={`/projects/${project.slug}/dashboard/review`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">📝</div>
            <h3 className="font-semibold text-gray-900">Review Queue</h3>
            <p className="text-sm text-gray-600">Review pending submissions</p>
          </Link>
          
          <Link
            href={`/projects/${project.slug}/dashboard/validation`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">✅</div>
            <h3 className="font-semibold text-gray-900">Validation Queue</h3>
            <p className="text-sm text-gray-600">Validate reviewed records</p>
          </Link>
        </div>

        {/* Record Types */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Record Types</h2>
              <p className="text-sm text-gray-600">Define the types of data you collect</p>
            </div>
            {canManage && (
              <Link
                href={`/projects/${project.slug}/record-types/new`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                + Add Record Type
              </Link>
            )}
          </div>

          {recordTypes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No record types yet</h3>
              <p className="text-gray-600 mb-4">
                Create record types to define what data you&apos;ll collect.
              </p>
              {canManage && (
                <Link
                  href={`/projects/${project.slug}/record-types/new`}
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Create First Record Type
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recordTypes.map((rt) => (
                <Link
                  key={rt.id}
                  href={`/projects/${project.slug}/record-types/${rt.slug}`}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{rt.icon || '📄'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{rt.name}</h3>
                      {rt.description && (
                        <p className="text-sm text-gray-600">{rt.description}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {rt.guest_form_enabled && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            Guest Form
                          </span>
                        )}
                        {rt.requires_review && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Review
                          </span>
                        )}
                        {rt.requires_validation && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            Validation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-gray-400">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Team Section */}
        {canManage && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Team</h2>
              <Link
                href={`/projects/${project.slug}/team`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Manage Team →
              </Link>
            </div>
            <p className="text-gray-600 text-sm">
              Invite reviewers, validators, and analysts to collaborate on this project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
