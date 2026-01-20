'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

interface UserData {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  created_by: string;
  creator_name?: string;
  record_count?: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'users' | 'activity'>('projects');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    // Get user role
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        
        if (data.user?.role !== 'admin' && data.user?.role !== 'editor') {
          alert('You do not have permission to access the admin dashboard.');
          router.push('/');
          return;
        }
        
        setUser(data.user);
        loadDashboardData();
      })
      .catch(err => {
        setError('Failed to verify permissions');
        setLoading(false);
      });
  }, [status, router]);

  const loadDashboardData = async () => {
    try {
      // Load projects
      const projectsRes = await fetch('/api/projects');
      const projectsData = await projectsRes.json();
      if (projectsData.success) {
        setProjects(projectsData.projects || []);
      }

      // Load users (admin only)
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setUsers(usersData.users || []);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Research Platform - Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Logged in as {user?.email} ({user?.role})</p>
            </div>
            <div className="flex gap-4">
              <Link href="/" className="text-sm text-gray-600 hover:text-black">
                Home
              </Link>
              <Link href="/projects" className="text-sm text-gray-600 hover:text-black">
                Projects
              </Link>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-black">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Total Projects</h3>
            <p className="text-3xl font-bold">{projects.length}</p>
          </div>
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Total Users</h3>
            <p className="text-3xl font-bold">{users.length}</p>
          </div>
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <h3 className="text-sm text-gray-500 uppercase mb-2">Total Records</h3>
            <p className="text-3xl font-bold">
              {projects.reduce((sum, p) => sum + (p.record_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-4">
            {(['projects', 'users', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 border-b-2 ${
                  activeTab === tab 
                    ? 'border-black font-medium' 
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {activeTab === 'projects' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">All Projects</h2>
                <Link 
                  href="/projects/new"
                  className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800"
                >
                  Create Project
                </Link>
              </div>
              
              {projects.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No projects yet. Create your first project to get started.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Project Name</th>
                      <th className="text-left p-3">Created By</th>
                      <th className="text-left p-3">Records</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{project.name}</div>
                            {project.description && (
                              <div className="text-xs text-gray-500 mt-1">{project.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-gray-600">{project.creator_name || project.created_by}</td>
                        <td className="p-3">{project.record_count || 0}</td>
                        <td className="p-3 text-gray-500">
                          {new Date(project.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <Link
                            href={`/projects/${project.slug}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">User Management</h2>
              
              {users.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No users found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{u.email}</td>
                        <td className="p-3">{u.name || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            u.role === 'admin' ? 'bg-red-100 text-red-800' :
                            u.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {user?.role === 'admin' && (
                            <Link
                              href={`/admin/users/${u.id}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Manage
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <p className="text-gray-500">Activity tracking coming soon...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
