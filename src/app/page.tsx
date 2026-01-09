import Link from 'next/link';
import { getIncidents, getIncidentStats } from '@/lib/incidents-db';
import { IncidentListItem } from '@/components/incidents/IncidentListItem';
import { StatCard } from '@/components/StatCard';
import { isDatabaseConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!isDatabaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto mt-12 p-6 border border-gray-300 bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Database Not Configured</h1>
        <p className="mb-2">
          The database connection is not configured. Please set the DATABASE_URL environment variable in your deployment settings.
        </p>
        <p className="text-sm text-gray-600">
          For Vercel: Project Settings → Environment Variables → Add DATABASE_URL for Production
        </p>
      </div>
    );
  }

  try {
    // Only get verified incidents (default behavior)
    const [incidents, stats] = await Promise.all([
      getIncidents({ limit: 20 }), // Recent verified incidents
      getIncidentStats(), // Stats for verified incidents only
    ]);

    // Calculate stats from verified incidents
    const currentYear = new Date().getFullYear();
    const deathsThisYear = Object.entries(stats.by_year)
      .filter(([year]) => parseInt(year) === currentYear)
      .reduce((sum, [, count]) => sum + count, 0);
    
    const facilitiesCount = Object.keys(stats.by_state).length;
    
    // Days since last death
    const lastIncident = incidents[0];
    const daysSinceLastDeath = lastIncident?.date 
      ? Math.floor((Date.now() - new Date(lastIncident.date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return (
    <div>
      <section className="mb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">ICE Incident Tracker</h1>
          <p className="text-gray-600">
            A documentation project presenting verified records of incidents connected to 
            U.S. Immigration and Customs Enforcement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            number={stats.total_incidents} 
            label="Total documented incidents" 
          />
          <StatCard 
            number={deathsThisYear} 
            label={`Incidents in ${currentYear}`} 
          />
          <StatCard 
            number={daysSinceLastDeath} 
            label="Days since last recorded incident"
            highlight={daysSinceLastDeath < 30}
          />
          <StatCard 
            number={facilitiesCount} 
            label="States involved" 
          />
        </div>

        {/* Call to Action */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3">Help Document the Truth</h2>
          <p className="text-gray-600 text-sm mb-4">
            This project relies on verified documentation. If you have information about an incident 
            involving ICE, you can help by submitting a report.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Submit a Report
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Verified Incidents</h2>
          <Link href="/incidents" className="text-sm underline">
            View all with filters →
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="text-gray-500 py-8 text-center bg-gray-50 rounded-lg">
            <p className="mb-2">No verified incidents published yet.</p>
            <p className="text-sm">Incidents are reviewed and verified by our team before publication.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <IncidentListItem key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
  } catch (error) {
    console.error('Error loading incidents:', error);
    return (
      <div className="max-w-3xl mx-auto mt-12 p-6 border border-red-300 bg-red-50">
        <h1 className="text-2xl font-bold mb-4 text-red-900">Database Error</h1>
        <p className="mb-2 text-red-800">
          Unable to connect to the database. Please check your configuration.
        </p>
        <p className="text-sm text-red-600">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }
}
