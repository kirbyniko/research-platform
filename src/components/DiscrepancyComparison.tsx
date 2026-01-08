import { Discrepancy } from '@/types/case';

interface DiscrepancyComparisonProps {
  discrepancies: Discrepancy[];
}

export function DiscrepancyComparison({ discrepancies }: DiscrepancyComparisonProps) {
  if (discrepancies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {discrepancies.map((d, index) => (
        <div key={index} className="discrepancy-grid">
          <div className="border border-gray-200 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              ICE Statement
            </div>
            <p className="text-sm">{d.ice_claim}</p>
            {d.ice_claim_source && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Source: <a 
                    href={d.ice_claim_source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-black"
                  >
                    {d.ice_claim_source.publisher}, {d.ice_claim_source.date}
                  </a>
                </p>
              </div>
            )}
          </div>
          <div className="border border-gray-200 p-4 bg-gray-50">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Counter-Evidence
            </div>
            <p className="text-sm">{d.counter_evidence}</p>
            {d.counter_evidence_source && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Source: <a 
                    href={d.counter_evidence_source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-black"
                  >
                    {d.counter_evidence_source.publisher}, {d.counter_evidence_source.date}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
