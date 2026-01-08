'use client';

import { useState } from 'react';
import type { Quote } from './PDFViewer';

interface QuoteCardProps {
  quote: Quote;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: (reason: string) => void;
  onEdit: () => void;
  onJumpToPdf?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  timeline_event: 'Timeline Event',
  medical: 'Medical',
  official_statement: 'Official Statement',
  background: 'Background'
};

const CATEGORY_COLORS: Record<string, string> = {
  timeline_event: 'bg-blue-100 text-blue-800',
  medical: 'bg-red-100 text-red-800',
  official_statement: 'bg-purple-100 text-purple-800',
  background: 'bg-gray-100 text-gray-800'
};

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  verified: '✓',
  rejected: '✗',
  edited: '✎'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-500',
  verified: 'text-green-500',
  rejected: 'text-red-500',
  edited: 'text-blue-500'
};

const REJECTION_REASONS = [
  'Not a real event',
  'Wrong date',
  'Incomplete quote',
  'Duplicate',
  'Not relevant',
  'Other'
];

export default function QuoteCard({
  quote,
  isSelected,
  onSelect,
  onAccept,
  onReject,
  onEdit,
  onJumpToPdf
}: QuoteCardProps) {
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReject = (reason: string) => {
    onReject(reason === 'Other' ? customReason : reason);
    setShowRejectMenu(false);
    setCustomReason('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Check if quote is long (more than ~200 chars or has newlines)
  const isLongQuote = quote.quote_text.length > 200 || quote.quote_text.includes('\n');

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`text-lg ${STATUS_COLORS[quote.status]}`}>
            {STATUS_ICONS[quote.status]}
          </span>
          <span className="font-medium text-sm">
            {formatDate(quote.event_date)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[quote.category] || 'bg-gray-100'}`}>
            {CATEGORY_LABELS[quote.category] || quote.category}
          </span>
          <span className="text-xs text-gray-400">
            {Math.round((quote.confidence_score || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Quote text */}
      <div className="text-sm text-gray-700 mb-1">
        <p className={isExpanded ? '' : 'line-clamp-3'}>
          &ldquo;{quote.quote_text}&rdquo;
        </p>
        {isLongQuote && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="text-blue-600 hover:text-blue-700 text-xs mt-1"
          >
            {isExpanded ? '▲ Show less' : '▼ Show more'}
          </button>
        )}
      </div>

      {/* Meta + Jump button */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <span>Page {quote.page_number || '?'} • chars {quote.char_start}-{quote.char_end}</span>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              // Copy first 50 chars of quote (enough to search but not too long)
              const searchText = quote.quote_text.slice(0, 50).trim();
              navigator.clipboard.writeText(searchText);
              // Show brief feedback
              const btn = e.currentTarget;
              const original = btn.textContent;
              btn.textContent = 'Copied! Ctrl+F';
              btn.classList.add('bg-green-100', 'text-green-700');
              btn.classList.remove('bg-gray-100', 'text-gray-700');
              setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('bg-green-100', 'text-green-700');
                btn.classList.add('bg-gray-100', 'text-gray-700');
              }, 2000);
            }}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            title="Copy quote text to search in PDF"
          >
            📋 Copy
          </button>
          {onJumpToPdf && (
            <button
              onClick={(e) => { e.stopPropagation(); onJumpToPdf(); }}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
              title={`Go to page ${quote.page_number}`}
            >
              p.{quote.page_number} →
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      {quote.status === 'pending' && (
        <div className="flex items-center space-x-2 pt-2 border-t">
          <button
            onClick={(e) => { e.stopPropagation(); onAccept(); }}
            className="flex-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
          >
            ✓ Accept
          </button>
          
          <div className="relative flex-1">
            <button
              onClick={(e) => { e.stopPropagation(); setShowRejectMenu(!showRejectMenu); }}
              className="w-full px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              ✗ Reject
            </button>
            
            {showRejectMenu && (
              <div 
                className="absolute bottom-full left-0 mb-1 w-48 bg-white border rounded-lg shadow-lg z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => reason === 'Other' ? null : handleReject(reason)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {reason}
                  </button>
                ))}
                <div className="p-2 border-t">
                  <input
                    type="text"
                    placeholder="Custom reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {customReason && (
                    <button
                      onClick={() => handleReject(customReason)}
                      className="mt-1 w-full px-2 py-1 bg-red-500 text-white text-xs rounded"
                    >
                      Reject with reason
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
          >
            ✎
          </button>
        </div>
      )}

      {/* Status badge for non-pending */}
      {quote.status !== 'pending' && (
        <div className={`text-xs mt-2 ${STATUS_COLORS[quote.status]}`}>
          {quote.status === 'verified' && '✓ Verified'}
          {quote.status === 'rejected' && '✗ Rejected'}
          {quote.status === 'edited' && '✎ Edited'}
        </div>
      )}
    </div>
  );
}
