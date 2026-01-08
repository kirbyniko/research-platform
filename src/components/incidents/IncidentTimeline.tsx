import type { TimelineEntry } from '@/types/incident';

interface IncidentTimelineProps {
  timeline: TimelineEntry[];
}

export function IncidentTimeline({ timeline }: IncidentTimelineProps) {
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
            <li key={entry.id || index} className="relative pl-8">
              {/* Dot */}
              <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-gray-300" />
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <time className="text-sm font-medium text-red-700">
                    {entry.date}
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
                {entry.source?.url && (
                  <a 
                    href={entry.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Source →
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
