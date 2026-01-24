'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProjectMember, ProjectRole } from '@/types/platform';

const ROLE_INFO: Record<ProjectRole, { label: string; description: string; color: string }> = {
  owner: {
    label: 'Owner',
    description: 'Full control over the project',
    color: 'bg-purple-100 text-purple-800'
  },
  admin: {
    label: 'Admin',
    description: 'Manage all aspects except project deletion',
    color: 'bg-blue-100 text-blue-800'
  },
  reviewer: {
    label: 'Reviewer',
    description: 'Review guest submissions',
    color: 'bg-yellow-100 text-yellow-800'
  },
  validator: {
    label: 'Validator',
    description: 'Validate and verify records',
    color: 'bg-orange-100 text-orange-800'
  },
  analyst: {
    label: 'Analyst',
    description: 'Create and edit records',
    color: 'bg-green-100 text-green-800'
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access',
    color: 'bg-gray-100 text-gray-800'
  }
};

export default function ProjectTeam({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { status } = useSession();
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [editingUploadPerms, setEditingUploadPerms] = useState<number | null>(null);
  const [memberCredits, setMemberCredits] = useState<Record<number, { balance: number; usage_total: number }>>({});
  const [allocatingTo, setAllocatingTo] = useState<number | null>(null);
  const [allocateAmount, setAllocateAmount] = useState<number>(10);

  useEffect(() => {
    params.then(p => setProjectSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (status === 'authenticated' && projectSlug) {
      fetchMembers();
      fetchMemberCredits();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, projectSlug]);

  async function fetchMemberCredits() {
    try {
      const response = await fetch(`/api/projects/${projectSlug}/team/credits`);
      if (response.ok) {
        const data = await response.json();
        const creditsMap: Record<number, any> = {};
        data.members?.forEach((m: any) => {
          creditsMap[m.user_id] = {
            balance: m.balance || 0,
            usage_total: m.usage_total || 0
          };
        });
        setMemberCredits(creditsMap);
      }
    } catch (err) {
      console.error('Failed to fetch member credits:', err);
    }
  }

  async function fetchMembers() {
    try {
      const response = await fetch(`/api/projects/${projectSlug}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = await response.json();
      setMembers(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    setInviteError(null);
    setInviting(true);

    try {
      const response = await fetch(`/api/projects/${projectSlug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member');
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');
      fetchMembers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId: number, newRole: ProjectRole) {
    if (!confirm(`Change member role to ${ROLE_INFO[newRole].label}?`)) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleRemove(memberId: number, memberName: string) {
    if (!confirm(`Remove ${memberName} from the project?`)) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  async function handleToggleUpload(memberId: number, currentValue: boolean) {
    try {
      const response = await fetch(`/api/projects/${projectSlug}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ can_upload: !currentValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update upload permission');
      }

      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update upload permission');
    }
  }

  async function handleToggleAppearances(memberId: number, currentValue: boolean) {
    try {
      const response = await fetch(`/api/projects/${projectSlug}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ can_manage_appearances: !currentValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update appearance permission');
      }

      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update appearance permission');
    }
  }

  async function handleUpdateQuota(memberId: number, quotaMB: number) {
    try {
      const quotaBytes = quotaMB > 0 ? quotaMB * 1024 * 1024 : null;
      const response = await fetch(`/api/projects/${projectSlug}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_quota_bytes: quotaBytes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update quota');
      }

      setEditingUploadPerms(null);
      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update quota');
    }
  }

  async function handleAllocateCredits(userId: number) {
    if (allocateAmount <= 0) {
      alert('Please enter a positive amount');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectSlug}/team/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          amount: allocateAmount,
          reason: 'Manual allocation by project admin'
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.details || 'Failed to allocate credits');
      }

      setAllocatingTo(null);
      setAllocateAmount(10);
      fetchMemberCredits();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to allocate credits');
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{error}</h1>
          <Link href={`/projects/${projectSlug}`} className="text-blue-600 hover:text-blue-800">
            ← Back to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/projects/${projectSlug}`} className="text-blue-600 hover:text-blue-800">
            ← Back to Project
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
              <p className="text-gray-600">Manage who has access to this project</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Invite Member
            </button>
          </div>

          {/* Role Reference */}
          <div className="p-6 bg-blue-50 border-b border-blue-100">
            <h3 className="font-medium text-blue-900 mb-3">Role Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(ROLE_INFO).map(([role, info]) => (
                <div key={role} className="bg-white rounded p-3 border border-blue-200">
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${info.color} mb-1`}>
                    {info.label}
                  </div>
                  <p className="text-xs text-gray-600">{info.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Members List */}
          <div className="divide-y divide-gray-200">
            {members.map(member => (
              <div key={member.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {member.user?.image ? (
                      <img
                        src={member.user.image}
                        alt={member.user.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                        {member.user?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{member.user?.name}</div>
                      <div className="text-sm text-gray-500">{member.user?.email}</div>
                      {member.invited_at && (
                        <div className="text-xs text-gray-400 mt-1">
                          Joined {new Date(member.invited_at).toLocaleDateString()}
                        </div>
                      )}
                      
                      {/* Upload Permissions */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`upload-${member.id}`}
                            checked={member.can_upload || false}
                            onChange={() => handleToggleUpload(member.id, member.can_upload || false)}
                            disabled={member.role === 'owner'}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <label htmlFor={`upload-${member.id}`} className="text-sm text-gray-700">
                            Can upload files
                          </label>
                        </div>
                        
                        {member.can_upload && (
                          <div className="ml-6">
                            {editingUploadPerms === member.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  placeholder="MB (0 = unlimited)"
                                  defaultValue={member.upload_quota_bytes ? Math.round(member.upload_quota_bytes / (1024 * 1024)) : 0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const mb = parseInt((e.target as HTMLInputElement).value) || 0;
                                      handleUpdateQuota(member.id, mb);
                                    } else if (e.key === 'Escape') {
                                      setEditingUploadPerms(null);
                                    }
                                  }}
                                  className="w-24 px-2 py-1 border rounded text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    const input = document.querySelector(`input[type="number"]`) as HTMLInputElement;
                                    const mb = parseInt(input?.value) || 0;
                                    handleUpdateQuota(member.id, mb);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingUploadPerms(null)}
                                  className="text-xs text-gray-600 hover:text-gray-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingUploadPerms(member.id)}
                                className="text-xs text-gray-600 hover:text-blue-600"
                              >
                                Quota: {member.upload_quota_bytes 
                                  ? `${Math.round(member.upload_quota_bytes / (1024 * 1024))} MB`
                                  : 'Unlimited'} (click to edit)
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Appearance Permissions */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`appearances-${member.id}`}
                            checked={member.can_manage_appearances || false}
                            onChange={() => handleToggleAppearances(member.id, member.can_manage_appearances || false)}
                            disabled={member.role === 'owner' || member.role === 'admin'}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <label htmlFor={`appearances-${member.id}`} className="text-sm text-gray-700">
                            Can manage display templates
                          </label>
                          {(member.role === 'owner' || member.role === 'admin') && (
                            <span className="text-xs text-gray-400">(automatic)</span>
                          )}
                        </div>

                        {/* AI Credits */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-700">AI Credits: </span>
                              <span className="text-sm text-gray-900 font-semibold">
                                {memberCredits[member.user_id]?.balance || 0}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({memberCredits[member.user_id]?.usage_total || 0} used)
                              </span>
                            </div>
                            {(member.role !== 'owner') && (
                              allocatingTo === member.user_id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={allocateAmount}
                                    onChange={(e) => setAllocateAmount(parseInt(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border rounded text-sm"
                                    placeholder="Amount"
                                  />
                                  <button
                                    onClick={() => handleAllocateCredits(member.user_id)}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                  >
                                    Give
                                  </button>
                                  <button
                                    onClick={() => setAllocatingTo(null)}
                                    className="text-xs text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAllocatingTo(member.user_id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Allocate Credits
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.role === 'owner' ? (
                      <span className={`px-3 py-1 rounded text-sm font-medium ${ROLE_INFO[member.role].color}`}>
                        {ROLE_INFO[member.role].label}
                      </span>
                    ) : (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value as ProjectRole)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="analyst">Analyst</option>
                          <option value="validator">Validator</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemove(member.id, member.user?.name || 'this member')}
                          className="text-red-600 hover:text-red-800 px-3 py-1 text-sm"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {members.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
              <p className="text-gray-600 mb-4">Invite collaborators to work on this project.</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Invite First Member
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
            </div>

            <div className="p-6 space-y-4">
              {inviteError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{inviteError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  They must already have an account on this platform.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="viewer">Viewer - Read-only access</option>
                  <option value="reviewer">Reviewer - Review submissions</option>
                  <option value="analyst">Analyst - Create & edit records</option>
                  <option value="validator">Validator - Verify records</option>
                  <option value="admin">Admin - Full management access</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError(null);
                  setInviteEmail('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {inviting ? 'Inviting...' : 'Invite Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
