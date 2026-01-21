'use client';

import { useState, useEffect } from 'react';
import { LEGAL_REFERENCES, VIOLATION_TYPE_TO_LEGAL_REF, VIOLATION_CLASSIFICATIONS, getCaseLawOptions, getLegalReference, LegalCase } from '@/lib/legal-references';

export interface ViolationValue {
  checked: boolean;
  classification: string;
  description: string;
  caselaw: string;
  customCitation: string;
}

interface ViolationCardProps {
  violationType: string;
  name: string;
  subtitle: string;
  value: ViolationValue;
  onChange: (value: ViolationValue) => void;
  disabled?: boolean;
  onLinkQuote?: () => void;
  hasLinkedQuote?: boolean;
}

export function ViolationCard({
  violationType,
  name,
  subtitle,
  value,
  onChange,
  disabled = false,
  onLinkQuote,
  hasLinkedQuote = false
}: ViolationCardProps) {
  const [showDetails, setShowDetails] = useState(value.checked);
  const [showLegalRef, setShowLegalRef] = useState(false);
  
  const caseLawOptions = getCaseLawOptions(violationType);
  const legalRef = getLegalReference(violationType);
  
  useEffect(() => {
    if (value.checked && !showDetails) {
      setShowDetails(true);
    }
  }, [value.checked]);
  
  const handleCheckChange = (checked: boolean) => {
    onChange({ ...value, checked });
    if (checked) {
      setShowDetails(true);
    }
  };
  
  const handleCaseLawChange = (caselaw: string) => {
    onChange({ 
      ...value, 
      caselaw,
      // Clear custom citation if not "custom"
      customCitation: caselaw === 'custom' ? value.customCitation : ''
    });
  };
  
  return (
    <>
      <div className={`border rounded-lg overflow-hidden transition-all ${value.checked ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'}`}>
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <label className="flex items-center gap-3 cursor-pointer flex-1" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={value.checked}
              onChange={e => handleCheckChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div>
              <span className="font-medium text-gray-900">{name}</span>
              <span className="text-gray-500 text-sm ml-2">{subtitle}</span>
            </div>
          </label>
          <div className="flex items-center gap-2">
            {legalRef && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setShowLegalRef(true); }}
                className="text-xs px-2 py-1 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                title="View constitutional text"
              >
                ?
              </button>
            )}
            {onLinkQuote && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onLinkQuote(); }}
                className={`text-xs px-2 py-1 rounded ${hasLinkedQuote ? 'text-green-700 bg-green-100' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                [src]
              </button>
            )}
            <span className={`text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </div>
        
        {/* Details panel */}
        {showDetails && (
          <div className="px-3 pb-3 pt-2 border-t border-gray-200 bg-gray-50 ml-7">
            {/* Classification */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Classification</label>
              <select
                value={value.classification || 'alleged'}
                onChange={e => onChange({ ...value, classification: e.target.value })}
                disabled={disabled}
                className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
              >
                {VIOLATION_CLASSIFICATIONS.map((opt: { value: string; label: string }) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Description */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={value.description || ''}
                onChange={e => onChange({ ...value, description: e.target.value })}
                disabled={disabled}
                rows={2}
                placeholder="Brief description of how this violation applies..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded resize-y"
              />
            </div>
            
            {/* Case Law */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Case Law</label>
              <select
                value={value.caselaw || ''}
                onChange={e => handleCaseLawChange(e.target.value)}
                disabled={disabled}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
              >
                <option value="">Select case law...</option>
                <option value="custom">-- Custom Entry --</option>
                {caseLawOptions.map((opt: { value: string; label: string; citation: string }) => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
              
              {/* Custom citation field */}
              {value.caselaw === 'custom' && (
                <input
                  type="text"
                  value={value.customCitation || ''}
                  onChange={e => onChange({ ...value, customCitation: e.target.value })}
                  disabled={disabled}
                  placeholder="Enter custom citation..."
                  className="w-full mt-2 px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Legal Reference Modal */}
      {showLegalRef && legalRef && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => setShowLegalRef(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{legalRef.name}</h3>
                <button
                  onClick={() => setShowLegalRef(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              {/* Constitutional Text */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Constitutional Text</h4>
                <blockquote className="bg-gray-50 border-l-4 border-blue-500 p-4 text-sm italic">
                  &ldquo;{legalRef.text}&rdquo;
                </blockquote>
                {legalRef.textSource && (
                  <a 
                    href={legalRef.textSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    View source →
                  </a>
                )}
              </div>
              
              {/* Key Cases */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Key Cases</h4>
                <div className="space-y-3">
                  {legalRef.cases.map((c: LegalCase, i: number) => (
                    <div key={i} className="bg-gray-50 p-3 rounded">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-500 text-sm ml-2">({c.citation})</span>
                        </div>
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View case →
                        </a>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 italic">&ldquo;{c.holding}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Application Notes */}
              {legalRef.applicationNotes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Application Notes</h4>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                    {legalRef.applicationNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Container component for rendering all violation cards for a field
interface ViolationsFieldProps {
  value: Record<string, ViolationValue>;
  onChange: (value: Record<string, ViolationValue>) => void;
  violations: Array<{
    type: string;
    name: string;
    subtitle: string;
  }>;
  disabled?: boolean;
}

export function ViolationsField({
  value,
  onChange,
  violations,
  disabled = false
}: ViolationsFieldProps) {
  const selectedCount = Object.values(value || {}).filter(v => v?.checked).length;
  
  const handleViolationChange = (type: string, newValue: ViolationValue) => {
    onChange({
      ...(value || {}),
      [type]: newValue
    });
  };
  
  const getViolationValue = (type: string): ViolationValue => {
    return value?.[type] || {
      checked: false,
      classification: 'alleged',
      description: '',
      caselaw: '',
      customCitation: ''
    };
  };
  
  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        Check violations that apply. Each selected violation can have its own description and case law.
      </p>
      <div className="space-y-2">
        {violations.map(v => (
          <ViolationCard
            key={v.type}
            violationType={v.type}
            name={v.name}
            subtitle={v.subtitle}
            value={getViolationValue(v.type)}
            onChange={newVal => handleViolationChange(v.type, newVal)}
            disabled={disabled}
          />
        ))}
      </div>
      {selectedCount > 0 && (
        <div className="mt-2 text-sm text-blue-600">
          {selectedCount} violation{selectedCount !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

// Default list of constitutional violations (can be customized per project)
export const DEFAULT_VIOLATIONS = [
  { type: '1st_amendment', name: '1st Amendment', subtitle: 'Free Speech/Assembly' },
  { type: '4th_amendment', name: '4th Amendment', subtitle: 'Unreasonable Search/Seizure' },
  { type: '5th_amendment', name: '5th Amendment', subtitle: 'Due Process' },
  { type: '6th_amendment', name: '6th Amendment', subtitle: 'Right to Counsel' },
  { type: '8th_amendment', name: '8th Amendment', subtitle: 'Cruel & Unusual Punishment' },
  { type: '14th_amendment', name: '14th Amendment', subtitle: 'Equal Protection' },
  { type: 'medical_neglect', name: 'Medical Neglect', subtitle: '8th Amendment Application' },
  { type: 'excessive_force', name: 'Excessive Force', subtitle: '4th/14th Amendment Application' },
  { type: 'false_imprisonment', name: 'False Imprisonment', subtitle: 'Civil Rights Violation' },
  { type: 'civil_rights_violation', name: 'Civil Rights Violation', subtitle: '42 U.S.C. § 1983' }
];
