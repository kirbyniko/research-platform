import { Source } from '@/types/case';

interface SourceListProps {
  sources: Source[];
}

export function SourceList({ sources }: SourceListProps) {
  return (
    <div>
      {sources.map((source, index) => (
        <div key={index} className="source-item">
          <a 
            href={source.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline font-medium"
          >
            {source.title}
          </a>
          <div className="text-gray-500">
            {source.publisher} · {source.date}
          </div>
          {source.quote && (
            <blockquote className="mt-3 pl-4 border-l-2 border-gray-300 text-sm italic text-gray-700">
              "{source.quote}"
              {source.quote_context && (
                <footer className="mt-1 text-xs not-italic text-gray-600">
                  — {source.quote_context}
                </footer>
              )}
            </blockquote>
          )}
        </div>
      ))}
    </div>
  );
}
