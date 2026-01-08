import { getAllCasesFromDb } from '@/lib/cases-db';
import { 
  getDeathsAfterMedicalComplaints, 
  getFacilitiesWithMultipleDeaths, 
  getDeathsWithin30Days 
} from '@/lib/cases';
import { CaseListItem } from '@/components/CaseListItem';

export default async function PatternsPage() {
  const cases = await getAllCasesFromDb();
  const medicalCases = getDeathsAfterMedicalComplaints(cases);
  const facilitiesMultiple = getFacilitiesWithMultipleDeaths(cases);
  const quickDeaths = getDeathsWithin30Days(cases);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Patterns</h1>
      <p className="text-gray-600 mb-8">
        Analysis of recurring patterns in documented deaths.
      </p>

      {/* Deaths After Medical Complaints */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">
          Deaths Following Medical Complaints
        </h2>
        <p className="text-gray-600 mb-4">
          Cases where individuals reported medical symptoms or complaints 
          prior to death, suggesting potential medical neglect.
        </p>
        <div className="text-sm text-gray-500 mb-4">
          {medicalCases.length} cases identified
        </div>
        {medicalCases.length > 0 ? (
          <div className="border border-gray-200 p-4">
            {medicalCases.slice(0, 10).map((c) => (
              <CaseListItem key={c.id} caseData={c} />
            ))}
            {medicalCases.length > 10 && (
              <p className="text-sm text-gray-500 mt-4">
                Showing 10 of {medicalCases.length} cases
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No cases match this pattern.</p>
        )}
      </section>

      {/* Facilities with Multiple Deaths */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">
          Facilities with Multiple Deaths
        </h2>
        <p className="text-gray-600 mb-4">
          Detention facilities where more than one death has been documented.
        </p>
        {facilitiesMultiple.length > 0 ? (
          <div className="space-y-6">
            {facilitiesMultiple.map(({ facility, count, cases }) => (
              <div key={facility} className="border border-gray-200 p-4">
                <h3 className="font-semibold mb-1">{facility}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {count} documented deaths
                </p>
                {cases.map((c) => (
                  <CaseListItem key={c.id} caseData={c} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No facilities with multiple deaths documented.</p>
        )}
      </section>

      {/* Deaths Within 30 Days */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">
          Deaths Within 30 Days of Detention
        </h2>
        <p className="text-gray-600 mb-4">
          Cases where death occurred within 30 days of entering ICE custody.
        </p>
        <div className="text-sm text-gray-500 mb-4">
          {quickDeaths.length} cases identified
        </div>
        {quickDeaths.length > 0 ? (
          <div className="border border-gray-200 p-4">
            {quickDeaths.map((c) => (
              <CaseListItem key={c.id} caseData={c} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No cases match this pattern.</p>
        )}
      </section>
    </div>
  );
}
