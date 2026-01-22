'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Verifier {
  id: number;
  email: string;
  name: string | null;
  is_verifier: boolean;
  verifier_since: string | null;
  verifier_specialty: string[] | null;
  verifier_max_concurrent: number;
  verifier_notes: string | null;
  current_assigned: number;
  total_completed: number;
  avg_hours: number | null;
}

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

const SPECIALTIES = [
  { value: 'legal', label: 'Legal / Court Records' },
  { value: 'medical', label: 'Medical / Health' },
  { value: 'government', label: 'Government / Policy' },
  { value: 'immigration', label: 'Immigration / ICE' },
  { value: 'journalism', label: 'Journalism / Media' },
  { value: 'academic', label: 'Academic Research' },
  { value: 'financial', label: 'Financial / Corporate' },
  { value: 'general', label: 'General Verification' },
];

export default function VerifierManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifiers, setVerifiers] = useState<Verifier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Add verifier modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['general']);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Edit modal
  const [editingVerifier, setEditingVerifier] = useState<Verifier | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [verifiersRes, usersRes] = await Promise.all([
        fetch('/api/admin/verifiers'),
        fetch('/api/admin/users?limit=1000')
      ]);
      
      if (verifiersRes.status === 403) {
        router.push('/');
        return;
      }
      
      if (!verifiersRes.ok) throw new Error('Failed to load verifiers');
      
      const verifiersData = await verifiersRes.json();
      setVerifiers(verifiersData.verifiers || []);
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVerifier = async () => {
    if (!selectedUserId) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/verifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          specialties: selectedSpecialties,
          maxConcurrent,
          notes
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add verifier');
      }
      
      setShowAddModal(false);
      setSelectedUserId(null);
      setSelectedSpecialties(['general']);
      setMaxConcurrent(5);
      setNotes('');
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add verifier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVerifier = async () => {
    if (!editingVerifier) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verifiers/${editingVerifier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties: selectedSpecialties,
          maxConcurrent,
          notes
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update verifier');
      }
      
      setEditingVerifier(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update verifier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveVerifier = async (verifierId: number) => {
    if (!confirm('Remove verifier access from this user? They will no longer be able to process verification requests.')) return;
    
    try {
      const res = await fetch(`/api/admin/verifiers/${verifierId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove verifier');
      }
      
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove verifier');
    }
  };

  const openEditModal = (verifier: Verifier) => {
    setEditingVerifier(verifier);
    setSelectedSpecialties(verifier.verifier_specialty || ['general']);
    setMaxConcurrent(verifier.verifier_max_concurrent);
    setNotes(verifier.verifier_notes || '');
  };

  // Filter out users who are already verifiers
  const availableUsers = users.filter(u => !verifiers.find(v => v.id === u.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold">Third-Party Verifiers</h1>
              <p className="text-gray-600">Manage users who can perform independent verification</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Add Verifier
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-blue-600">{verifiers.length}</div>
            <div className="text-sm text-gray-600">Total Verifiers</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-green-600">
              {verifiers.filter(v => v.current_assigned < v.verifier_max_concurrent).length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-amber-600">
              {verifiers.reduce((sum, v) => sum + v.current_assigned, 0)}
            </div>
            <div className="text-sm text-gray-600">Active Assignments</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-purple-600">
              {verifiers.reduce((sum, v) => sum + v.total_completed, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Completed</div>
          </div>
        </div>

        {/* Verifiers List */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Active Verifiers</h2>
          </div>
          
          {verifiers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No verifiers configured yet. Add a verifier to start processing verification requests.
            </div>
          ) : (
            <div className="divide-y">
              {verifiers.map(verifier => (
                <div key={verifier.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-emerald-700 font-medium">
                          {(verifier.name || verifier.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{verifier.name || verifier.email}</div>
                        <div className="text-sm text-gray-500">{verifier.email}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(verifier.verifier_specialty || ['general']).map(spec => (
                        <span key={spec} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {SPECIALTIES.find(s => s.value === spec)?.label || spec}
                        </span>
                      ))}
                    </div>
                    
                    {/* Workload */}
                    <div className="text-center min-w-[80px]">
                      <div className={`text-lg font-semibold ${
                        verifier.current_assigned >= verifier.verifier_max_concurrent 
                          ? 'text-red-600' 
                          : verifier.current_assigned > 0 
                            ? 'text-amber-600' 
                            : 'text-green-600'
                      }`}>
                        {verifier.current_assigned}/{verifier.verifier_max_concurrent}
                      </div>
                      <div className="text-xs text-gray-500">Assigned</div>
                    </div>
                    
                    {/* Stats */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-semibold text-gray-700">{verifier.total_completed}</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(verifier)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveVerifier(verifier.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Verifier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Add Third-Party Verifier</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Choose a user...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALTIES.map(spec => (
                    <label key={spec.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSpecialties.includes(spec.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSpecialties([...selectedSpecialties, spec.value]);
                          } else {
                            setSelectedSpecialties(selectedSpecialties.filter(s => s !== spec.value));
                          }
                        }}
                      />
                      {spec.label}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Concurrent Assignments
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 5)}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum verification requests this verifier can handle at once
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Internal notes about this verifier..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAddVerifier}
                disabled={!selectedUserId || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Verifier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Verifier Modal */}
      {editingVerifier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              Edit Verifier: {editingVerifier.name || editingVerifier.email}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALTIES.map(spec => (
                    <label key={spec.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSpecialties.includes(spec.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSpecialties([...selectedSpecialties, spec.value]);
                          } else {
                            setSelectedSpecialties(selectedSpecialties.filter(s => s !== spec.value));
                          }
                        }}
                      />
                      {spec.label}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Concurrent Assignments
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 5)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingVerifier(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVerifier}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
