import type { Incident } from '@/types/incident';

interface IncidentListItemProps {
  incident: Incident;
}

const TYPE_LABELS: Record<string, string> = {
  death_in_custody: '💀 Death in Custody',
  death_during_operation: '💀 Death During Operation',
  death_at_protest: '💀 Death at Protest',
  death: '💀 Death', // Legacy
  shooting: '🔫 Shooting',
  excessive_force: '⚡ Excessive Force',
  injury: '🤕 Injury',
  medical_neglect: '🏥 Medical Neglect',
  arrest: '⚖️ Arrest',
  rights_violation: '📜 Rights Violation',
  deportation: '✈️ Deportation',
  family_separation: '👨‍👩‍👧 Family Separation',
  workplace_raid: '🏭 Workplace Raid',
  protest_suppression: '✊ Protest Suppression',
  retaliation: '🎯 Retaliation',
  other: '📋 Other',
};

const TYPE_COLORS: Record<string, string> = {
  death_in_custody: 'bg-red-100 text-red-800',
  death_during_operation: 'bg-red-100 text-red-800',
  death_at_protest: 'bg-red-100 text-red-800',
  death: 'bg-red-100 text-red-800',
  shooting: 'bg-red-200 text-red-900',
  excessive_force: 'bg-orange-100 text-orange-800',
  injury: 'bg-orange-100 text-orange-800',
  medical_neglect: 'bg-amber-100 text-amber-800',
  arrest: 'bg-purple-100 text-purple-800',
  rights_violation: 'bg-blue-100 text-blue-800',
  deportation: 'bg-yellow-100 text-yellow-800',
  family_separation: 'bg-pink-100 text-pink-800',
  workplace_raid: 'bg-gray-100 text-gray-800',
  protest_suppression: 'bg-indigo-100 text-indigo-800',
  retaliation: 'bg-rose-100 text-rose-800',
  other: 'bg-gray-100 text-gray-600',
};

export function IncidentListItem({ incident }: IncidentListItemProps) {
  const typeLabel = TYPE_LABELS[incident.incident_type] || incident.incident_type;
  const typeColor = TYPE_COLORS[incident.incident_type] || 'bg-gray-100 text-gray-600';
  
  const location = [
    incident.location?.city,
    incident.location?.state,
  ].filter(Boolean).join(', ') || 'Location unknown';

  return (
    <a 
      href={`/incidents/${incident.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColor}`}>
              {typeLabel}
            </span>
            {incident.verified && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                ✓ Verified
              </span>
            )}
          </div>
          
          <h3 className="font-medium text-gray-900">
            {incident.subject?.name || incident.victim_name || 'Name withheld'}
            {incident.subject?.age && (
              <span className="text-gray-500 font-normal ml-1">
                ({incident.subject.age})
              </span>
            )}
          </h3>
          
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {incident.summary || 'No summary available'}
          </p>
        </div>
        
        <div className="text-right sm:text-right flex-shrink-0">
          <div className="text-sm font-medium text-red-700">
            {incident.date}
          </div>
          <div className="text-xs text-gray-500">
            {location}
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-2">
        {incident.agencies_involved?.map((agency) => (
          <span 
            key={agency} 
            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
          >
            {agency.replace(/_/g, ' ').toUpperCase()}
          </span>
        ))}
        {incident.violations_alleged?.map((violation) => (
          <span 
            key={violation} 
            className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded"
          >
            {violation.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </a>
  );
}
