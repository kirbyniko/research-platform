'use client';

import { useState } from 'react';
import type { TimelineEntry } from '@/types/incident';
import { useSourceVisibility } from './SourceToggle';

interface IncidentTimelineProps {
  timeline: TimelineEntry[];
}

export function IncidentTimeline({ timeline }: IncidentTimelineProps) {
  const { showSources } = useSourceVisibility();

  if (timeline.length === 0) {
    return null;
  }

  // Sort by date
  const sortedTimeline = [...timeline].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Timeline ({timeline.length} events)
      </h2>
      
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <ul className="space-y-4">
          {sortedTimeline.map((entry, index) => (
            <TimelineItem key={entry.id || index} entry={entry} showSources={showSources} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function TimelineItem({ entry, showSources }: { entry: TimelineEntry; showSources: boolean }) {
  const [showQuote, setShowQuote] = useState(false);
  // Handle both 'text' (standard type) and 'quote_text' (from DB join)
  const quoteText = entry.quote?.text || (entry.quote as any)?.quote_text;
  const hasQuote = entry.quote && quoteText;
  const hasSource = entry.source?.url;

  return (
    <li className="relative pl-8">
      {/* Dot - green if has quote, gray otherwise */}
      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 ${
        hasQuote ? 'border-green-500' : 'border-gray-300'
      }`} />
      
      <div>
        <div className="flex items-center gap-2 mb-1">
          <time className="text-sm font-medium text-red-700">
            {entry.date || 'Date unknown'}
          </time>
          {entry.time && (
            <span className="text-xs text-gray-400">
              {entry.time}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700">
          {entry.description}
        </p>
        
        {/* Quote and Source display */}
        {showSources && hasQuote && (
          <div className="mt-2">
            <button
              onClick={() => setShowQuote(!showQuote)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {showQuote ? 'Hide quote' : 'View supporting quote'}
            </button>
            {showQuote && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                <div className="text-gray-700 italic">
                  &ldquo;{quoteText.substring(0, 200)}{quoteText.length > 200 ? '...' : ''}&rdquo;
                </div>
                {hasSource && (
                  <a 
                    href={entry.source!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:text-blue-900 underline block"
                  >
                    📄 {entry.source!.title || 'View source'}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Fallback source link if no quote but has source */}
        {showSources && !hasQuote && hasSource && (
          <a 
            href={entry.source!.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >
            Source →
          </a>
        )}
      </div>
    </li>
  );
}
