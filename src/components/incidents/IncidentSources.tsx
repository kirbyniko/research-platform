import type { IncidentSource } from '@/types/incident';

interface IncidentSourcesProps {
  sources: IncidentSource[];
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  news_article: '📰 News',
  government_document: '🏛️ Government',
  court_document: '⚖️ Court',
  ngo_report: '📋 NGO Report',
  social_media: '📱 Social Media',
  press_release: '📢 Press Release',
  interview: '🎤 Interview',
  other: '📄 Other',
};

export function IncidentSources({ sources }: IncidentSourcesProps) {
  if (sources.length === 0) {
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sources</h2>
        <p className="text-sm text-gray-500">No sources documented yet.</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Sources ({sources.length})
      </h2>
      
      <ul className="space-y-4">
        {sources.map((source, index) => (
          <li key={source.id || index} className="text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">
                {SOURCE_TYPE_LABELS[source.source_type] || '📄'}
              </span>
              <div className="flex-1 min-w-0">
                <a 
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium line-clamp-2"
                >
                  {source.title || source.url}
                </a>
                {source.publication && (
                  <div className="text-gray-500 text-xs mt-0.5">
                    {source.publication}
                    {source.published_date && ` • ${source.published_date}`}
                  </div>
                )}
                {source.author && (
                  <div className="text-gray-400 text-xs">
                    By {source.author}
                  </div>
                )}
                {source.archived_url && (
                  <a 
                    href={source.archived_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    [archived]
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
