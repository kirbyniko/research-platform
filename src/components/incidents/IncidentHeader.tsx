'use client';

import type { Incident } from '@/types/incident';
import { useState } from 'react';
import { useSourceVisibility } from './SourceToggle';

interface IncidentHeaderProps {
  incident: Incident;
}

// Mini inline evidence display for header fields
function InlineEvidence({ 
  fieldName, 
  fieldQuoteMap 
}: { 
  fieldName: string; 
  fieldQuoteMap?: Record<string, { quote_id: number; quote_text: string; source_id: number; source_title?: string; source_url?: string }[]>;
}) {
  const [show, setShow] = useState(false);
  const { showSources } = useSourceVisibility();
  const evidence = fieldQuoteMap?.[fieldName];
  const hasEvidence = evidence && evidence.length > 0;

  if (!hasEvidence || !showSources) return null;

  return (
    <span className="relative inline-block ml-1">
      <button
        onClick={(e) => { e.preventDefault(); setShow(!show); }}
        className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
        title="View source evidence"
      >
        [{evidence.length}]
      </button>
      {show && (
        <div className="absolute left-0 top-full mt-1 w-96 max-w-screen-sm z-50 p-3 bg-white border-2 border-blue-300 rounded shadow-lg text-xs space-y-2">
          <button 
            onClick={() => setShow(false)} 
            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 font-bold"
          >
            ×
          </button>
          {evidence.map((ev, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-gray-700 italic text-sm">
                &ldquo;{ev.quote_text.substring(0, 200)}{ev.quote_text.length > 200 ? '...' : ''}&rdquo;
              </div>
              {ev.source_url && (
                <a 
                  href={ev.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 underline block"
                >
                  📄 {ev.source_title || 'View source'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

const TYPE_LABELS: Record<string, string> = {
  death_in_custody: 'Death in Custody',
  death_during_operation: 'Death During Operation',
  death_at_protest: 'Death at Protest',
  death: 'Death',
  detention_death: 'Detention Death',
  shooting: 'Shooting',
  excessive_force: 'Excessive Force',
  injury: 'Injury',
  medical_neglect: 'Medical Neglect',
  arrest: 'Arrest',
  rights_violation: 'Rights Violation',
  deportation: 'Deportation',
  family_separation: 'Family Separation',
  workplace_raid: 'Workplace Raid',
  protest_suppression: 'Protest Suppression',
  retaliation: 'Retaliation',
  other: 'Incident',
};

const TYPE_COLORS: Record<string, string> = {
  death_in_custody: 'bg-red-100 text-red-800 border-red-200',
  death_during_operation: 'bg-red-100 text-red-800 border-red-200',
  death_at_protest: 'bg-red-100 text-red-800 border-red-200',
  death: 'bg-red-100 text-red-800 border-red-200',
  detention_death: 'bg-red-100 text-red-800 border-red-200',
  shooting: 'bg-red-200 text-red-900 border-red-300',
  excessive_force: 'bg-orange-100 text-orange-800 border-orange-200',
  injury: 'bg-orange-100 text-orange-800 border-orange-200',
  medical_neglect: 'bg-amber-100 text-amber-800 border-amber-200',
  arrest: 'bg-purple-100 text-purple-800 border-purple-200',
  rights_violation: 'bg-blue-100 text-blue-800 border-blue-200',
  deportation: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  family_separation: 'bg-pink-100 text-pink-800 border-pink-200',
  workplace_raid: 'bg-gray-100 text-gray-800 border-gray-200',
  protest_suppression: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  retaliation: 'bg-rose-100 text-rose-800 border-rose-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function IncidentHeader({ incident }: IncidentHeaderProps) {
  const typeLabel = TYPE_LABELS[incident.incident_type] || incident.incident_type;
  const typeColor = TYPE_COLORS[incident.incident_type] || 'bg-gray-100 text-gray-600 border-gray-200';
  
  const location = [
    incident.location?.facility,
    incident.location?.city,
    incident.location?.state,
    incident.location?.country !== 'USA' ? incident.location?.country : null,
  ].filter(Boolean).join(', ') || 'Location unknown';

  const personName = incident.subject?.name || incident.victim_name || 'Name withheld';
  const nameEvidenceField = incident.field_quote_map?.victim_name ? 'victim_name' : 'subject_name';

  return (
    <header className="border-b border-gray-200 pb-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-sm font-medium px-3 py-1 rounded border ${typeColor}`}>
          {typeLabel}
        </span>
        {incident.verified ? (
          <span className="text-sm bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded">
            ✓ Verified
          </span>
        ) : (
          <span className="text-sm bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded">
            ⏳ Pending Review
          </span>
        )}
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {personName}
        <InlineEvidence fieldName={nameEvidenceField} fieldQuoteMap={incident.field_quote_map} />
        {incident.subject?.age && (
          <span className="text-gray-500 font-normal text-2xl ml-2">
            ({incident.subject.age}
            <InlineEvidence fieldName="subject_age" fieldQuoteMap={incident.field_quote_map} />
            )
          </span>
        )}
      </h1>
      
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span className="text-red-700 font-semibold">
            {incident.date}
            <InlineEvidence fieldName="incident_date" fieldQuoteMap={incident.field_quote_map} />
          </span>
          {incident.date_precision !== 'exact' && (
            <span className="text-gray-400">({incident.date_precision})</span>
          )}
        </div>
        <div>
          {incident.location?.facility && (
            <>
              {incident.location.facility}
              <InlineEvidence fieldName="facility" fieldQuoteMap={incident.field_quote_map} />
              {(incident.location.city || incident.location.state) && ', '}
            </>
          )}
          {incident.location?.city && (
            <>
              {incident.location.city}
              <InlineEvidence fieldName="city" fieldQuoteMap={incident.field_quote_map} />
              {incident.location.state && ', '}
            </>
          )}
          {incident.location?.state && (
            <>
              {incident.location.state}
              <InlineEvidence fieldName="state" fieldQuoteMap={incident.field_quote_map} />
            </>
          )}
          {!incident.location?.facility && !incident.location?.city && !incident.location?.state && 'Location unknown'}
        </div>
        {incident.subject?.nationality && (
          <div>
            Nationality: {incident.subject.nationality}
            <InlineEvidence fieldName="subject_nationality" fieldQuoteMap={incident.field_quote_map} />
          </div>
        )}
        {incident.subject?.occupation && (
          <div>
            Occupation: {incident.subject.occupation}
            <InlineEvidence fieldName="subject_occupation" fieldQuoteMap={incident.field_quote_map} />
          </div>
        )}
      </div>
      
      {incident.summary && (
        <p className="mt-4 text-gray-700 leading-relaxed">
          {incident.summary}
          <InlineEvidence fieldName="summary" fieldQuoteMap={incident.field_quote_map} />
        </p>
      )}
      
      <div className="mt-4 flex flex-wrap gap-2">
        {incident.agencies_involved?.map((agency) => (
          <span 
            key={agency} 
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200"
          >
            {agency.replace(/_/g, ' ').toUpperCase()}
          </span>
        ))}
        {incident.violations_alleged?.map((violation) => (
          <span 
            key={violation} 
            className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200"
          >
            {violation.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        ID: {incident.incident_id} • Created: {incident.created_at} • Updated: {incident.updated_at}
      </div>
    </header>
  );
}
