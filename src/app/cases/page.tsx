import { getAllCasesFromDb } from '@/lib/cases-db';
import { getAllYears, getAllStates, getAllCategories, getAllFacilities } from '@/lib/cases';
import { CaseListItem } from '@/components/CaseListItem';
import { CaseFilters } from '@/components/CaseFilters';

export default async function CasesPage() {
  const cases = await getAllCasesFromDb();
  const years = getAllYears(cases);
  const states = getAllStates(cases);
  const categories = getAllCategories(cases);
  const facilities = getAllFacilities(cases);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Case Index</h1>
      <p className="text-gray-600 mb-8">
        {cases.length} documented deaths in ICE custody
      </p>

      <CaseFilters 
        years={years}
        states={states}
        categories={categories}
        facilities={facilities}
      />

      <div className="mt-8">
        {cases.length === 0 ? (
          <p className="text-gray-500 py-8">No cases match your filters.</p>
        ) : (
          <div>
            {cases.map((c) => (
              <CaseListItem key={c.id} caseData={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
