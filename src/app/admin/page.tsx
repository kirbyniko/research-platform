'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import DocumentAnalyzer from '@/components/DocumentAnalyzer';

interface Document {
  id: number;
  filename: string;
  original_filename: string;
  page_count: number;
  case_id: string | null;
  case_name?: string;
  document_type: string;
  processed: boolean;
  quote_count: number;
  pending_quotes: number;
  uploaded_at: string;
}

interface VerificationData {
  summary: {
    cases: { total: number; verified: number; unverified: number };
    timeline: { total: number; verified: number; unverified: number };
    sources: { total: number; verified: number; unverified: number };
    discrepancies: { total: number; verified: number; unverified: number };
  };
  cases: Array<{ 
    id: string | number; 
    name?: string; 
    date_of_death?: string;
    verified?: boolean;
    verified_by?: string;
  }>;
  timeline: Array<{ 
    id: string | number; 
    date?: string; 
    event?: string;
    verified?: boolean;
    verified_by?: string;
    case_name?: string;
  }>;
  sources: Array<{ 
    id: string | number; 
    name?: string; 
    title?: string;
    url?: string;
    publisher?: string;
    verified?: boolean;
    verified_by?: string;
    case_name?: string;
  }>;
  discrepancies: Array<{ 
    id: string | number; 
    description?: string;
    ice_claim?: string;
    counter_evidence?: string;
    verified?: boolean;
    verified_by?: string;
    case_name?: string;
  }>;
}

interface UserData {
  id: string | number;
  email: string;
  name?: string;
  role: string;
}

// Inner component that uses the hooks
function AdminDashboard() {
  const { data: session, status } = useSession();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'cases' | 'timeline' | 'sources' | 'discrepancies' | 'documents' | 'analyze'>('cases');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  // Use ref to prevent re-running auth logic during same mount
  const authCheckStarted = useRef(false);
  const fetchStarted = useRef(false);

  // Log every render
  console.log('=== AdminDashboard RENDER ===', {
    status,
    hasSession: !!session,
    authCheckStarted: authCheckStarted.current,
    hasUser: !!user
  });

  useEffect(() => {
    // Wait for NextAuth to finish loading
    if (status === 'loading') {
      console.log('[Admin] Still loading session...');
      return;
    }
    
    // Prevent running auth check multiple times
    if (authCheckStarted.current) {
      console.log('[Admin] Auth check already started, skipping');
      return;
    }
    authCheckStarted.current = true;
    
    console.log('[Admin] Auth check starting, status:', status);
    
    // If not authenticated, redirect to login
    if (status === 'unauthenticated') {
      console.log('[Admin] NOT AUTHENTICATED - redirecting to login');
      window.location.href = '/auth/login';
      return;
    }
    
    // User is authenticated - fetch their role from our database
    if (!session?.user) {
      console.log('[Admin] No session user');
      setError('Session error - please try logging in again');
      setLoading(false);
      return;
    }
    
    // Prevent double fetch
    if (fetchStarted.current) {
      console.log('[Admin] Fetch already started');
      return;
    }
    fetchStarted.current = true;
    
    console.log('[Admin] Fetching user role from backend...');
    
    // Get user role from our backend
    fetch('/api/auth/me')
      .then(res => {
        console.log('[Admin] Backend response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(responseData => {
        console.log('[Admin] Backend response:', JSON.stringify(responseData));
        if (responseData.error) {
          setError(responseData.error);
          setLoading(false);
          return;
        }
        if (responseData.user) {
          console.log('[Admin] Got user:', responseData.user.email, 'role:', responseData.user.role);
          if (responseData.user.role !== 'admin' && responseData.user.role !== 'editor') {
            alert('You do not have permission to access the admin dashboard.');
            window.location.href = '/';
            return;
          }
          console.log('[Admin] User authorized, loading dashboard data');
          setUser(responseData.user);
          fetchDashboardData();
        } else {
          setError('No user data returned');
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('[Admin] Failed to get user role:', err);
        setError('Failed to verify permissions: ' + err.message);
        setLoading(false);
      });
  }, [status, session]);

  const fetchDashboardData = async () => {
    console.log('[Admin] Fetching dashboard data...');
    try {
      const res = await fetch('/api/verify');

      console.log('[Admin] Dashboard data response:', res.status);
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Session expired - please log in again');
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const dashboardData = await res.json();
      console.log('[Admin] Dashboard data loaded, cases:', dashboardData.cases?.length);
      setData(dashboardData);
      
      // Also fetch documents
      fetchDocuments();
    } catch (err) {
      console.error('[Admin] Dashboard fetch error:', err);
      setError('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('[Admin] Failed to fetch documents:', err);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedCaseId) {
        formData.append('caseId', selectedCaseId);
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        alert(`Document uploaded! ID: ${data.document.id}, Pages: ${data.document.pageCount}`);
        fetchDocuments();
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (err) {
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploadingDoc(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleVerify = async (type: string, id: string | number, currentVerified: boolean = false) => {
    setVerifying(`${type}-${id}`);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, id, verified: !currentVerified }),
      });

      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setVerifying(null);
    }
  };

  const handleLogout = async () => {
    console.log('[Admin] Logging out...');
    try {
      await signOut({ redirect: false });
      console.log('[Admin] NextAuth logout successful');
      window.location.href = '/';
    } catch (err) {
      console.error('[Admin] Logout error:', err);
      // Force redirect anyway
      window.location.href = '/';
    }
  };

  if (status === 'loading' || loading) {
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Admin: Data Verification</h1>
            <p className="text-sm text-gray-600">Logged in as {user?.email} ({user?.role})</p>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-black">
              View Site
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin/users" className="text-sm text-gray-600 hover:text-black">
                Manage Users
              </Link>
            )}
            <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-black">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 border border-gray-200">
              <h3 className="text-sm text-gray-500 uppercase">Cases</h3>
              <p className="text-2xl font-bold">{data.summary.cases.verified} / {data.summary.cases.total}</p>
              <p className="text-sm text-red-600">{data.summary.cases.unverified} unverified</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <h3 className="text-sm text-gray-500 uppercase">Timeline Events</h3>
              <p className="text-2xl font-bold">{data.summary.timeline.verified} / {data.summary.timeline.total}</p>
              <p className="text-sm text-red-600">{data.summary.timeline.unverified} unverified</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <h3 className="text-sm text-gray-500 uppercase">Sources</h3>
              <p className="text-2xl font-bold">{data.summary.sources.verified} / {data.summary.sources.total}</p>
              <p className="text-sm text-red-600">{data.summary.sources.unverified} unverified</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <h3 className="text-sm text-gray-500 uppercase">Discrepancies</h3>
              <p className="text-2xl font-bold">{data.summary.discrepancies.verified} / {data.summary.discrepancies.total}</p>
              <p className="text-sm text-red-600">{data.summary.discrepancies.unverified} unverified</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <div className="flex gap-4">
            {(['cases', 'timeline', 'sources', 'discrepancies', 'documents', 'analyze'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 border-b-2 ${
                  activeTab === tab 
                    ? 'border-black font-medium' 
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                {tab === 'analyze' ? 'AI Analyzer' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'documents' && documents.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                    {documents.filter(d => d.pending_quotes > 0).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {data && (
          <div className="bg-white border border-gray-200">
            {activeTab === 'cases' && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Date of Death</th>
                    <th className="text-left p-3">Verified By</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cases.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {item.verified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-red-600">✗ Unverified</span>
                        )}
                      </td>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3">{item.date_of_death?.split('T')[0]}</td>
                      <td className="p-3 text-gray-500">{item.verified_by || '-'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleVerify('case', item.id, item.verified)}
                          disabled={verifying === `case-${item.id}`}
                          className="text-sm underline hover:no-underline disabled:opacity-50"
                        >
                          {item.verified ? 'Unverify' : 'Mark Verified'}
                        </button>
                        {' | '}
                        <Link href={`/cases/${item.id}`} className="text-sm underline hover:no-underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'timeline' && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Case</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Event</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {item.verified ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="p-3">{item.case_name}</td>
                      <td className="p-3">{item.date?.split('T')[0]}</td>
                      <td className="p-3 max-w-md truncate">{item.event}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleVerify('timeline', item.id, item.verified)}
                          disabled={verifying === `timeline-${item.id}`}
                          className="text-sm underline hover:no-underline disabled:opacity-50"
                        >
                          {item.verified ? 'Unverify' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'sources' && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Case</th>
                    <th className="text-left p-3">Publisher</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {item.verified ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="p-3">{item.case_name}</td>
                      <td className="p-3">{item.publisher}</td>
                      <td className="p-3 max-w-md truncate">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">
                          {item.title}
                        </a>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleVerify('source', item.id, item.verified)}
                          disabled={verifying === `source-${item.id}`}
                          className="text-sm underline hover:no-underline disabled:opacity-50"
                        >
                          {item.verified ? 'Unverify' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'discrepancies' && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Case</th>
                    <th className="text-left p-3">ICE Claim</th>
                    <th className="text-left p-3">Counter-Evidence</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.discrepancies.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {item.verified ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="p-3">{item.case_name}</td>
                      <td className="p-3 max-w-xs truncate">{item.ice_claim}</td>
                      <td className="p-3 max-w-xs truncate">{item.counter_evidence}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleVerify('discrepancy', item.id, item.verified)}
                          disabled={verifying === `discrepancy-${item.id}`}
                          className="text-sm underline hover:no-underline disabled:opacity-50"
                        >
                          {item.verified ? 'Unverify' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'documents' && (
              <div className="p-4">
                {/* Upload Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-3">Upload New Document</h3>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">Link to Case (optional)</label>
                      <select
                        value={selectedCaseId || ''}
                        onChange={(e) => setSelectedCaseId(e.target.value || null)}
                        className="w-full border border-gray-300 p-2 text-sm rounded"
                      >
                        <option value="">-- No case selected --</option>
                        {data?.cases.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.date_of_death?.split('T')[0]})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">PDF File</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDoc}
                        className="text-sm"
                      />
                    </div>
                    {uploadingDoc && <span className="text-sm text-gray-500">Uploading...</span>}
                  </div>
                </div>

                {/* Documents List */}
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Filename</th>
                      <th className="text-left p-3">Case</th>
                      <th className="text-left p-3">Pages</th>
                      <th className="text-left p-3">Quotes</th>
                      <th className="text-left p-3">Uploaded</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No documents uploaded yet. Upload a PDF above to get started.
                        </td>
                      </tr>
                    ) : documents.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          {doc.processed ? (
                            doc.pending_quotes > 0 ? (
                              <span className="text-yellow-600">● {doc.pending_quotes} pending</span>
                            ) : (
                              <span className="text-green-600">✓ Done</span>
                            )
                          ) : (
                            <span className="text-gray-400">Not processed</span>
                          )}
                        </td>
                        <td className="p-3 font-medium">{doc.original_filename || doc.filename}</td>
                        <td className="p-3">{doc.case_name || '-'}</td>
                        <td className="p-3">{doc.page_count}</td>
                        <td className="p-3">{doc.quote_count || 0}</td>
                        <td className="p-3 text-gray-500">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 space-x-2">
                          <Link
                            href={`/admin/verify/${doc.id}`}
                            className="text-sm underline hover:no-underline text-blue-600"
                          >
                            Verify
                          </Link>
                          <a
                            href={`/api/documents/${doc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline hover:no-underline"
                          >
                            View PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'analyze' && (
              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Select Case to Analyze Document For</label>
                  <select
                    value={selectedCaseId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('[Admin] Selected case ID:', value);
                      setSelectedCaseId(value || null);
                    }}
                    className="w-full border border-gray-300 p-2 text-sm"
                  >
                    <option value="">-- Select a case --</option>
                    {data.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.date_of_death?.split('T')[0]})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Current selection: {selectedCaseId || 'None'}
                  </p>
                </div>

                {selectedCaseId ? (
                  <DocumentAnalyzer 
                    caseId={selectedCaseId}
                    onComplete={(result) => {
                      console.log('Analysis complete:', result);
                      // Refresh data to show new items
                      fetchDashboardData();
                    }}
                  />
                ) : (
                  <p className="text-sm text-gray-500">Select a case above to begin document analysis</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Export AdminDashboard directly - AuthProvider is now at root layout
export default AdminDashboard;
