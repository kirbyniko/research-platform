import { getIncidentById } from '@/lib/incidents-db';
import { notFound } from 'next/navigation';
import { IncidentHeader } from '@/components/incidents/IncidentHeader';
import { IncidentDetails } from '@/components/incidents/IncidentDetails';
import { IncidentSources } from '@/components/incidents/IncidentSources';
import { IncidentQuotes } from '@/components/incidents/IncidentQuotes';
import { IncidentTimeline } from '@/components/incidents/IncidentTimeline';
import { SuggestEditButton } from '@/components/SuggestEditButton';

export const dynamic = 'force-dynamic';

// Flatten incident data for edit suggestions
function flattenIncidentData(incident: any): Record<string, any> {
  return {
    victim_name: incident.subject?.name || null,
    victim_age: incident.subject?.age || null,
    victim_gender: incident.subject?.gender || null,
    victim_nationality: incident.subject?.nationality || null,
    incident_date: incident.date || null,
    incident_type: incident.incident_type || null,
    description: incident.summary || null,
    city: incident.location?.city || null,
    state: incident.location?.state || null,
    facility_name: incident.location?.facility || null,
    facility_type: incident.location?.type || null,
    cause_of_death: incident.death_details?.cause || null,
    manner_of_death: incident.death_details?.manner || null,
    agency: incident.agencies_involved?.[0] || null,
    agency_response: incident.official_response || null,
    medical_conditions: incident.medical?.conditions?.join(', ') || null,
    medical_care_provided: incident.medical?.care_provided || null,
    family_statement: incident.family_statement || null,
    official_statement: incident.official_response || null,
  };
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incidentId = parseInt(id);
  
  if (isNaN(incidentId)) {
    notFound();
  }
  
  const incident = await getIncidentById(incidentId);
  
  if (!incident) {
    notFound();
  }

  const flatData = flattenIncidentData(incident);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <a 
          href="/incidents" 
          className="text-sm text-gray-500 hover:text-gray-700 inline-block"
        >
          ← Back to all incidents
        </a>
        <SuggestEditButton incidentId={incidentId} incidentData={flatData} />
      </div>
      
      <IncidentHeader incident={incident} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          <IncidentDetails incident={incident} />
          
          {incident.timeline && incident.timeline.length > 0 && (
            <IncidentTimeline timeline={incident.timeline} />
          )}
          
          {incident.quotes && incident.quotes.length > 0 && (
            <IncidentQuotes quotes={incident.quotes} />
          )}
        </div>
        
        <aside className="lg:col-span-1">
          <IncidentSources sources={incident.sources || []} />
        </aside>
      </div>
    </div>
  );
}
