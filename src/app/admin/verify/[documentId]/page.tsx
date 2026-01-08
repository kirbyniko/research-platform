'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@descope/nextjs-sdk/client';
import PDFViewer, { Quote } from '@/components/verification/PDFViewer';
import QuoteCard from '@/components/verification/QuoteCard';

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
  const { sessionToken } = useSession();

  const [document, setDocument] = useState<Document | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [extracting, setExtracting] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    return headers;
  }, [sessionToken]);

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
        <div className="flex-1 border-r">
          <PDFViewer
            pdfUrl={pdfUrl}
            quotes={quotes}
            selectedQuoteId={selectedQuoteId}
            onQuoteClick={(id: number) => setSelectedQuoteId(id)}
          />
        </div>

        {/* Quotes Panel */}
        <div className="w-80 flex flex-col bg-white border-r">
          {/* Panel Header */}
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-2">Extracted Quotes</h2>
            
            {/* Stats */}
            <div className="flex space-x-4 text-sm mb-3">
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
                Full Name
              </label>
              <input
                type="text"
                placeholder="Last Name, First Name"
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date of Death */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date of Death
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="number"
                placeholder="e.g., 35"
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Country of Citizenship */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Country of Citizenship
              </label>
              <input
                type="text"
                placeholder="e.g., Mexico"
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* ICE Facility */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ICE Facility
              </label>
              <input
                type="text"
                placeholder="Facility name"
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Location (City, State)
              </label>
              <input
                type="text"
                placeholder="e.g., Phoenix, AZ"
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Cause of Death */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cause of Death
              </label>
              <textarea
                placeholder="As stated in official records"
                rows={3}
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* ICE Statement */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ICE Official Statement
              </label>
              <textarea
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
                placeholder="One URL per line"
                rows={3}
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Save Button */}
            <button
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Save Case Info
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
