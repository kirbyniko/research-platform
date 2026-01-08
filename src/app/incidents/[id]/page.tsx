import { getIncidentById } from '@/lib/incidents-db';
import { notFound } from 'next/navigation';
import { IncidentHeader } from '@/components/incidents/IncidentHeader';
import { IncidentDetails } from '@/components/incidents/IncidentDetails';
import { IncidentSources } from '@/components/incidents/IncidentSources';
import { IncidentQuotes } from '@/components/incidents/IncidentQuotes';
import { IncidentTimeline } from '@/components/incidents/IncidentTimeline';

export const dynamic = 'force-dynamic';

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

  return (
    <div className="max-w-4xl mx-auto">
      <a 
        href="/incidents" 
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← Back to all incidents
      </a>
      
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
