'use client';

import { IncidentHeader } from '@/components/incidents/IncidentHeader';
import { IncidentDetails } from '@/components/incidents/IncidentDetails';
import { IncidentSources } from '@/components/incidents/IncidentSources';
import { IncidentQuotes } from '@/components/incidents/IncidentQuotes';
import { IncidentTimeline } from '@/components/incidents/IncidentTimeline';
import { SuggestEditButton } from '@/components/SuggestEditButton';
import { SourceToggle, SourceVisibilityProvider } from '@/components/incidents/SourceToggle';
import type { Incident } from '@/types/incident';

interface IncidentPageClientProps {
  incident: Incident;
  incidentId: number;
  flatData: Record<string, any>;
  userRole: string | null;
}

export function IncidentPageClient({ incident, incidentId, flatData, userRole }: IncidentPageClientProps) {
  const isAnalystOrAbove = userRole && ['analyst', 'admin', 'editor'].includes(userRole);
  
  // Determine back link based on role
  const backLink = isAnalystOrAbove ? '/dashboard' : '/';
  const backText = isAnalystOrAbove ? '← Back to dashboard' : '← Back to home';
  
  return (
    <SourceVisibilityProvider>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <a 
            href={backLink}
            className="text-sm text-gray-500 hover:text-gray-700 inline-block"
          >
            {backText}
          </a>
          <div className="flex items-center gap-4">
            <SourceToggle />
            <SuggestEditButton incidentId={incidentId} incidentData={flatData} />
          </div>
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
    </SourceVisibilityProvider>
  );
}
