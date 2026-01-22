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

interface VerificationRequest {
  id: number;
  project_id: number;
  record_id: number;
  requested_by: number;
  requested_at: string;
  priority: string;
  request_notes: string | null;
  verification_scope: string;
  status: string;
  assigned_to: number | null;
  project_name: string;
  project_slug: string;
  record_type_name: string;
  requested_by_email: string;
  assigned_to_email: string | null;
  record_data: Record<string, unknown>;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<VerificationRequest[]>([]);
  const [verificationCounts, setVerificationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'users' | 'verification' | 'activity'>('projects');

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
        setUsers(usersData.users || []);
      }

      // Load verification queue
      const verificationRes = await fetch('/api/admin/verification-queue');
      if (verificationRes.ok) {
        const verificationData = await verificationRes.json();
        setVerificationQueue(verificationData.requests || []);
        setVerificationCounts(verificationData.counts || {});
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
            {(['projects', 'users', 'verification', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 border-b-2 flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'border-black font-medium' 
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'verification' && (verificationCounts.pending || 0) > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                    {verificationCounts.pending}
                  </span>
                )}
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
                <div className="py-8 text-center">
                  <p className="text-gray-500 mb-2">No users found.</p>
                  <p className="text-sm text-gray-400">Users are created through authentication. Manage user roles within individual projects.</p>
                </div>
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
                            <span className="text-sm text-gray-400">
                              {/* Manage functionality coming soon */}
                            </span>
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

          {activeTab === 'verification' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold">3rd Party Verification Queue</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Review and verify research data submitted by project teams
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href="/admin/verifiers"
                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                  >
                    Manage Verifiers
                  </Link>
                  <div className="flex gap-2 text-sm">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded">
                      {verificationCounts.pending || 0} Pending
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                      {verificationCounts.in_progress || 0} In Progress
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded">
                      {verificationCounts.completed || 0} Completed
                    </span>
                  </div>
                </div>
              </div>

              {verificationQueue.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">✓</div>
                  <p className="font-medium">No verification requests</p>
                  <p className="text-sm mt-1">All caught up! Check back later.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verificationQueue.map((req) => (
                    <div 
                      key={req.id} 
                      className={`border rounded-lg p-4 ${
                        req.priority === 'urgent' ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {req.priority === 'urgent' && (
                              <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">
                                URGENT
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              req.verification_scope === 'record' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {req.verification_scope === 'record' ? 'Full Record' : 'Data Items'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              req.status === 'completed' ? 'bg-green-100 text-green-800' :
                              req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {req.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="font-medium">
                            {req.project_name} → {req.record_type_name} #{req.record_id}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Requested by {req.requested_by_email} on {new Date(req.requested_at).toLocaleDateString()}
                          </p>
                          {req.request_notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              &ldquo;{req.request_notes}&rdquo;
                            </p>
                          )}
                          {req.assigned_to_email && (
                            <p className="text-sm text-blue-600 mt-1">
                              Assigned to: {req.assigned_to_email}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/verification/${req.id}`}
                            className="px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800"
                          >
                            {req.status === 'pending' ? 'Review' : 'View'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
