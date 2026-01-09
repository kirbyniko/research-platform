'use client';

import { useState, useEffect } from 'react';
import { SuggestEditModal } from './SuggestEditModal';

interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select';
  options?: { value: string; label: string }[];
}

interface SuggestEditButtonProps {
  incidentId: number;
  incidentData: Record<string, any>;
}

const EDITABLE_FIELDS: FieldDefinition[] = [
  { name: 'victim_name', label: 'Victim Name', type: 'text' },
  { name: 'victim_age', label: 'Victim Age', type: 'text' },
  { name: 'victim_gender', label: 'Gender', type: 'select', options: [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Non-binary', label: 'Non-binary' },
    { value: 'Unknown', label: 'Unknown' },
  ]},
  { name: 'victim_nationality', label: 'Nationality', type: 'text' },
  { name: 'incident_date', label: 'Incident Date', type: 'date' },
  { name: 'incident_type', label: 'Incident Type', type: 'select', options: [
    { value: 'death_in_custody', label: 'Death in Custody' },
    { value: 'death_during_operation', label: 'Death During Operation' },
    { value: 'shooting', label: 'Shooting' },
    { value: 'excessive_force', label: 'Excessive Force' },
    { value: 'injury', label: 'Injury' },
    { value: 'arrest', label: 'Arrest' },
    { value: 'rights_violation', label: 'Rights Violation' },
  ]},
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'facility_name', label: 'Facility Name', type: 'text' },
  { name: 'facility_type', label: 'Facility Type', type: 'select', options: [
    { value: 'ICE Processing Center', label: 'ICE Processing Center' },
    { value: 'Private Detention Facility', label: 'Private Detention Facility' },
    { value: 'County Jail', label: 'County Jail' },
    { value: 'Federal Prison', label: 'Federal Prison' },
    { value: 'Hospital', label: 'Hospital' },
    { value: 'Other', label: 'Other' },
  ]},
  { name: 'cause_of_death', label: 'Cause of Death', type: 'text' },
  { name: 'manner_of_death', label: 'Manner of Death', type: 'select', options: [
    { value: 'Natural', label: 'Natural' },
    { value: 'Accident', label: 'Accident' },
    { value: 'Suicide', label: 'Suicide' },
    { value: 'Homicide', label: 'Homicide' },
    { value: 'Undetermined', label: 'Undetermined' },
    { value: 'Pending Investigation', label: 'Pending Investigation' },
  ]},
  { name: 'agency', label: 'Agency', type: 'select', options: [
    { value: 'ICE', label: 'ICE' },
    { value: 'CBP', label: 'CBP' },
    { value: 'ICE/CBP', label: 'ICE/CBP Joint' },
    { value: 'Other', label: 'Other' },
  ]},
  { name: 'agency_response', label: 'Agency Response', type: 'textarea' },
  { name: 'medical_conditions', label: 'Medical Conditions', type: 'textarea' },
  { name: 'medical_care_provided', label: 'Medical Care Provided', type: 'textarea' },
  { name: 'family_statement', label: 'Family Statement', type: 'textarea' },
  { name: 'official_statement', label: 'Official Statement', type: 'textarea' },
];

interface User {
  id: number;
  role: string;
}

export function SuggestEditButton({ incidentId, incidentData }: SuggestEditButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldDefinition | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => data ? setUser(data.user) : null)
      .catch(() => null);
  }, []);

  function handleFieldSelect(field: FieldDefinition) {
    setSelectedField(field);
    setShowDropdown(false);
    setShowModal(true);
  }

  function handleSubmitted() {
    setSuccessMessage('Your edit suggestion has been submitted for review!');
    setTimeout(() => setSuccessMessage(''), 5000);
  }

  // Only show for logged-in users
  if (!user) {
    return null;
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Suggest Edit
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto">
              <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                Select a field to edit
              </p>
              {EDITABLE_FIELDS.map(field => (
                <button
                  key={field.name}
                  onClick={() => handleFieldSelect(field)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex justify-between items-center"
                >
                  <span>{field.label}</span>
                  {incidentData[field.name] && (
                    <span className="text-xs text-gray-400 truncate max-w-[100px]">
                      {formatValue(incidentData[field.name])?.substring(0, 20)}...
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          {successMessage}
        </div>
      )}

      {showModal && selectedField && (
        <SuggestEditModal
          incidentId={incidentId}
          fieldName={selectedField.name}
          fieldLabel={selectedField.label}
          currentValue={formatValue(incidentData[selectedField.name])}
          fieldType={selectedField.type}
          options={selectedField.options}
          onClose={() => {
            setShowModal(false);
            setSelectedField(null);
          }}
          onSubmitted={handleSubmitted}
        />
      )}
    </>
  );
}
