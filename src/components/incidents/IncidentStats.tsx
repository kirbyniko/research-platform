import type { IncidentStats as StatsType, IncidentType } from '@/types/incident';

interface IncidentStatsProps {
  stats: StatsType;
}

export function IncidentStats({ stats }: IncidentStatsProps) {
  const typeOrder = [
    'death_in_custody', 'death_during_operation', 'death_at_protest', 'death',
    'shooting', 'excessive_force', 'injury', 'medical_neglect',
    'arrest', 'rights_violation', 'deportation', 'family_separation',
    'workplace_raid', 'protest_suppression', 'retaliation', 'other'
  ];
  
  const typeLabels: Record<string, string> = {
    death_in_custody: 'Deaths (Custody)',
    death_during_operation: 'Deaths (Operations)',
    death_at_protest: 'Deaths (Protest)',
    death: 'Deaths',
    shooting: 'Shootings',
    excessive_force: 'Excessive Force',
    injury: 'Injuries',
    medical_neglect: 'Medical Neglect',
    arrest: 'Arrests',
    rights_violation: 'Rights Violations',
    deportation: 'Deportations',
    family_separation: 'Family Separations',
    workplace_raid: 'Workplace Raids',
    protest_suppression: 'Protest Suppression',
    retaliation: 'Retaliation',
    other: 'Other',
  };

  const typeColors: Record<string, string> = {
    death_in_custody: 'bg-red-600',
    death_during_operation: 'bg-red-500',
    death_at_protest: 'bg-red-400',
    death: 'bg-red-500',
    shooting: 'bg-red-700',
    excessive_force: 'bg-orange-500',
    injury: 'bg-orange-400',
    medical_neglect: 'bg-amber-500',
    arrest: 'bg-purple-500',
    rights_violation: 'bg-blue-500',
    deportation: 'bg-yellow-500',
    family_separation: 'bg-pink-500',
    workplace_raid: 'bg-gray-500',
    protest_suppression: 'bg-indigo-500',
    retaliation: 'bg-rose-500',
    other: 'bg-gray-400',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{stats.total_incidents}</div>
          <div className="text-sm text-gray-500">Total Incidents</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{stats.verified_count}</div>
          <div className="text-sm text-gray-500">Verified</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600">{stats.unverified_count}</div>
          <div className="text-sm text-gray-500">Pending Review</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-600">
            {Object.keys(stats.by_state || {}).length}
          </div>
          <div className="text-sm text-gray-500">States</div>
        </div>
      </div>
      
      {/* Type breakdown bar */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">By Type</div>
        <div className="flex rounded-full overflow-hidden h-4">
          {typeOrder.map((type) => {
            const count = stats.by_type?.[type as IncidentType] || 0;
            if (count === 0) return null;
            const percentage = (count / stats.total_incidents) * 100;
            return (
              <div
                key={type}
                className={`${typeColors[type]} relative group`}
                style={{ width: `${percentage}%` }}
                title={`${typeLabels[type]}: ${count}`}
              >
                <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                  {typeLabels[type]}: {count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {typeOrder.map((type) => {
            const count = stats.by_type?.[type as IncidentType] || 0;
            if (count === 0) return null;
            return (
              <div key={type} className="flex items-center gap-1 text-xs text-gray-600">
                <div className={`w-2 h-2 rounded ${typeColors[type]}`} />
                <span>{typeLabels[type]} ({count})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
