import { getIncidentById } from '@/lib/incidents-db';
import { notFound } from 'next/navigation';
import { IncidentPageClient } from '@/components/incidents/IncidentPageClient';
import { auth } from '@/lib/next-auth';

export const dynamic = 'force-dynamic';

// Flatten incident data for edit suggestions
function flattenIncidentData(incident: any): Record<string, any> {
  return {
    victim_name: incident.victim_name || incident.subject?.name || null,
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
  
  // Check authentication
  const session = await auth();
  const userRole = session?.user ? ((session.user as { role?: string }).role || 'user') : null;
  const isAnalystOrAbove = userRole && ['analyst', 'admin', 'editor'].includes(userRole);
  
  // SECURITY: getIncidentById only returns verified incidents for non-analysts
  // If includeUnverified=false (default for non-analysts), only verified incidents are returned
  const incident = await getIncidentById(incidentId, isAnalystOrAbove || false);
  
  if (!incident) {
    // If no incident found, it's either:
    // 1. Doesn't exist at all (404)
    // 2. Exists but unverified, and user is not analyst (also 404 - don't reveal existence)
    notFound();
  }

  const flatData = flattenIncidentData(incident);

  return <IncidentPageClient incident={incident} incidentId={incidentId} flatData={flatData} userRole={userRole} />;
}
