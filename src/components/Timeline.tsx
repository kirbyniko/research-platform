import { TimelineEvent } from '@/types/case';

interface TimelineProps {
  events: TimelineEvent[];
  deathDate: string;
}

export function Timeline({ events, deathDate }: TimelineProps) {
  // Sort events chronologically
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="timeline">
      {sortedEvents.map((event, index) => {
        const isDeath = event.date === deathDate;
        return (
          <div 
            key={index} 
            className={`timeline-item ${isDeath ? 'death' : ''}`}
          >
            <div className={`text-sm font-medium ${isDeath ? 'death-date' : ''}`}>
              {event.date}
            </div>
            <div className="mt-1">{event.event}</div>
            {event.source && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Source: <a 
                    href={event.source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-black"
                  >
                    {event.source.publisher}, {event.source.date}
                  </a>
                </p>
                {event.source.quote && (
                  <blockquote className="mt-2 pl-3 border-l-2 border-gray-300 text-xs italic text-gray-700">
                    "{event.source.quote}"
                  </blockquote>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
