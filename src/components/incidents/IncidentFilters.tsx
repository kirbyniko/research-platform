'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { IncidentStats, IncidentType, AgencyType } from '@/types/incident';

interface IncidentFiltersProps {
  stats: IncidentStats;
  currentFilters: Record<string, unknown>;
}

const INCIDENT_TYPES = [
  { value: 'death_in_custody', label: 'Deaths in Custody' },
  { value: 'death_during_operation', label: 'Deaths During Operations' },
  { value: 'death_at_protest', label: 'Deaths at Protests' },
  { value: 'shooting', label: 'Shootings' },
  { value: 'excessive_force', label: 'Excessive Force' },
  { value: 'injury', label: 'Injuries' },
  { value: 'medical_neglect', label: 'Medical Neglect' },
  { value: 'arrest', label: 'Arrests' },
  { value: 'rights_violation', label: 'Rights Violations' },
  { value: 'deportation', label: 'Deportations' },
  { value: 'family_separation', label: 'Family Separations' },
  { value: 'workplace_raid', label: 'Workplace Raids' },
  { value: 'protest_suppression', label: 'Protest Suppression' },
  { value: 'retaliation', label: 'Retaliation' },
  { value: 'other', label: 'Other' },
];

const AGENCIES = [
  { value: 'ice', label: 'ICE' },
  { value: 'cbp', label: 'CBP' },
  { value: 'border_patrol', label: 'Border Patrol' },
  { value: 'ice_ere', label: 'ICE ERO' },
  { value: 'ice_hsi', label: 'ICE HSI' },
  { value: 'local_police', label: 'Local Police' },
  { value: 'state_police', label: 'State Police' },
  { value: 'federal_marshals', label: 'US Marshals' },
  { value: 'dhs', label: 'DHS' },
  { value: 'fbi', label: 'FBI' },
  { value: 'national_guard', label: 'National Guard' },
  { value: 'private_contractor', label: 'Private Contractors' },
];

const VIOLATIONS = [
  { value: '1st_amendment', label: '1st Amendment' },
  { value: '4th_amendment', label: '4th Amendment' },
  { value: '5th_amendment', label: '5th Amendment' },
  { value: '6th_amendment', label: '6th Amendment' },
  { value: '8th_amendment', label: '8th Amendment' },
  { value: '14th_amendment', label: '14th Amendment' },
  { value: 'excessive_force', label: 'Excessive Force' },
  { value: 'wrongful_death', label: 'Wrongful Death' },
  { value: 'civil_rights', label: 'Civil Rights' },
  { value: 'asylum_violation', label: 'Asylum Law' },
];

export function IncidentFilters({ stats, currentFilters }: IncidentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/incidents?${params.toString()}`);
  };

  const toggleArrayFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(key)?.split(',').filter(Boolean) || [];
    
    if (current.includes(value)) {
      const updated = current.filter(v => v !== value);
      if (updated.length > 0) {
        params.set(key, updated.join(','));
      } else {
        params.delete(key);
      }
    } else {
      current.push(value);
      params.set(key, current.join(','));
    }
    
    router.push(`/incidents?${params.toString()}`);
  };

  const currentTypes = (searchParams.get('types')?.split(',') || []).filter(Boolean);
  const currentAgencies = (searchParams.get('agencies')?.split(',') || []).filter(Boolean);
  const currentViolations = (searchParams.get('violations')?.split(',') || []).filter(Boolean);
  const currentVerified = searchParams.get('verified');

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <input
          type="text"
          placeholder="Name, location, facility..."
          defaultValue={searchParams.get('search') || ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateFilter('search', (e.target as HTMLInputElement).value || null);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Incident Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Incident Type
        </label>
        <div className="space-y-1">
          {INCIDENT_TYPES.map((type) => {
            const count = stats.by_type?.[type.value as IncidentType] || 0;
            return (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentTypes.includes(type.value)}
                  onChange={() => toggleArrayFilter('types', type.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{type.label}</span>
                <span className="text-xs text-gray-400">({count})</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Agency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agency Involved
        </label>
        <div className="space-y-1">
          {AGENCIES.map((agency) => {
            const count = stats.by_agency?.[agency.value as AgencyType] || 0;
            return (
              <label key={agency.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentAgencies.includes(agency.value)}
                  onChange={() => toggleArrayFilter('agencies', agency.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{agency.label}</span>
                <span className="text-xs text-gray-400">({count})</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Violations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Violation Alleged
        </label>
        <div className="space-y-1">
          {VIOLATIONS.map((violation) => (
            <label key={violation.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentViolations.includes(violation.value)}
                onChange={() => toggleArrayFilter('violations', violation.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{violation.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* State */}
      {Object.keys(stats.by_state || {}).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          <select
            value={searchParams.get('state') || ''}
            onChange={(e) => updateFilter('state', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All states</option>
            {Object.entries(stats.by_state || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([state, count]) => (
                <option key={state} value={state}>
                  {state} ({count})
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Year */}
      {Object.keys(stats.by_year || {}).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Year
          </label>
          <select
            value={searchParams.get('year') || ''}
            onChange={(e) => updateFilter('year', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All years</option>
            {Object.entries(stats.by_year || {})
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([year, count]) => (
                <option key={year} value={year}>
                  {year} ({count})
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Verified */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Verification Status
        </label>
        <select
          value={currentVerified || ''}
          onChange={(e) => updateFilter('verified', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="true">Verified only</option>
          <option value="false">Unverified only</option>
        </select>
      </div>
    </div>
  );
}
