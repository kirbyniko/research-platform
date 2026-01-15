'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ApiKey {
  id: number;
  key_prefix: string;
  name: string;
  permissions: string[];
  expires_at: string;
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
}

interface UserInfo {
  id: number;
  email: string;
  role: string;
}

export default function AccountPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDays, setNewKeyDays] = useState(30);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch('/api/keys');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/auth/login?redirect=/account';
          return;
        }
        throw new Error('Failed to fetch keys');
      }
      const data = await res.json();
      setKeys(data.keys || []);
      setUser(data.user);
    } catch (err) {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    setCreating(true);
    setError('');
    setCreatedKey(null);
    
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays: newKeyDays
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create key');
      }
      
      setCreatedKey(data.key);
      setNewKeyName('');
      fetchKeys();
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: number) {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/keys?id=${keyId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        throw new Error('Failed to revoke key');
      }
      
      fetchKeys();
    } catch (err) {
      setError('Failed to revoke key');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <Link href="/" className="text-sm sm:text-base text-blue-600 hover:underline">← Back to Home</Link>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Account Settings</h1>
        
        {user && (
          <div className="mb-6 sm:mb-8 bg-white p-4 rounded-lg shadow">
            <p className="text-sm sm:text-base text-gray-600">Signed in as: <strong className="break-all">{user.email}</strong></p>
            <p className="text-sm sm:text-base text-gray-600">Role: <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs sm:text-sm">{user.role}</span></p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">API Keys</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            API keys allow the browser extension to submit data on your behalf. 
            Keys expire automatically and can be revoked at any time.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}

          {createdKey && (
            <div className="bg-green-50 border border-green-200 p-3 sm:p-4 rounded mb-4">
              <p className="text-sm sm:text-base font-semibold text-green-800 mb-2">🔑 New API Key Created!</p>
              <p className="text-xs sm:text-sm text-green-700 mb-2">
                Copy this key now - you won&apos;t be able to see it again.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <code className="bg-white px-2 sm:px-3 py-2 rounded border flex-1 text-xs sm:text-sm font-mono break-all">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                className="mt-2 text-xs sm:text-sm text-green-600 hover:underline"
              >
                I&apos;ve saved the key
              </button>
            </div>
          )}

          {/* Create new key form */}
          <form onSubmit={createKey} className="mb-6 p-3 sm:p-4 bg-gray-50 rounded">
            <h3 className="text-sm sm:text-base font-medium mb-3">Create New API Key</h3>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Key name (e.g., 'Work Laptop')"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 border rounded"
                required
              />
              <select
                value={newKeyDays}
                onChange={(e) => setNewKeyDays(parseInt(e.target.value))}
                className="px-3 py-2 border rounded"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <button
                type="submit"
                disabled={creating || !newKeyName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </form>

          {/* List of keys */}
          <div className="space-y-3">
            {keys.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No API keys yet. Create one to use with the extension.</p>
            ) : (
              keys.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 border rounded ${
                    key.revoked ? 'bg-gray-100 border-gray-300' :
                    isExpired(key.expires_at) ? 'bg-red-50 border-red-200' :
                    'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {key.name}
                        {key.revoked && <span className="ml-2 text-sm text-gray-500">(Revoked)</span>}
                        {!key.revoked && isExpired(key.expires_at) && (
                          <span className="ml-2 text-sm text-red-500">(Expired)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">{key.key_prefix}...</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>Created: {formatDate(key.created_at)}</span>
                        <span>Expires: {formatDate(key.expires_at)}</span>
                        <span>Last used: {formatDate(key.last_used_at)}</span>
                      </div>
                      <div className="mt-2">
                        {key.permissions?.map((perm: string) => (
                          <span key={perm} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!key.revoked && (
                      <button
                        onClick={() => revokeKey(key.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Role information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Permissions</h2>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-medium">User</p>
              <p className="text-gray-600">Can submit new cases via extension</p>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium">Analyst</p>
              <p className="text-gray-600">Can submit, verify cases, and analyze documents</p>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <p className="font-medium">Admin</p>
              <p className="text-gray-600">Full access - manage users, publish cases</p>
            </div>
          </div>
          {user?.role === 'user' && (
            <p className="mt-4 text-sm text-gray-500">
              Want to become an analyst? Contact an administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
