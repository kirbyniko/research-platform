import { getIncidents, getIncidentStats } from '@/lib/incidents-db';
import { IncidentListItem } from '@/components/incidents/IncidentListItem';
import { IncidentFilters } from '@/components/incidents/IncidentFilters';
import { IncidentStats } from '@/components/incidents/IncidentStats';
import { isDatabaseConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!isDatabaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto mt-12 p-6 border border-gray-300 bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Database Not Configured</h1>
        <p>The database connection is not configured. Please set the DATABASE_URL environment variable.</p>
      </div>
    );
  }

  const params = await searchParams;
  
  try {
  // Build filters from URL params
  const filters: Record<string, unknown> = {};
  
  if (params.type) filters.type = params.type as string;
  if (params.types) filters.types = (params.types as string).split(',');
  if (params.agency) filters.agency = params.agency as string;
  if (params.agencies) filters.agencies = (params.agencies as string).split(',');
  if (params.violation) filters.violation = params.violation as string;
  if (params.violations) filters.violations = (params.violations as string).split(',');
  if (params.state) filters.state = params.state as string;
  if (params.city) filters.city = params.city as string;
  if (params.year) filters.year = parseInt(params.year as string);
  if (params.year_start) filters.year_start = parseInt(params.year_start as string);
  if (params.year_end) filters.year_end = parseInt(params.year_end as string);
  if (params.verified) filters.verified = params.verified === 'true';
  if (params.search) filters.search = params.search as string;
  
  const [incidents, stats] = await Promise.all([
    getIncidents(filters),
    getIncidentStats(),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Incident Tracker</h1>
        <p className="text-gray-600">
          Documenting incidents involving U.S. immigration enforcement
        </p>
      </div>

      <IncidentStats stats={stats} />
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <IncidentFilters 
            stats={stats}
            currentFilters={filters}
          />
        </aside>
        
        <main className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              {incidents.length} incident{incidents.length !== 1 ? 's' : ''} found
            </p>
            {Object.keys(filters).length > 0 && (
              <a 
                href="/incidents" 
                className="text-sm text-blue-600 hover:underline"
              >
                Clear all filters
              </a>
            )}
          </div>

          {incidents.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No incidents match your filters.</p>
              <a 
                href="/incidents" 
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                View all incidents
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <IncidentListItem key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
  } catch (error) {
    console.error('Error loading incidents:', error);
    return (
      <div className="max-w-3xl mx-auto mt-12 p-6 border border-red-300 bg-red-50">
        <h1 className="text-2xl font-bold mb-4 text-red-900">Database Error</h1>
        <p className="text-red-800">Unable to connect to the database.</p>
      </div>
    );
  }
}
