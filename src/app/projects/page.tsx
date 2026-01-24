'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: number;
  slug: string;
  name: string;
  description?: string;
  is_public: boolean;
  role: string;
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router]);

  async function fetchProjects() {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      console.log('[ProjectsPage] API response:', data);
      
      if (Array.isArray(data.projects)) {
        const validProjects = data.projects.filter((p: any) => p && typeof p === 'object' && p.id);
        setProjects(validProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('[ProjectsPage] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-1">Manage your research investigations</p>
          </div>
          <Link
            href="/projects/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + New Project
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first research project to start collecting and verifying data.
            </p>
            <Link
              href="/projects/new"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.filter(p => p && p.id && p.slug).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">{project.name || 'Unnamed'}</h2>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                    project.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                    project.role === 'reviewer' ? 'bg-green-100 text-green-700' :
                    project.role === 'validator' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {project.role || 'member'}
                  </span>
                </div>
                
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className={`flex items-center gap-1 ${project.is_public ? 'text-green-600' : 'text-gray-500'}`}>
                    {project.is_public ? '🌐 Public' : '🔒 Private'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
