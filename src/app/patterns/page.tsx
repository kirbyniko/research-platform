import { getIncidents } from '@/lib/incidents-db';
import Link from 'next/link';

export default async function PatternsPage() {
  // Only get verified incidents
  const incidents = await getIncidents({ includeUnverified: false });
  
  // Filter to death-related incidents only
  const deathIncidents = incidents.filter(i => 
    i.incident_type?.includes('death') || i.incident_type === 'medical_neglect'
  );

  // Pattern: Deaths with medical neglect indicators
  const medicalCases = deathIncidents.filter(i => 
    i.incident_type === 'medical_neglect' || 
    i.death_details?.medical_requests_denied ||
    i.summary?.toLowerCase().includes('medical') ||
    i.summary?.toLowerCase().includes('denied care')
  );

  // Pattern: Facilities with multiple incidents
  const facilityMap = new Map<string, typeof incidents>();
  deathIncidents.forEach(i => {
    const facility = i.location?.facility;
    if (facility) {
      if (!facilityMap.has(facility)) {
        facilityMap.set(facility, []);
      }
      facilityMap.get(facility)!.push(i);
    }
  });
  const facilitiesMultiple = Array.from(facilityMap.entries())
    .filter(([, cases]) => cases.length > 1)
    .map(([facility, cases]) => ({ facility, count: cases.length, incidents: cases }))
    .sort((a, b) => b.count - a.count);

  // Pattern: Quick deaths (within short custody duration)
  const quickDeaths = deathIncidents.filter(i => {
    const duration = i.death_details?.custody_duration?.toLowerCase() || '';
    return duration.includes('day') || duration.includes('week') || duration.includes('hour');
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Patterns</h1>
      <p className="text-gray-600 mb-8">
        Analysis of recurring patterns in documented incidents.
      </p>

      {/* Deaths After Medical Complaints */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">
          Deaths Following Medical Issues
        </h2>
        <p className="text-gray-600 mb-4">
          Cases where individuals had documented medical issues or denied care prior to death.
        </p>
        <div className="text-sm text-gray-500 mb-4">
          {medicalCases.length} cases identified
        </div>
        {medicalCases.length > 0 ? (
          <div className="border border-gray-200 p-4 space-y-3">
            {medicalCases.slice(0, 10).map((i) => (
              <div key={i.id} className="border-b border-gray-100 pb-2 last:border-0">
                <Link href={`/incidents/${i.id}`} className="font-medium hover:underline">
                  {i.subject?.name || 'Unknown'}
                </Link>
                <span className="text-gray-500 text-sm ml-2">
                  {i.date ? new Date(i.date).toLocaleDateString() : 'Date unknown'}
                  {i.location?.facility && ` — ${i.location.facility}`}
                </span>
              </div>
            ))}
            {medicalCases.length > 10 && (
              <p className="text-sm text-gray-500 mt-4">
                Showing 10 of {medicalCases.length} cases
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No cases match this pattern in verified data.</p>
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
            {facilitiesMultiple.map(({ facility, count, incidents }) => (
              <div key={facility} className="border border-gray-200 p-4">
                <h3 className="font-semibold mb-1">{facility}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {count} documented deaths
                </p>
                {incidents.map((i) => (
                  <div key={i.id} className="border-b border-gray-100 pb-2 last:border-0">
                    <Link href={`/incidents/${i.id}`} className="font-medium hover:underline">
                      {i.subject?.name || 'Unknown'}
                    </Link>
                    <span className="text-gray-500 text-sm ml-2">
                      {i.date ? new Date(i.date).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No facilities with multiple deaths in verified data.</p>
        )}
      </section>

      {/* Deaths Within Short Time */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">
          Deaths Within Short Custody Duration
        </h2>
        <p className="text-gray-600 mb-4">
          Cases where death occurred within days or weeks of entering custody.
        </p>
        <div className="text-sm text-gray-500 mb-4">
          {quickDeaths.length} cases identified
        </div>
        {quickDeaths.length > 0 ? (
          <div className="border border-gray-200 p-4 space-y-3">
            {quickDeaths.map((i) => (
              <div key={i.id} className="border-b border-gray-100 pb-2 last:border-0">
                <Link href={`/incidents/${i.id}`} className="font-medium hover:underline">
                  {i.subject?.name || 'Unknown'}
                </Link>
                <span className="text-gray-500 text-sm ml-2">
                  {i.death_details?.custody_duration && `Custody: ${i.death_details.custody_duration}`}
                  {i.location?.facility && ` — ${i.location.facility}`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No cases match this pattern in verified data.</p>
        )}
      </section>
    </div>
  );
}
