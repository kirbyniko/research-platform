import type { IncidentQuote } from '@/types/incident';

interface IncidentQuotesProps {
  quotes: IncidentQuote[];
}

const CATEGORY_LABELS: Record<string, string> = {
  official_statement: '🏛️ Official Statement',
  witness_testimony: '👁️ Witness Testimony',
  victim_statement: '💬 Victim Statement',
  family_statement: '👨‍👩‍👧 Family Statement',
  expert_analysis: '🎓 Expert Analysis',
  legal_filing: '⚖️ Legal Filing',
  media_quote: '📰 Media Quote',
  other: '📝 Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  official_statement: 'border-l-blue-500',
  witness_testimony: 'border-l-green-500',
  victim_statement: 'border-l-red-500',
  family_statement: 'border-l-pink-500',
  expert_analysis: 'border-l-purple-500',
  legal_filing: 'border-l-yellow-500',
  media_quote: 'border-l-gray-500',
  other: 'border-l-gray-400',
};

export function IncidentQuotes({ quotes }: IncidentQuotesProps) {
  if (quotes.length === 0) {
    return null;
  }

  // Group by category
  const groupedQuotes = quotes.reduce((acc, quote) => {
    const category = quote.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(quote);
    return acc;
  }, {} as Record<string, IncidentQuote[]>);

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Quotes ({quotes.length})
      </h2>
      
      <div className="space-y-6">
        {Object.entries(groupedQuotes).map(([category, categoryQuotes]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div className="space-y-3">
              {categoryQuotes.map((quote, index) => (
                <blockquote 
                  key={quote.id || index}
                  className={`border-l-4 pl-4 py-2 bg-gray-50 rounded-r ${CATEGORY_COLORS[category] || 'border-l-gray-400'}`}
                >
                  <p className="text-sm text-gray-700 leading-relaxed">
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  <footer className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                    {quote.source?.author && (
                      <span className="font-medium">— {quote.source.author}</span>
                    )}
                    {quote.source?.publication && (
                      <span>({quote.source.publication})</span>
                    )}
                    {quote.verified && (
                      <span className="text-green-600">✓ Verified</span>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
