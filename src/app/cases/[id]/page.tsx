import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllCasesFromDb, getCaseByIdFromDb } from '@/lib/cases-db';
import { Timeline } from '@/components/Timeline';
import { DiscrepancyComparison } from '@/components/DiscrepancyComparison';
import { SourceList } from '@/components/SourceList';
import { ExpandableSection } from '@/components/ExpandableSection';
import CaseEditorWrapper from '@/components/CaseEditorWrapper';

interface CasePageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const cases = await getAllCasesFromDb();
  return cases.map((c) => ({
    id: c.id,
  }));
}

export default async function CasePage({ params }: CasePageProps) {
  const { id } = await params;
  const caseData = await getCaseByIdFromDb(id);

  if (!caseData) {
    notFound();
  }

  // Calculate days in custody if possible
  let daysInCustody: number | null = null;
  const custodyStart = caseData.timeline.find(t => 
    t.event.toLowerCase().includes('custody') ||
    t.event.toLowerCase().includes('detained') ||
    t.event.toLowerCase().includes('transferred')
  );
  if (custodyStart) {
    const startDate = new Date(custodyStart.date);
    const deathDate = new Date(caseData.date_of_death);
    daysInCustody = Math.floor(
      (deathDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return (
    <article>
      {/* Edit Button */}
      <div className="mb-4 flex justify-end">
        <CaseEditorWrapper caseData={caseData} />
      </div>

      {/* Header */}
      <header className="mb-8 pb-8 border-b border-gray-200">
        <div className="flex gap-6 items-start">
          {caseData.image_url && (
            <div className="flex-shrink-0">
              <img 
                src={caseData.image_url} 
                alt={caseData.name}
                className="w-32 h-32 object-cover border border-gray-300"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{caseData.name}</h1>
            <p className="text-xl text-gray-600 mb-4">
              {caseData.age} years old · {caseData.nationality}
            </p>
            <p className="text-lg">
              <span className="death-date font-semibold">{caseData.date_of_death}</span>
              {daysInCustody !== null && (
                <span className="text-gray-500 ml-2">
                  ({daysInCustody} days in custody)
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Summary */}
      <section className="mb-8 p-4 bg-gray-50 border border-gray-200">
        <h2 className="sr-only">Summary</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Facility</dt>
            <dd>{caseData.facility.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Location</dt>
            <dd>{caseData.facility.state}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Facility Type</dt>
            <dd>{caseData.facility.type}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Custody Status</dt>
            <dd>{caseData.custody_status}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-500">Official Cause of Death</dt>
            <dd>{caseData.official_cause_of_death}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-500">Categories</dt>
            <dd>{caseData.category.join(', ')}</dd>
          </div>
        </dl>
      </section>

      {/* Timeline */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        <Timeline events={caseData.timeline} deathDate={caseData.date_of_death} />
      </section>

      {/* Discrepancies */}
      {caseData.discrepancies && caseData.discrepancies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">ICE Statement vs. Evidence</h2>
          <DiscrepancyComparison discrepancies={caseData.discrepancies} />
        </section>
      )}

      {/* Notes */}
      {caseData.notes && (
        <ExpandableSection title="Additional Notes">
          <p className="text-sm">{caseData.notes}</p>
        </ExpandableSection>
      )}

      {/* Sources */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Sources</h2>
        <SourceList sources={caseData.sources} />
      </section>

      {/* Back link */}
      <nav className="mt-8 pt-8 border-t border-gray-200">
        <Link href="/cases" className="text-sm underline">
          ← Back to all cases
        </Link>
      </nav>
    </article>
  );
}
