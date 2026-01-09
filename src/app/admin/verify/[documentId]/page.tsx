'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QuoteCard from '@/components/verification/QuoteCard';
import { ExtensionBridge } from '@/components/ExtensionBridge';
import type { Quote } from '@/components/verification/PDFViewer';

interface Document {
  id: number;
  filename: string;
  original_filename: string;
  page_count: number;
  case_id: string | null;
  case_name?: string;
  document_type: string;
  processed: boolean;
}

export default function VerificationPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.documentId as string;
  const { data: session, status } = useSession();

  const [document, setDocument] = useState<Document | null>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [extracting, setExtracting] = useState(false);
  
  // Case field verification state
  const [verifiedFields, setVerifiedFields] = useState<Record<string, boolean>>({
    name: false,
    dateOfDeath: false,
    age: false,
    country: false,
    facility: false,
    location: false,
    causeOfDeath: false
  });
  
  // Editable case field values
  const [caseFields, setCaseFields] = useState({
    name: '',
    dateOfDeath: '',
    age: '',
    country: '',
    facility: '',
    location: '',
    causeOfDeath: '',
    iceStatement: '',
    sourceUrls: ''
  });

  // Helper to get auth headers (NextAuth handles cookies automatically)
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    return headers;
  }, []);

  // Load document and quotes
  const loadDocument = useCallback(async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/documents?id=${documentId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load document');
      }
      
      setDocument(data.document);
      setQuotes(data.document.quotes || []);
      
      // Load case data if document is linked to a case
      if (data.document.case_id) {
        try {
          const caseResponse = await fetch(`/api/cases/${data.document.case_id}`, {
            headers: getAuthHeaders()
          });
          const caseData = await caseResponse.json();
          if (caseData.success && caseData.case) {
            setCaseData(caseData.case);
            // Populate case fields
            setCaseFields({
              name: caseData.case.name || '',
              dateOfDeath: caseData.case.date_of_death || '',
              age: caseData.case.age?.toString() || '',
              country: caseData.case.nationality || '',
              facility: caseData.case.facility?.name || '',
              location: caseData.case.facility?.city && caseData.case.facility?.state 
                ? `${caseData.case.facility.city}, ${caseData.case.facility.state}`
                : caseData.case.facility?.state || '',
              causeOfDeath: caseData.case.official_cause_of_death || '',
              iceStatement: '',
              sourceUrls: caseData.case.sources?.map((s: any) => s.url).join('\n') || ''
            });
          }
        } catch (err) {
          console.error('Failed to load case data:', err);
        }
      }
      
      // Select first pending quote
      const firstPending = data.document.quotes?.find((q: Quote) => q.status === 'pending');
      if (firstPending) {
        setSelectedQuoteId(firstPending.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId, getAuthHeaders]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Extract quotes from document
  const handleExtractQuotes = async () => {
    if (!document) return;
    
    try {
      setExtracting(true);
      const response = await fetch('/api/extract-quotes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ documentId: document.id })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract quotes');
      }
      
      // Reload document to get new quotes
      await loadDocument();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to extract quotes');
    } finally {
      setExtracting(false);
    }
  };

  // Update quote status
  const updateQuoteStatus = async (quoteId: number, status: string, rejectionReason?: string) => {
    try {
      // If rejecting, delete the quote instead of marking it rejected
      if (status === 'rejected') {
        const response = await fetch(`/api/quotes/${quoteId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to delete quote');
        }
        
        // Remove from local state
        setQuotes(quotes.filter(q => q.id !== quoteId));
        
        // Move to next pending quote
        const nextPending = quotes.find(q => q.status === 'pending' && q.id !== quoteId);
        if (nextPending) {
          setSelectedQuoteId(nextPending.id);
        } else {
          setSelectedQuoteId(null);
        }
      } else {
        // For accept/verify, update status normally
        const response = await fetch(`/api/quotes/${quoteId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status, rejectionReason })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to update quote');
        }
        
        // Update local state
        setQuotes(quotes.map(q => 
          q.id === quoteId ? { ...q, status: status as Quote['status'] } : q
        ));
        
        // Move to next pending quote
        const nextPending = quotes.find(q => q.status === 'pending' && q.id !== quoteId);
        if (nextPending) {
          setSelectedQuoteId(nextPending.id);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update quote');
    }
  };

  // Filter quotes
  const filteredQuotes = quotes.filter(q => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  // Stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    verified: quotes.filter(q => q.status === 'verified').length,
    rejected: quotes.filter(q => q.status === 'rejected').length
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const currentIndex = quotes.findIndex(q => q.id === selectedQuoteId);
      
      switch (e.key) {
        case 'ArrowUp':
          if (currentIndex > 0) {
            setSelectedQuoteId(filteredQuotes[currentIndex - 1]?.id || null);
          }
          break;
        case 'ArrowDown':
          if (currentIndex < filteredQuotes.length - 1) {
            setSelectedQuoteId(filteredQuotes[currentIndex + 1]?.id || null);
          }
          break;
        case 'a':
          if (selectedQuoteId) {
            updateQuoteStatus(selectedQuoteId, 'verified');
          }
          break;
        case 'r':
          if (selectedQuoteId) {
            const reason = prompt('Rejection reason:');
            if (reason) {
              updateQuoteStatus(selectedQuoteId, 'rejected', reason);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedQuoteId, quotes, filteredQuotes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Document not found'}</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  const pdfUrl = `/api/documents/${documentId}/file`;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-500 hover:text-gray-700 mr-4"
            >
              ← Back
            </button>
            <span className="font-medium">{document.original_filename || document.filename}</span>
            {document.case_name && (
              <span className="ml-2 text-gray-500">• {document.case_name}</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {stats.verified}/{stats.total} verified
            </div>
            <button
              onClick={() => {/* Save all */}}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Save
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 border-r flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">PDF Document</h3>
            <p className="text-gray-600 mb-4">
              Open the PDF in a new tab to view and select quotes
            </p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
            >
              📄 Open PDF
            </a>
          </div>
        </div>

        {/* Quotes Panel */}
        <div className="w-80 flex flex-col bg-white border-r">
          {/* Panel Header */}
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-2">Extracted Quotes</h2>
            
            {/* Extension Bridge */}
            <ExtensionBridge
              documentData={{
                name: caseData?.name || document?.case_name || '',
                dateOfDeath: caseData?.date_of_death || '',
                age: caseData?.age || '',
                country: caseData?.nationality || '',
                facility: caseData?.facility?.name || '',
                location: caseData?.facility?.city && caseData?.facility?.state 
                  ? `${caseData.facility.city}, ${caseData.facility.state}`
                  : caseData?.facility?.state || '',
                causeOfDeath: caseData?.official_cause_of_death || '',
                summary: caseData?.notes || '',
                incidentType: 'death_in_custody',
                sourceUrl: pdfUrl,
                sourceTitle: document?.original_filename || '',
                sourceType: 'document',
                quotes: quotes.map(q => ({
                  text: q.quote_text || '',
                  category: q.category,
                  status: q.status
                }))
              }}
            />
            
            {/* Stats */}
            <div className="flex space-x-4 text-sm mb-3 mt-3">
              <span className="text-yellow-600">● {stats.pending} pending</span>
              <span className="text-green-600">✓ {stats.verified} verified</span>
              <span className="text-red-600">✗ {stats.rejected} rejected</span>
            </div>
            
            {/* Filter */}
            <div className="flex space-x-1">
              {(['all', 'pending', 'verified', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === f 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Extract button if no quotes */}
          {quotes.length === 0 && !document.processed && (
            <div className="p-4 border-b bg-yellow-50">
              <p className="text-sm text-yellow-800 mb-2">
                No quotes extracted yet. Run extraction to analyze this document.
              </p>
              <button
                onClick={handleExtractQuotes}
                disabled={extracting}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                {extracting ? 'Extracting...' : 'Extract Quotes'}
              </button>
            </div>
          )}

          {/* Re-extract button */}
          {document.processed && (
            <div className="p-2 border-b">
              <button
                onClick={handleExtractQuotes}
                disabled={extracting}
                className="w-full px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {extracting ? 'Extracting...' : 'Re-extract Quotes'}
              </button>
            </div>
          )}

          {/* Quotes List */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {filteredQuotes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {filter === 'all' ? 'No quotes found' : `No ${filter} quotes`}
              </p>
            ) : (
              filteredQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  isSelected={quote.id === selectedQuoteId}
                  onSelect={() => setSelectedQuoteId(quote.id)}
                  onAccept={() => updateQuoteStatus(quote.id, 'verified')}
                  onReject={(reason) => updateQuoteStatus(quote.id, 'rejected', reason)}
                  onEdit={() => {/* TODO: Open edit modal */}}
                  onJumpToPdf={() => setSelectedQuoteId(quote.id)}
                />
              ))
            )}
          </div>

          {/* Keyboard shortcuts help */}
          <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
            <strong>Shortcuts:</strong> ↑↓ Navigate • A Accept • R Reject • Enter Jump to PDF
          </div>
        </div>

        {/* Case Fields Panel */}
        <div className="w-80 flex flex-col bg-white overflow-auto">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold">Case Information</h2>
            <p className="text-xs text-gray-500 mt-1">
              {document.case_id ? `Linked to: ${document.case_id}` : 'Not linked to a case'}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={caseFields.name}
                  onChange={(e) => setCaseFields({ ...caseFields, name: e.target.value })}
                  placeholder="Last Name, First Name"
                  className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setVerifiedFields({ ...verifiedFields, name: !verifiedFields.name })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    verifiedFields.name 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={verifiedFields.name ? 'Verified' : 'Click to verify'}
                >
                  {verifiedFields.name ? '✓' : '○'}
                </button>
              </div>
            </div>

            {/* Date of Death */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date of Death *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={caseFields.dateOfDeath}
                  onChange={(e) => setCaseFields({ ...caseFields, dateOfDeath: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setVerifiedFields({ ...verifiedFields, dateOfDeath: !verifiedFields.dateOfDeath })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    verifiedFields.dateOfDeath 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={verifiedFields.dateOfDeath ? 'Verified' : 'Click to verify'}
                >
                  {verifiedFields.dateOfDeath ? '✓' : '○'}
                </button>
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Age *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={caseFields.age}
                  onChange={(e) => setCaseFields({ ...caseFields, age: e.target.value })}
                  placeholder="e.g., 35"
                  className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setVerifiedFields({ ...verifiedFields, age: !verifiedFields.age })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    verifiedFields.age 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={verifiedFields.age ? 'Verified' : 'Click to verify'}
                >
                  {verifiedFields.age ? '✓' : '○'}
                </button>
              </div>
            </div>

            {/* Country of Citizenship */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Country of Citizenship *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={caseFields.country}
                  onChange={(e) => setCaseFields({ ...caseFields, country: e.target.value })}
                  placeholder="e.g., Mexico"
                  className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setVerifiedFields({ ...verifiedFields, country: !verifiedFields.country })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    verifiedFields.country 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={verifiedFields.country ? 'Verified' : 'Click to verify'}
                >
                  {verifiedFields.country ? '✓' : '○'}
                </button>
              </div>
            </div>

            {/* ICE Facility */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ICE Facility *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={caseFields.facility}
                  onChange={(e) => setCaseFields({ ...caseFields, facility: e.target.value })}
                  placeholder="Facility name"
                  className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setVerifiedFields({ ...verifiedFields, facility: !verifiedFields.facility })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    verifiedFields.facility 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={verifiedFields.facility ? 'Verified' : 'Click to verify'}
                >
                  {verifiedFields.facility ? '✓' : '○'}
                </button>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Location (City, State) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={caseFields.location}
                  onChange={(e) => setCaseFields({ ...caseFields, location: e.target.value })}
                  placeholder="e.g., Phoenix, AZ"
                  className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setVerifiedFields({ ...verifiedFields, location: !verifiedFields.location })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    verifiedFields.location 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={verifiedFields.location ? 'Verified' : 'Click to verify'}
                >
                  {verifiedFields.location ? '✓' : '○'}
                </button>
              </div>
            </div>

            {/* Cause of Death */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cause of Death *
              </label>
              <div className="flex gap-2 items-start">
                <textarea
                  value={caseFields.causeOfDeath}
                  onChange={(e) => setCaseFields({ ...caseFields, causeOfDeath: e.target.value })}
                  placeholder="As stated in official records"
                  rows={3}
                  className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setVerifiedFields({ ...verifiedFields, causeOfDeath: !verifiedFields.causeOfDeath })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    verifiedFields.causeOfDeath 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={verifiedFields.causeOfDeath ? 'Verified' : 'Click to verify'}
                >
                  {verifiedFields.causeOfDeath ? '✓' : '○'}
                </button>
              </div>
            </div>

            {/* ICE Statement */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ICE Official Statement
              </label>
              <textarea
                value={caseFields.iceStatement}
                onChange={(e) => setCaseFields({ ...caseFields, iceStatement: e.target.value })}
                placeholder="Verbatim from ICE"
                rows={4}
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Source URLs */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Source URLs
              </label>
              <textarea
                value={caseFields.sourceUrls}
                onChange={(e) => setCaseFields({ ...caseFields, sourceUrls: e.target.value })}
                placeholder="One URL per line"
                rows={3}
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Verification Status */}
            <div className="pt-4 border-t">
              <div className="text-xs text-gray-600 mb-2">
                Verification Status: {Object.values(verifiedFields).filter(Boolean).length} / {Object.keys(verifiedFields).length} fields verified
              </div>
              <div className="flex flex-wrap gap-1 text-xs">
                {Object.entries(verifiedFields).map(([field, verified]) => (
                  <span
                    key={field}
                    className={`px-2 py-1 rounded ${
                      verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {verified ? '✓' : '○'} {field}
                  </span>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              disabled={!Object.values(verifiedFields).every(Boolean)}
              className={`w-full px-4 py-2 rounded font-medium transition-colors ${
                Object.values(verifiedFields).every(Boolean)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!Object.values(verifiedFields).every(Boolean) ? 'Verify all required fields first' : 'Save case information'}
            >
              {Object.values(verifiedFields).every(Boolean) ? 'Save Case Info' : 'Verify All Fields to Save'}
            </button>

            {/* Create New Case */}
            {!document.case_id && (
              <button
                className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                + Create New Case
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-green-500 transition-all"
          style={{ width: `${(stats.verified / stats.total) * 100 || 0}%` }}
        />
      </div>
    </div>
  );
}
