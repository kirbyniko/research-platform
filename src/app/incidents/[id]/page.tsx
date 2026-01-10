import { getIncidentById } from '@/lib/incidents-db';
import { notFound, redirect } from 'next/navigation';
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
  
  // Analysts can see unverified incidents, public can only see verified
  const incident = await getIncidentById(incidentId, isAnalystOrAbove || false);
  
  if (!incident) {
    notFound();
  }
  
  // If incident is not verified and user is not analyst+, redirect to auth
  if (!incident.verified && !isAnalystOrAbove) {
    redirect('/auth/login?message=This incident is under review. Sign in as an analyst to view.');
  }

  const flatData = flattenIncidentData(incident);

  return <IncidentPageClient incident={incident} incidentId={incidentId} flatData={flatData} userRole={userRole} />;
}
