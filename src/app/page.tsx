import Link from 'next/link';
import { getAllCasesFromDb } from '@/lib/cases-db';
import { getCaseStats } from '@/lib/cases';
import { CaseListItem } from '@/components/CaseListItem';
import { StatCard } from '@/components/StatCard';

export default async function Home() {
  const cases = await getAllCasesFromDb();
  const stats = getCaseStats(cases);

  return (
    <div>
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Deaths in ICE Custody</h1>
            <p className="text-gray-600">
              A documentation project presenting verified records of deaths connected to 
              U.S. Immigration and Customs Enforcement.
            </p>
          </div>
          <div className="flex gap-2">
            <Link 
              href="/admin" 
              className="text-sm border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            number={stats.totalDeaths} 
            label="Total documented deaths" 
          />
          <StatCard 
            number={stats.deathsThisYear} 
            label={`Deaths in ${new Date().getFullYear()}`} 
          />
          <StatCard 
            number={stats.daysSinceLastDeath} 
            label="Days since last recorded death"
            highlight={stats.daysSinceLastDeath < 30}
          />
          <StatCard 
            number={stats.facilitiesCount} 
            label="Facilities involved" 
          />
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Cases</h2>
          <Link href="/cases" className="text-sm underline">
            View all with filters →
          </Link>
        </div>

        {cases.length === 0 ? (
          <p className="text-gray-500 py-8">No cases documented yet.</p>
        ) : (
          <div>
            {cases.map((c) => (
              <CaseListItem key={c.id} caseData={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
