'use client';

import { useState, useEffect } from 'react';

export interface Quote {
  id: number;
  quote_text: string;
  char_start: number;
  char_end: number;
  page_number: number;
  category: string;
  event_date: string | null;
  confidence_score: number;
  status: 'pending' | 'verified' | 'rejected' | 'edited';
  bounding_boxes?: Array<{ page: number; x: number; y: number; width: number; height: number }>;
}

interface PDFViewerProps {
  pdfUrl: string;
  quotes: Quote[];
  selectedQuoteId: number | null;
  onQuoteClick?: (quoteId: number) => void;
  onTextSelect?: (selection: { text: string; page: number; charStart: number; charEnd: number }) => void;
}

// PDF viewer using <object> tag for better browser compatibility
export default function PDFViewer({
  pdfUrl,
  quotes,
  selectedQuoteId,
  onQuoteClick,
}: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerKey, setViewerKey] = useState(0);

  // Jump to page when selected quote changes
  useEffect(() => {
    if (selectedQuoteId) {
      const quote = quotes.find(q => q.id === selectedQuoteId);
      if (quote && quote.page_number && quote.page_number !== currentPage) {
        setCurrentPage(quote.page_number);
        // Force re-render of object tag to navigate to page
        setViewerKey(prev => prev + 1);
      }
    }
  }, [selectedQuoteId, quotes, currentPage]);

  // Get color for quote status
  const getQuoteColor = (status: string, isSelected: boolean): string => {
    if (isSelected) return 'bg-blue-100 border-blue-500';
    switch (status) {
      case 'verified': return 'bg-green-50 border-green-500';
      case 'rejected': return 'bg-red-50 border-red-500';
      case 'edited': return 'bg-purple-50 border-purple-500';
      default: return 'bg-yellow-50 border-yellow-500';
    }
  };

  // Build URL with page parameter
  const pdfUrlWithPage = `${pdfUrl}#page=${currentPage}`;

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">PDF Viewer</span>
          {selectedQuoteId && (
            <span className="text-xs text-gray-500">
              → Page {quotes.find(q => q.id === selectedQuoteId)?.page_number || '?'}
            </span>
          )}
        </div>
        <a 
          href={pdfUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Open in new tab ↗
        </a>
      </div>

      {/* PDF viewer using object tag */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        )}
        <object
          key={viewerKey}
          data={pdfUrlWithPage}
          type="application/pdf"
          className="w-full h-full"
          onLoad={() => setIsLoading(false)}
        >
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-gray-600 mb-4">
              Your browser cannot display PDFs inline.
            </p>
            <a 
              href={pdfUrl}
              download
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download PDF
            </a>
          </div>
        </object>
      </div>

      {/* Quote quick-nav (mini timeline) */}
      {quotes.length > 0 && (
        <div className="p-2 bg-white border-t max-h-32 overflow-y-auto">
          <div className="text-xs font-medium text-gray-500 mb-1">
            Jump to quote (Page):
          </div>
          <div className="flex flex-wrap gap-1">
            {quotes.map((quote, idx) => (
              <button
                key={quote.id}
                onClick={() => onQuoteClick?.(quote.id)}
                className={`px-2 py-1 text-xs rounded border-l-2 ${getQuoteColor(quote.status, quote.id === selectedQuoteId)}`}
                title={quote.quote_text.slice(0, 100)}
              >
                #{idx + 1} (p{quote.page_number || '?'})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
