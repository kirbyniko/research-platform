'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LEGAL_REFERENCES, getCaseLawForViolation, VIOLATION_TO_LEGAL_KEY } from '@/lib/legal-references';
import type { LegalCase } from '@/lib/legal-references';
import DuplicateChecker from '@/components/DuplicateChecker';

// Tooltip component
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-400 hover:text-gray-600 cursor-help"
        title="Click for more info"
      >
        ℹ️
      </button>
      {show && (
        <div className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
}

// Types
interface Incident {
  id: number; incident_id: string; incident_type: string; incident_date: string | null;
  city: string | null; state: string | null; country: string | null; facility: string | null;
  victim_name: string | null; subject_name: string | null; subject_age: number | null;
  subject_gender: string | null; subject_nationality: string | null;
  subject_immigration_status: string | null; summary: string | null;
  verified: boolean; verification_status: string;
  first_verified_by?: number | null;
  second_verified_by?: number | null;
}
interface Media { id: number; url: string; media_type: 'image' | 'video'; description: string | null; verified?: boolean; }
interface Source { id: number; url: string; title: string | null; publication: string | null; source_type: string; source_priority?: string | null; }
interface Quote { id: number; quote_text: string; category: string | null; source_id: number | null; linked_fields: string[] | null; source_title?: string | null; source_url?: string | null; verified?: boolean; }
interface Agency { id: number; agency: string; role: string | null; }
interface Violation { id: number; violation_type: string; description: string | null; constitutional_basis: string | null; }
interface TimelineEntry { 
  id: number; 
  event_date?: string | null;
  date?: string | null; 
  description: string; 
  sequence_order: number | null; 
  source_id?: number | null; 
  quote_id?: number | null;
  quote?: { id: number; quote_text: string; source_id?: number };
  source?: { id: number; title?: string; url?: string };
}
interface IncidentDetails { [key: string]: unknown; }

// Field definitions
const INCIDENT_FIELDS: { key: string; label: string; type: string; options?: string[]; tooltip?: string }[] = [
  { key: 'victim_name', label: 'Victim Name', type: 'text' },
  { key: 'incident_date', label: 'Date', type: 'date' },
  { 
    key: 'incident_type', 
    label: 'Type', 
    type: 'select', 
    options: [
      'death_in_custody',
      'death_during_operation',
      'death_at_protest',
      'shooting',
      'excessive_force',
      'injury',
      'arrest',
      'deportation',
      'workplace_raid',
      'family_separation',
      'rights_violation',
      'protest_suppression',
      'retaliation',
      'medical_neglect',
      'other'
    ] 
  },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'facility', label: 'Facility', type: 'text' },
  { key: 'subject_age', label: 'Age', type: 'number' },
  { key: 'subject_gender', label: 'Gender', type: 'text' },
  { key: 'subject_nationality', label: 'Nationality', type: 'text', tooltip: "Victim's country of citizenship/origin (critical for ICE documentation)" },
  { key: 'subject_immigration_status', label: 'Immigration Status', type: 'text' },
  { key: 'summary', label: 'Summary', type: 'textarea' },
];

const LINKABLE_FIELDS = ['victim_name', 'incident_date', 'incident_type', 'city', 'state', 'facility', 'subject_age', 'subject_gender', 'subject_nationality', 'subject_immigration_status', 'summary'];

const AGENCY_OPTIONS = [
  { value: 'ice', label: 'ICE' }, { value: 'ice_ere', label: 'ICE ERO' }, { value: 'cbp', label: 'CBP' },
  { value: 'border_patrol', label: 'Border Patrol' }, { value: 'local_police', label: 'Local Police' },
  { value: 'state_police', label: 'State Police' }, { value: 'federal_marshals', label: 'US Marshals' },
  { value: 'national_guard', label: 'National Guard' }, { value: 'dhs', label: 'DHS' },
  { value: 'private_contractor', label: 'Private Contractor' }, { value: 'other', label: 'Other' }, { value: 'unknown', label: 'Unknown' },
];

const VIOLATION_OPTIONS = [
  { value: '4th_amendment', label: '4th Amendment - Unreasonable Search/Seizure' },
  { value: '5th_amendment_due_process', label: '5th Amendment - Due Process' },
  { value: '8th_amendment', label: '8th Amendment - Cruel & Unusual Punishment' },
  { value: '14th_amendment_equal_protection', label: '14th Amendment - Equal Protection' },
  { value: '1st_amendment', label: '1st Amendment - Free Speech/Assembly' },
  { value: 'medical_neglect', label: 'Medical Neglect' }, { value: 'excessive_force', label: 'Excessive Force' },
  { value: 'false_imprisonment', label: 'False Imprisonment' }, { value: 'civil_rights_violation', label: 'Civil Rights Violation' },
];

// Quote Picker Component - renders inline with each field
function QuotePicker({ field, quotes, fieldQuoteMap, onLinkQuote, onUnlinkQuote, onVerifyQuote, showLinkedDetails = false }: {
  field: string; quotes: Quote[]; fieldQuoteMap: Record<string, number>;
  onLinkQuote: (f: string, qid: number) => void; onUnlinkQuote: (f: string) => void;
  onVerifyQuote?: (quoteId: number) => void;
  showLinkedDetails?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const linkedQuoteId = fieldQuoteMap[field];
  const linkedQuote = linkedQuoteId ? quotes.find(q => q.id === linkedQuoteId) : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowDetails(false);
      }
    }
    if (open || showDetails) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, showDetails]);

  const filteredQuotes = quotes.filter(q => !search || q.quote_text.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setOpen(!open)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${linkedQuote ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
          {linkedQuote ? (
            <>
              <span className="max-w-[150px] truncate">[linked] &ldquo;{linkedQuote.quote_text.substring(0, 25)}...&rdquo;</span>
              {linkedQuote.verified ? (
                <span className="text-green-600" title="Verified">✓</span>
              ) : (
                <span className="text-yellow-600" title="Unverified - click ⓘ to verify">!</span>
              )}
            </>
          ) : <span>[src] Link...</span>}
        </button>
        {linkedQuote && (
          <>
            <button 
              type="button" 
              onClick={() => setShowDetails(!showDetails)}
              className="px-1.5 py-1 text-xs rounded border bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
              title="View quote details"
            >
              ⓘ
            </button>
            <button 
              type="button" 
              onClick={() => onUnlinkQuote(field)}
              className="px-1.5 py-1 text-xs rounded border bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
              title="Unlink quote"
            >
              ✕
            </button>
          </>
        )}
      </div>
      
      {/* Show linked quote details card */}
      {linkedQuote && showLinkedDetails && showDetails && !open && (
        <div className="absolute top-full right-0 z-40 w-80 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
            <span className="text-xs font-medium text-gray-600">Linked Quote</span>
            <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="p-3">
            <div className="flex items-start gap-2">
              <p className="text-sm flex-1">&ldquo;{linkedQuote.quote_text}&rdquo;</p>
            </div>
            <div className="flex gap-2 mt-2 text-xs items-center flex-wrap">
              {linkedQuote.verified === false && (
                <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Unverified</span>
              )}
              {linkedQuote.verified === true && (
                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified ✓</span>
              )}
              {linkedQuote.category && <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{linkedQuote.category}</span>}
            </div>
            <div className="flex gap-2 mt-2 text-xs text-gray-500 items-center flex-wrap">
              {linkedQuote.source_title && <span>{linkedQuote.source_title}</span>}
            </div>
            <div className="flex gap-2 mt-2 border-t pt-2">
              {linkedQuote.source_url && (
                <a href={linkedQuote.source_url} target="_blank" rel="noopener noreferrer" 
                  className="text-xs text-blue-600 hover:underline">
                  View Source →
                </a>
              )}
              {linkedQuote.verified === false && onVerifyQuote && (
                <button 
                  onClick={() => { onVerifyQuote(linkedQuote.id); }}
                  className="text-xs text-green-600 hover:text-green-800 font-medium ml-auto bg-green-50 px-2 py-1 rounded"
                >
                  ✓ Mark as Verified
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {open && (
        <div className="absolute top-full right-0 z-50 w-80 max-h-72 bg-white border rounded-lg shadow-xl overflow-hidden">
          <input type="text" placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border-b text-sm" />
          <div className="max-h-56 overflow-y-auto">
            {filteredQuotes.length === 0 ? <p className="p-4 text-gray-500 text-sm text-center">No quotes yet</p> :
              filteredQuotes.map(q => (
                <div key={q.id} onClick={() => { onLinkQuote(field, q.id); setOpen(false); }}
                  className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${linkedQuoteId === q.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start gap-2">
                    <p className="text-sm flex-1">&ldquo;{q.quote_text}&rdquo;</p>
                    {q.verified === false && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded shrink-0">Unverified</span>
                    )}
                    {q.verified === true && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">✓</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500 items-center">
                    {q.category && <span className="bg-gray-200 px-1 rounded">{q.category}</span>}
                    {q.source_title && <span>{q.source_title}</span>}
                    {q.source_url && (
                      <a href={q.source_url} target="_blank" rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline ml-auto"
                        onClick={e => e.stopPropagation()}>
                        View Source →
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Case Law Picker Component - dropdown for selecting relevant case law
function CaseLawPicker({ 
  violationType, 
  selectedCaseLaw, 
  onSelect 
}: {
  violationType: string;
  selectedCaseLaw: string;
  onSelect: (caseLaw: string, sourceUrl: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewingCase, setViewingCase] = useState<LegalCase | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Map violation type to legal reference key
  const legalKey = (() => {
    if (violationType.includes('4th')) return 'fourth_amendment';
    if (violationType.includes('5th')) return 'fifth_amendment';
    if (violationType.includes('8th')) return 'eighth_amendment';
    if (violationType.includes('14th')) return 'fourteenth_amendment';
    if (violationType.includes('1st')) return 'first_amendment';
    if (violationType.includes('civil_rights')) return 'civil_rights';
    if (violationType.includes('excessive_force')) return 'excessive_force';
    if (violationType.includes('medical_neglect')) return 'medical_neglect';
    return 'civil_rights';
  })();
  
  const cases = getCaseLawForViolation(legalKey);
  const legalRef = LEGAL_REFERENCES[legalKey];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setViewingCase(null);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-2">
        <select 
          className="flex-1 border rounded px-3 py-2 text-sm"
          value={selectedCaseLaw}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'custom') {
              onSelect('', '');
            } else {
              const c = cases.find(c => `${c.name} (${c.citation})` === val);
              onSelect(val, c?.sourceUrl || '');
            }
          }}
        >
          <option value="">Select case law...</option>
          {legalRef && (
            <optgroup label={legalRef.name}>
              {cases.slice(0, legalRef.cases.length).map((c, i) => (
                <option key={i} value={`${c.name} (${c.citation})`}>
                  {c.name} ({c.citation})
                </option>
              ))}
            </optgroup>
          )}
          {cases.length > (legalRef?.cases.length || 0) && (
            <optgroup label="Related Case Law">
              {cases.slice(legalRef?.cases.length || 0).map((c, i) => (
                <option key={`cross-${i}`} value={`${c.name} (${c.citation})`}>
                  {c.name} ({c.citation})
                </option>
              ))}
            </optgroup>
          )}
          <option value="custom">-- Custom Entry --</option>
        </select>
        <button 
          type="button" 
          onClick={() => setOpen(!open)}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          title="View case law details"
        >
          View
        </button>
      </div>
      
      {open && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
          {viewingCase ? (
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-sm">{viewingCase.name}</h4>
                <button onClick={() => setViewingCase(null)} className="text-gray-500 text-sm">← Back</button>
              </div>
              <p className="text-xs text-gray-500 mb-2">{viewingCase.citation}</p>
              <div className="p-3 bg-gray-50 rounded text-sm mb-3">
                <p className="italic">&ldquo;{viewingCase.holding}&rdquo;</p>
              </div>
              <div className="flex gap-2">
                <a href={viewingCase.sourceUrl} target="_blank" rel="noopener noreferrer" 
                  className="text-blue-600 text-sm hover:underline">
                  View Source →
                </a>
                <button 
                  onClick={() => {
                    onSelect(`${viewingCase.name} (${viewingCase.citation})`, viewingCase.sourceUrl);
                    setOpen(false);
                    setViewingCase(null);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Select
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {legalRef && (
                <div className="p-3 bg-blue-50 border-b">
                  <h4 className="font-medium text-sm mb-1">{legalRef.name}</h4>
                  <p className="text-xs text-gray-600 italic">&ldquo;{legalRef.text.substring(0, 200)}...&rdquo;</p>
                  {legalRef.textSource && (
                    <a href={legalRef.textSource} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      Source
                    </a>
                  )}
                </div>
              )}
              {cases.map((c, i) => (
                <div 
                  key={i}
                  onClick={() => setViewingCase(c)}
                  className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.citation}</p>
                    </div>
                    <span className="text-xs text-blue-600">View →</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{c.holding}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Auto-Suggest Quote Cards - shows when actively typing in fields
function QuoteAutoSuggest({ 
  searchValue, 
  quotes, 
  onSelect,
  fieldQuoteMap,
  currentField,
  isTyping,
  onVerifyQuote
}: {
  searchValue: string;
  quotes: Quote[];
  onSelect: (quoteId: number) => void;
  fieldQuoteMap: Record<string, number>;
  currentField: string;
  isTyping: boolean;
  onVerifyQuote?: (quoteId: number) => void;
}) {
  const isLinked = fieldQuoteMap[currentField];
  const linkedQuote = isLinked ? quotes.find(q => q.id === fieldQuoteMap[currentField]) : null;
  
  // Show if actively typing with 2+ chars OR if there's a linked quote
  if (!isTyping && !linkedQuote) return null;
  if (isTyping && (!searchValue || searchValue.length < 2)) return null;
  
  const matchingQuotes = isTyping 
    ? quotes.filter(q => q.quote_text.toLowerCase().includes(searchValue.toLowerCase()))
    : linkedQuote ? [linkedQuote] : [];
  
  if (matchingQuotes.length === 0) return null;
  
  return (
    <div className="mt-2 border rounded-lg bg-white shadow-sm">
      <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
        <span className="text-xs font-medium text-gray-600">
          {isTyping 
            ? `${matchingQuotes.length} quote${matchingQuotes.length !== 1 ? 's' : ''} match "${searchValue.substring(0, 20)}${searchValue.length > 20 ? '...' : ''}"`
            : 'Linked quote'}
        </span>
        {isLinked && <span className="text-xs text-blue-600">✓ Linked</span>}
      </div>
      <div className="max-h-48 overflow-y-auto">
        {matchingQuotes.slice(0, 5).map(q => (
          <div 
            key={q.id}
            className={`p-3 border-b last:border-b-0 transition-colors ${fieldQuoteMap[currentField] === q.id ? 'bg-blue-100' : ''}`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 cursor-pointer hover:bg-blue-50 -m-1 p-1 rounded" onClick={() => onSelect(q.id)}>
                <p className="text-sm line-clamp-2">&ldquo;{q.quote_text}&rdquo;</p>
              </div>
              {q.verified === false && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded shrink-0">Unverified</span>
              )}
            </div>
            <div className="flex gap-2 mt-1 text-xs text-gray-500 items-center">
              {q.category && <span className="bg-gray-200 px-1 rounded">{q.category}</span>}
              {q.source_title && <span>{q.source_title}</span>}
              {q.source_url && (
                <a href={q.source_url} target="_blank" rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline ml-auto"
                  onClick={e => e.stopPropagation()}>
                  View Source →
                </a>
              )}
              {q.verified === false && onVerifyQuote && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onVerifyQuote(q.id); }}
                  className="ml-auto text-green-600 hover:text-green-800 font-medium"
                >
                  Verify
                </button>
              )}
            </div>
          </div>
        ))}
        {matchingQuotes.length > 5 && (
          <div className="px-3 py-2 text-xs text-gray-500 text-center">
            +{matchingQuotes.length - 5} more matches
          </div>
        )}
      </div>
    </div>
  );
}

// Validation Issue type
interface ValidationIssue {
  id: number;
  field_type: string;
  field_name: string;
  issue_reason: string;
  created_at: string;
  created_by_name: string | null;
  created_by_email: string | null;
}

export default function ReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const incidentId = params.id as string;
  const isNewIncident = incidentId === 'new';
  const fromGuest = searchParams.get('from_guest') === 'true';
  const guestDataParam = searchParams.get('guest_data');

  console.log('[ReviewPage] incidentId:', incidentId);
  console.log('[ReviewPage] isNewIncident:', isNewIncident);
  console.log('[ReviewPage] fromGuest:', fromGuest);
  console.log('[ReviewPage] guestDataParam:', guestDataParam ? 'present' : 'missing');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [fieldQuoteMap, setFieldQuoteMap] = useState<Record<string, number>>({});
  const [editedIncident, setEditedIncident] = useState<Record<string, unknown>>({});
  const [incidentDetails, setIncidentDetails] = useState<IncidentDetails>({});
  const [newMedia, setNewMedia] = useState({ url: '', media_type: 'image' as 'image' | 'video', description: '' });
  const [newSource, setNewSource] = useState({ url: '', title: '', publication: '', source_type: 'news', source_priority: 'secondary' });
  const [newQuote, setNewQuote] = useState({ text: '', source_id: '' });
  const [newTimeline, setNewTimeline] = useState({ event_date: '', description: '', quote_id: '' });
  const [editingTimeline, setEditingTimeline] = useState<{ id: number; event_date: string; description: string; quote_id: string } | null>(null);
  const [draggedTimelineId, setDraggedTimelineId] = useState<number | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState({ details: true, typeDetails: true, media: true, agencies: true, violations: true, sources: true, quotes: true, timeline: true });
  const [activeTypingField, setActiveTypingField] = useState<string | null>(null);
  const [verifiedFields, setVerifiedFields] = useState<Record<string, boolean>>({});
  const [verifiedMedia, setVerifiedMedia] = useState<Record<number, boolean>>({});
  const [verifiedSources, setVerifiedSources] = useState<Record<number, boolean>>({});
  const [verifiedQuotes, setVerifiedQuotes] = useState<Record<number, boolean>>({});
  const [verifiedTimeline, setVerifiedTimeline] = useState<Record<number, boolean>>({});
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [editSourceData, setEditSourceData] = useState<any>({});
  const [editQuoteData, setEditQuoteData] = useState<any>({});
  const [highlightUnverified, setHighlightUnverified] = useState(false);
  const [guestSubmissionId, setGuestSubmissionId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteGuestModal, setShowDeleteGuestModal] = useState(false);
  const [deleteGuestId, setDeleteGuestId] = useState<number | null>(null);
  const [deleteGuestReason, setDeleteGuestReason] = useState('');
  const [relatedReports, setRelatedReports] = useState<any[]>([]);
  const [relatedReportsSummary, setRelatedReportsSummary] = useState<{ total: number; transferred: number; pending: number } | null>(null);
  const [showRelatedReports, setShowRelatedReports] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { 
    if (fromGuest && guestDataParam) {
      // Always use guest data when coming from guest submission, even if incident was just created
      initializeFromGuestData();
    } else if (isNewIncident) {
      // New incident without guest data - show empty form
      setLoading(false);
    } else {
      // Existing incident - fetch from database
      fetchData(); 
    }
  }, [incidentId, isNewIncident, fromGuest, guestDataParam]);

  useEffect(() => {
    const map: Record<string, number> = {};
    quotes.forEach(q => { if (q.linked_fields) q.linked_fields.forEach(f => { map[f] = q.id; }); });
    setFieldQuoteMap(map);
  }, [quotes]);

  useEffect(() => {
    // Keep the reviewer checkboxes in sync with current quote list; default unchecked for new items
    setVerifiedQuotes(prev => {
      const next: Record<number, boolean> = {};
      quotes.forEach(q => {
        next[q.id] = prev[q.id] ?? false;
      });
      return next;
    });
  }, [quotes]);

  function initializeFromGuestData() {
    console.log('[initializeFromGuestData] Starting...');
    try {
      const guestData = JSON.parse(guestDataParam!);
      console.log('[initializeFromGuestData] Parsed guest data:', guestData);
      setGuestSubmissionId(guestData.guest_submission_id);
      
      // Create incident object from guest data so page renders
      const incidentFromGuest = {
        id: parseInt(incidentId),
        incident_id: `INC-${incidentId}`,
        incident_type: guestData.incident_type,
        victim_name: guestData.victim_name || '',
        incident_date: guestData.incident_date || '',
        city: guestData.city || '',
        state: guestData.state || '',
        facility: guestData.facility || '',
        summary: guestData.summary || '',
        subject_age: guestData.subject_age || '',
        subject_gender: guestData.subject_gender || '',
        subject_nationality: guestData.subject_nationality || '',
        from_guest_submission: true,
        created_at: new Date().toISOString(),
        created_by: null,
        created_by_email: null
      };
      setIncident(incidentFromGuest as any);
      
      // Set edited incident data - include ALL fields from guest submission
      setEditedIncident({
        incident_type: guestData.incident_type,
        victim_name: guestData.victim_name || '',
        incident_date: guestData.incident_date || '',
        city: guestData.city || '',
        state: guestData.state || '',
        facility: guestData.facility || '',
        summary: guestData.summary || '',
        subject_age: guestData.subject_age || '',
        subject_gender: guestData.subject_gender || '',
        subject_nationality: guestData.subject_nationality || '',
      });
      
      // Convert agencies object {ice: true, cbp: true} to array [{agency: 'ice', role: null}]
      if (guestData.agencies && typeof guestData.agencies === 'object') {
        const agenciesArray = Object.entries(guestData.agencies)
          .filter(([_, val]) => val === true)
          .map(([key]) => ({
            id: -(Math.random() * 1000 | 0), // Temporary negative ID
            agency: key,
            role: null
          }));
        setAgencies(agenciesArray);
        console.log('[initializeFromGuestData] Set agencies array:', agenciesArray);
      }
      
      // Set incident details for extended fields
      setIncidentDetails({
        cause_of_death: guestData.cause_of_death || '',
        manner_of_death: guestData.manner_of_death || '',
        custody_duration: guestData.custody_duration || '',
        medical_denied: guestData.medical_denied || false,
        shots_fired: guestData.shots_fired || '',
        weapon_type: guestData.weapon_type || '',
        bodycam_available: guestData.bodycam_available || false,
        victim_armed: guestData.victim_armed || false,
        shooting_context: guestData.shooting_context || '',
        force_types: guestData.force_types || {},
        victim_restrained: guestData.victim_restrained || false,
        victim_complying: guestData.victim_complying
      });
      
      console.log('[initializeFromGuestData] Set incidentDetails:', {
        cause_of_death: guestData.cause_of_death,
        manner_of_death: guestData.manner_of_death,
        custody_duration: guestData.custody_duration,
        medical_denied: guestData.medical_denied,
        shots_fired: guestData.shots_fired,
        force_types: guestData.force_types
      });

      // Initialize media from guest submission
      if (guestData.media_urls && Array.isArray(guestData.media_urls)) {
        setMedia(guestData.media_urls.map((m: any, idx: number) => ({
          id: -(idx + 1), // Temporary negative IDs for new items
          url: m.url,
          media_type: m.type || 'image',
          description: m.description || '',
          verified: false
        })));
      }

      // Initialize sources from guest submission
      if (guestData.source_urls && Array.isArray(guestData.source_urls)) {
        setSources(guestData.source_urls.map((s: any, idx: number) => {
          // Handle both string URLs and object format {url, title}
          const sourceUrl = typeof s === 'string' ? s : s.url;
          const sourceTitle = typeof s === 'object' ? (s.title || '') : '';
          
          return {
            id: -(idx + 1), // Temporary negative IDs
            url: sourceUrl,
            title: sourceTitle,
            publication: '',
            source_type: 'news',
            source_priority: 'secondary'
          };
        }));
      }

      setLoading(false);
      console.log('[initializeFromGuestData] Success');
    } catch (err) {
      console.error('[initializeFromGuestData] Failed to parse guest data:', err);
      setError('Failed to load guest submission data');
      setLoading(false);
    }
  }

  async function fetchRelatedGuestReports(victimName: string) {
    try {
      const res = await fetch(`/api/guest-submissions/by-name?name=${encodeURIComponent(victimName)}`);
      if (res.ok) {
        const data = await res.json();
        setRelatedGuestReports(data.submissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch related guest reports:', err);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/incidents/${incidentId}/verify-field`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      // Check if this incident was created from a rejected guest submission
      if (data.incident?.guest_submission_id) {
        const guestRes = await fetch(`/api/guest-submissions/${data.incident.guest_submission_id}`);
        if (guestRes.ok) {
          const guestData = await guestRes.json();
          if (guestData.submission?.status === 'rejected') {
            throw new Error('This incident was created from a rejected guest submission and cannot be reviewed');
          }
        }
      }
      
      setIncident(data.incident);
      setMedia(data.media || []);
      setSources(data.sources || []);
      setQuotes(data.quotes || []);
      setAgencies(data.agencies || []);
      setViolations(data.violations || []);
      setTimeline(data.timeline || []);
      setValidationIssues(data.validation_issues || []);
      if (data.incident) {
        setEditedIncident(data.incident);
        // Fetch related guest reports if we have a victim name
        if (data.incident.victim_name && data.incident.victim_name.toLowerCase() !== 'unknown') {
          fetchRelatedGuestReports(data.incident.victim_name);
        }
      }
      
      // Fetch type-specific details
      const detailsRes = await fetch(`/api/incidents/${incidentId}/details`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setIncidentDetails(detailsData.details || {});
      }
      
      // Fetch related guest reports if we have a victim name
      if (data.incident?.victim_name || data.incident?.subject_name) {
        fetchRelatedReports(data.incident.victim_name || data.incident.subject_name);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  async function fetchRelatedReports(name: string) {
    if (!name) return;
    setLoadingRelated(true);
    try {
      const res = await fetch(`/api/guest-submissions/by-name?name=${encodeURIComponent(name)}&excludeIncidentId=${incidentId}`);
      if (res.ok) {
        const data = await res.json();
        setRelatedReports(data.submissions || []);
        setRelatedReportsSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Failed to fetch related reports:', e);
    } finally {
      setLoadingRelated(false);
    }
  }

  async function apiCall(endpoint: string, method: string, body?: unknown) {
    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/${endpoint}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      return await res.json();
    } finally { setSaving(false); }
  }

  async function handleLinkQuote(field: string, quoteId: number) {
    setFieldQuoteMap(prev => ({ ...prev, [field]: quoteId }));
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
      const newLinks = [...new Set([...(quote.linked_fields || []), field])];
      await apiCall('quotes', 'PUT', { quote_id: quoteId, linked_fields: newLinks });
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, linked_fields: newLinks } : q));
    }
  }

  async function handleUnlinkQuote(field: string) {
    const quoteId = fieldQuoteMap[field];
    if (!quoteId) return;
    setFieldQuoteMap(prev => { const next = { ...prev }; delete next[field]; return next; });
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
      const newLinks = (quote.linked_fields || []).filter(f => f !== field);
      await apiCall('quotes', 'PUT', { quote_id: quoteId, linked_fields: newLinks });
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, linked_fields: newLinks } : q));
    }
  }

  async function saveIncidentDetails() {
    await apiCall('', 'PUT', editedIncident);
    setIncident({ ...incident!, ...editedIncident } as Incident);
  }

  async function saveTypeSpecificDetails() {
    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: incidentDetails }),
      });
      if (!res.ok) throw new Error('Failed to save details');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAgency(agencyValue: string) {
    const existing = agencies.find(a => a.agency === agencyValue);
    if (existing) {
      await apiCall('agencies', 'DELETE', { agency_id: existing.id });
      setAgencies(prev => prev.filter(a => a.id !== existing.id));
    } else {
      const result = await apiCall('agencies', 'POST', { agency: agencyValue });
      setAgencies(prev => [...prev, { id: result.id, agency: agencyValue, role: null }]);
    }
  }

  async function toggleViolation(violationValue: string) {
    const existing = violations.find(v => v.violation_type === violationValue);
    if (existing) {
      await apiCall('violations', 'DELETE', { violation_id: existing.id });
      setViolations(prev => prev.filter(v => v.id !== existing.id));
    } else {
      const result = await apiCall('violations', 'POST', { violation_type: violationValue });
      setViolations(prev => [...prev, { id: result.id, violation_type: violationValue, description: null, constitutional_basis: null }]);
    }
  }

  async function addSource() {
    if (!newSource.url) return;
    const result = await apiCall('sources', 'POST', newSource);
    setSources(prev => [...prev, { ...newSource, id: result.id }]);
    setNewSource({ url: '', title: '', publication: '', source_type: 'news', source_priority: 'secondary' });
  }

  async function deleteSource(id: number) {
    if (!confirm('Delete this source?')) return;
    await apiCall('sources', 'DELETE', { source_id: id });
    setSources(prev => prev.filter(s => s.id !== id));
  }

  async function updateSource(id: number, updates: Partial<Source>) {
    await apiCall('sources', 'PUT', { source_id: id, ...updates });
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setEditingSourceId(null);
  }

  async function addMedia() {
    if (!newMedia.url) return;
    if (isNewIncident) {
      // For new incidents, just add to local state
      setMedia(prev => [...prev, { 
        id: -(prev.length + 1), 
        url: newMedia.url,
        media_type: newMedia.media_type,
        description: newMedia.description || null,
        verified: false
      }]);
    } else {
      const result = await apiCall('media', 'POST', newMedia);
      setMedia(prev => [...prev, { ...newMedia, id: result.id, description: newMedia.description || null }]);
    }
    setNewMedia({ url: '', media_type: 'image', description: '' });
  }

  async function deleteMedia(id: number) {
    if (!confirm('Delete this media?')) return;
    if (isNewIncident) {
      setMedia(prev => prev.filter(m => m.id !== id));
    } else {
      await apiCall('media', 'DELETE', { media_id: id });
      setMedia(prev => prev.filter(m => m.id !== id));
    }
  }

  async function updateMedia(id: number, updates: Partial<Media>) {
    if (isNewIncident) {
      setMedia(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    } else {
      await apiCall('media', 'PUT', { media_id: id, ...updates });
      setMedia(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    }
  }

  async function addQuote() {
    if (!newQuote.text) return;
    const payload = { text: newQuote.text, source_id: newQuote.source_id ? Number(newQuote.source_id) : null };
    const result = await apiCall('quotes', 'POST', payload);
    const sourceInfo = newQuote.source_id ? sources.find(s => s.id === Number(newQuote.source_id)) : null;
    setQuotes(prev => [...prev, { id: result.id, quote_text: newQuote.text, category: null, source_id: payload.source_id, linked_fields: null, source_title: sourceInfo?.title || null, verified: false }]);
    setNewQuote({ text: '', source_id: '' });
  }

  async function deleteQuote(id: number) {
    if (!confirm('Delete this quote?')) return;
    await apiCall('quotes', 'DELETE', { quote_id: id });
    setQuotes(prev => prev.filter(q => q.id !== id));
    setFieldQuoteMap(prev => { const next = { ...prev }; Object.keys(next).forEach(k => { if (next[k] === id) delete next[k]; }); return next; });
  }

  async function updateQuote(id: number, updates: any) {
    const payload: any = { quote_id: id };
    if (updates.quote_text !== undefined) payload.quote_text = updates.quote_text;
    if (updates.source_id !== undefined) payload.source_id = updates.source_id;
    await apiCall('quotes', 'PUT', payload);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, quote_text: payload.quote_text ?? q.quote_text, source_id: payload.source_id ?? q.source_id } : q));
    setEditingQuoteId(null);
  }

  function findUnverifiedFields() {
    setHighlightUnverified(true);
    // Check incident_type first
    if (editedIncident.incident_type && !verifiedFields['incident_type']) {
      const element = document.querySelector(`[data-field-key="incident_type"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightUnverified(false), 3000);
        return;
      }
    }
    // Then check other fields
    const firstUnverified = fieldsWithData.find(f => !verifiedFields[f.key]);
    if (firstUnverified) {
      const element = document.querySelector(`[data-field-key="${firstUnverified.key}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setTimeout(() => setHighlightUnverified(false), 3000);
  }

  function findUnverifiedSources() {
    const firstUnverified = sources.find(s => !verifiedSources[s.id]);
    if (firstUnverified) {
      setSectionsOpen(prev => ({ ...prev, sources: true }));
      setTimeout(() => {
        const element = document.querySelector(`[data-source-id="${firstUnverified.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-yellow-400');
          setTimeout(() => element.classList.remove('ring-2', 'ring-yellow-400'), 3000);
        }
      }, 100);
    }
  }

  function findUnverifiedQuotes() {
    const firstUnchecked = quotes.find(q => !verifiedQuotes[q.id]);
    const firstUnverified = quotes.find(q => !q.verified);
    const target = firstUnchecked || firstUnverified;
    if (target) {
      setSectionsOpen(prev => ({ ...prev, quotes: true }));
      setTimeout(() => {
        const element = document.querySelector(`[data-quote-id="${target.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-yellow-400');
          setTimeout(() => element.classList.remove('ring-2', 'ring-yellow-400'), 3000);
        }
      }, 100);
    }
  }

  function findUnverifiedTimeline() {
    const firstUnverified = timeline.find(t => !verifiedTimeline[t.id]);
    if (firstUnverified) {
      setSectionsOpen(prev => ({ ...prev, timeline: true }));
      setTimeout(() => {
        const element = document.querySelector(`[data-timeline-id="${firstUnverified.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-yellow-400');
          setTimeout(() => element.classList.remove('ring-2', 'ring-yellow-400'), 3000);
        }
      }, 100);
    }
  }

  function findFieldsWithoutQuotes() {
    const keyFields = ['victim_name', 'incident_date', 'city', 'state', 'summary'];
    const firstUnlinked = keyFields.find(field => {
      const value = (editedIncident as any)[field] || (incident as any)?.[field];
      return value && !fieldQuoteMap[field];
    });
    
    if (firstUnlinked) {
      setSectionsOpen(prev => ({ ...prev, fields: true }));
      setTimeout(() => {
        const element = document.querySelector(`[data-field-key="${firstUnlinked}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-red-400', 'bg-red-50');
          setTimeout(() => element.classList.remove('ring-4', 'ring-red-400', 'bg-red-50'), 4000);
        }
      }, 100);
    }
  }

  function findQuotesWithoutSources() {
    const firstWithoutSource = quotes.find(q => !q.source_id);
    if (firstWithoutSource) {
      setSectionsOpen(prev => ({ ...prev, quotes: true }));
      setTimeout(() => {
        const element = document.querySelector(`[data-quote-id="${firstWithoutSource.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-red-400', 'bg-red-50');
          setTimeout(() => element.classList.remove('ring-4', 'ring-red-400', 'bg-red-50'), 4000);
        }
      }, 100);
    }
  }

  function findUnverifiedQuotesData() {
    const firstUnverified = quotes.find(q => !q.verified);
    if (firstUnverified) {
      setSectionsOpen(prev => ({ ...prev, quotes: true }));
      setTimeout(() => {
        const element = document.querySelector(`[data-quote-id="${firstUnverified.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-orange-400', 'bg-orange-50');
          setTimeout(() => element.classList.remove('ring-4', 'ring-orange-400', 'bg-orange-50'), 4000);
        }
      }, 100);
    }
  }

  // Handle typing state for auto-suggest
  function handleFieldChange(fieldKey: string, value: string | number | null) {
    setEditedIncident(prev => ({ ...prev, [fieldKey]: value }));
    setActiveTypingField(fieldKey);
    
    // Clear typing state after 2 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setActiveTypingField(null);
    }, 2000);
  }

  // Verify an unverified quote
  async function verifyQuote(quoteId: number) {
    try {
      await apiCall('quotes', 'PATCH', { quote_id: quoteId, verified: true });
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, verified: true } : q));
    } catch (err) {
      console.error('Failed to verify quote:', err);
    }
  }

  async function addTimelineEntry() {
    if (!newTimeline.description) return;
    const maxOrder = timeline.length > 0 ? Math.max(...timeline.map(t => t.sequence_order || 0)) : 0;
    const payload = { event_date: newTimeline.event_date || null, description: newTimeline.description, sequence_order: maxOrder + 1, quote_id: newTimeline.quote_id ? Number(newTimeline.quote_id) : null };
    const result = await apiCall('timeline', 'POST', payload);
    const newEntry: TimelineEntry = {
      id: result.id,
      date: payload.event_date || undefined,
      description: payload.description,
      quote_id: payload.quote_id || undefined,
      sequence_order: payload.sequence_order,
    };
    setTimeline(prev => [...prev, newEntry]);
    setNewTimeline({ event_date: '', description: '', quote_id: '' });
  }

  async function updateTimelineEntry() {
    if (!editingTimeline || !editingTimeline.description) return;
    const payload = { entry_id: editingTimeline.id, event_date: editingTimeline.event_date || null, description: editingTimeline.description, quote_id: editingTimeline.quote_id ? Number(editingTimeline.quote_id) : null };
    await apiCall('timeline', 'PUT', payload);
    setTimeline(prev => prev.map(t => t.id === editingTimeline.id ? { ...t, event_date: payload.event_date, description: payload.description, quote_id: payload.quote_id } : t));
    setEditingTimeline(null);
  }

  async function reorderTimeline(draggedId: number, targetId: number) {
    const draggedIndex = timeline.findIndex(t => t.id === draggedId);
    const targetIndex = timeline.findIndex(t => t.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...timeline];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Reassign sequence_order
    const updated = reordered.map((t, i) => ({ ...t, sequence_order: i + 1 }));
    setTimeline(updated);

    // Save all updated sequence orders
    try {
      setSaving(true);
      await Promise.all(updated.map(t => 
        fetch(`/api/incidents/${incidentId}/timeline`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry_id: t.id, sequence_order: t.sequence_order })
        })
      ));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTimelineEntry(id: number) {
    if (!confirm('Delete this entry?')) return;
    await apiCall('timeline', 'DELETE', { entry_id: id });
    setTimeline(prev => prev.filter(t => t.id !== id));
  }

  async function handleDeleteGuestSubmission() {
    if (!deleteGuestId || !deleteGuestReason.trim()) {
      alert('Please provide a reason for deletion');
      return;
    }

    try {
      const response = await fetch(`/api/guest-submissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteGuestId,
          deleted_at: new Date().toISOString(),
          deletion_reason: deleteGuestReason
        })
      });

      if (!response.ok) throw new Error('Failed to delete submission');

      // Refresh related reports list
      const name = incident?.victim_name || incident?.subject_name;
      if (name) {
        await fetchRelatedReports(name);
      }

      // Close modal and reset state
      setShowDeleteGuestModal(false);
      setDeleteGuestId(null);
      setDeleteGuestReason('');
      
      alert('Guest submission marked for deletion');
    } catch (err) {
      console.error('Error deleting guest submission:', err);
      alert('Failed to delete submission');
    }
  }

  const toggleSection = (s: keyof typeof sectionsOpen) => setSectionsOpen(prev => ({ ...prev, [s]: !prev[s] }));

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!incident && !isNewIncident) return <div className="p-8">Not found</div>;

  // Helper to check if a field has real data (not placeholder)
  const hasRealData = (key: string, val: any) => {
    if (val === null || val === undefined || val === '') return false;
    // Check for date placeholders
    if (typeof val === 'string' && (val === 'mm/dd/yyyy' || val === 'MM/DD/YYYY' || val.match(/^[mMdDyY\/]+$/))) return false;
    return true;
  };

  const fieldsWithData = INCIDENT_FIELDS.filter(f => {
    if (f.key === 'incident_type') return false; // Exclude incident_type from regular fields
    const val = editedIncident[f.key];
    return hasRealData(f.key, val);
  });
  
  // Handle incident_type separately since it's always present
  const hasIncidentType = !!editedIncident.incident_type;
  const totalFieldsCount = fieldsWithData.length + (hasIncidentType ? 1 : 0);
  const incidentTypeVerified = hasIncidentType ? (verifiedFields['incident_type'] || false) : true;
  const verifiedCount = fieldsWithData.filter(f => verifiedFields[f.key]).length + (hasIncidentType && incidentTypeVerified ? 1 : 0);
  const allFieldsVerified = totalFieldsCount === 0 || verifiedCount === totalFieldsCount;
  
  const verifiedSourcesCount = Object.values(verifiedSources).filter(Boolean).length;
  const verifiedQuotesCount = quotes.filter(q => q.verified).length;
  const verifiedTimelineCount = Object.values(verifiedTimeline).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {saving && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm z-50">Saving...</div>}
      
      {loading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded mb-4">{error}</div>}
      
      {!loading && !error && (
        <>
          {/* Validation Issues Alert - Show if case was returned from validation */}
          {validationIssues.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔄</span>
            <div className="flex-1">
              <h3 className="font-bold text-orange-800 text-lg">Returned from Validation</h3>
              <p className="text-orange-700 text-sm mb-3">
                This case was returned with {validationIssues.length} issue{validationIssues.length !== 1 ? 's' : ''} to address:
              </p>
              <div className="space-y-2">
                {validationIssues.map((issue) => (
                  <div key={issue.id} className="p-3 bg-white rounded border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        issue.field_type === 'field' ? 'bg-blue-100 text-blue-700' :
                        issue.field_type === 'quote' ? 'bg-purple-100 text-purple-700' :
                        issue.field_type === 'timeline' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {issue.field_type}
                      </span>
                      <span className="font-medium text-gray-800">
                        {issue.field_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{issue.issue_reason}</p>
                    {issue.created_by_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Flagged by {issue.created_by_name} on {new Date(issue.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 pb-4 border-b">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">← Back to Queue</Link>
        <h1 className="text-2xl font-bold mt-2">
          {isNewIncident ? 'New Incident Review' : (incident?.victim_name || incident?.subject_name || 'Unknown')}
        </h1>
        <p className="text-gray-500 text-sm">
          {isNewIncident ? 'Creating from guest submission' : `${incident?.incident_id} • ${incident?.incident_type}`}
        </p>
        {!isNewIncident && incident && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${incident.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {incident.verification_status || (incident.verified ? 'verified' : 'unverified')}
            </span>
          <div className="inline-flex items-center gap-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${allFieldsVerified ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              Fields: {verifiedCount}/{totalFieldsCount}
            </span>
            {!allFieldsVerified && (
              <button 
                onClick={findUnverifiedFields}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                title="Find unverified fields"
              >
                Find
              </button>
            )}
          </div>
          <div className="inline-flex items-center gap-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${verifiedSourcesCount === sources.length && sources.length > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              Sources: {verifiedSourcesCount}/{sources.length}
            </span>
            {verifiedSourcesCount < sources.length && sources.length > 0 && (
              <button onClick={findUnverifiedSources} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium" title="Find unverified sources">Find</button>
            )}
          </div>
          <div className="inline-flex items-center gap-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${verifiedQuotesCount === quotes.length && quotes.length > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              Quotes: {verifiedQuotesCount}/{quotes.length}
            </span>
            {verifiedQuotesCount < quotes.length && quotes.length > 0 && (
              <button onClick={findUnverifiedQuotes} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium" title="Find unverified quotes">Find</button>
            )}
          </div>
          <div className="inline-flex items-center gap-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${verifiedTimelineCount === timeline.length && timeline.length > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              Timeline: {verifiedTimelineCount}/{timeline.length}
            </span>
            {verifiedTimelineCount < timeline.length && timeline.length > 0 && (
              <button onClick={findUnverifiedTimeline} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium" title="Find unverified timeline events">Find</button>
            )}
          </div>
          </div>
        )}
        {isNewIncident && (
          <div className="bg-blue-50 border border-blue-300 text-blue-800 p-3 rounded-lg mt-2">
            <p className="text-sm"><strong>📝 New Incident:</strong> Fill in the details below, then click "Create & Continue Review" to save and continue the review process.</p>
          </div>
        )}
      </div>

      {/* Related Guest Reports Section */}
      {!isNewIncident && relatedReportsSummary && relatedReportsSummary.total > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowRelatedReports(!showRelatedReports)}
            className="w-full flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="font-medium text-indigo-800">
                {relatedReportsSummary.total} Related Guest Report{relatedReportsSummary.total !== 1 ? 's' : ''} Found
              </span>
              {relatedReportsSummary.pending > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                  {relatedReportsSummary.pending} pending
                </span>
              )}
              {relatedReportsSummary.transferred > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                  {relatedReportsSummary.transferred} transferred
                </span>
              )}
            </div>
            <span className={`transform transition-transform ${showRelatedReports ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {showRelatedReports && (
            <div className="mt-2 border border-indigo-200 rounded-lg max-h-96 overflow-y-auto">
              {loadingRelated ? (
                <div className="p-4 text-center text-gray-500">Loading related reports...</div>
              ) : (
                <div className="divide-y divide-indigo-100">
                  {relatedReports.map((report, idx) => (
                    <div key={report.id} className={`p-4 ${report.transfer_status === 'transferred' ? 'bg-gray-50' : 'bg-white'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">#{idx + 1}: {report.subject_name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              report.transfer_status === 'transferred' ? 'bg-green-100 text-green-700' :
                              report.transfer_status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {report.transfer_status}
                            </span>
                            {report.incident_type && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {report.incident_type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          
                          {report.date_of_incident && (
                            <p className="text-sm text-gray-600">📅 {new Date(report.date_of_incident).toLocaleDateString()}</p>
                          )}
                          {report.facility_location && (
                            <p className="text-sm text-gray-600">📍 {report.facility_location}</p>
                          )}
                          
                          {report.description && (
                            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{report.description}</p>
                          )}
                          
                          {report.source_urls && report.source_urls.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {report.source_urls.slice(0, 3).map((s: any, i: number) => {
                                const url = typeof s === 'string' ? s : s.url;
                                return (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                                    Source {i + 1} →
                                  </a>
                                );
                              })}
                              {report.source_urls.length > 3 && (
                                <span className="text-xs text-gray-500 px-2 py-1">+{report.source_urls.length - 3} more</span>
                              )}
                            </div>
                          )}
                          
                          {report.notes && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                              <strong>Notes:</strong> {report.notes}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right text-xs text-gray-500 shrink-0">
                            <p>Submitted {new Date(report.created_at).toLocaleDateString()}</p>
                            {report.submitter_email && <p>by {report.submitter_email}</p>}
                            {report.transferred_to_incident_id && (
                              <p className="mt-1 text-green-600">→ Incident #{report.transferred_to_incident_id}</p>
                            )}
                          </div>
                          {report.transfer_status !== 'transferred' && (
                            <button
                              onClick={() => {
                                setDeleteGuestId(report.id);
                                setShowDeleteGuestModal(true);
                              }}
                              className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition-colors"
                              title="Soft delete this submission"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Guest Submission Modal */}
      {showDeleteGuestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowDeleteGuestModal(false); setDeleteGuestId(null); setDeleteGuestReason(''); }}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-red-600">Soft Delete Guest Submission</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will mark the guest submission for deletion (soft delete). Only administrators can permanently delete submissions.
            </p>
            <label className="block text-sm font-medium mb-2">Reason for deletion *</label>
            <textarea
              value={deleteGuestReason}
              onChange={e => setDeleteGuestReason(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4 text-sm"
              rows={3}
              placeholder="E.g., duplicate, spam, unrelated..."
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowDeleteGuestModal(false); setDeleteGuestId(null); setDeleteGuestReason(''); }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGuestSubmission}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Checker Tool */}
      <div className="mb-6">
        <DuplicateChecker
          initialQuery={editedIncident.victim_name || editedIncident.subject_name || ''}
          excludeIncidentId={incident?.id}
          showSources={true}
          className="shadow-sm"
        />
      </div>

      {/* Details Section */}
      <Section title="Incident Details" open={sectionsOpen.details} onToggle={() => toggleSection('details')}>
        {/* Incident Type - Make it prominent */}
        <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded" data-field-key="incident_type">
          <div className="flex items-center justify-between mb-2">
            <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 transition-all ${editedIncident.incident_type && !verifiedFields['incident_type'] && highlightUnverified ? 'bg-yellow-200 px-2 py-1 rounded animate-pulse' : ''}`}>
              Incident Type *
              {editedIncident.incident_type ? (
                <input 
                  type="checkbox" 
                  checked={verifiedFields['incident_type'] || false}
                  onChange={(e) => setVerifiedFields(prev => ({ ...prev, incident_type: e.target.checked }))}
                  className="w-4 h-4"
                  title="Check to confirm you've verified this field"
                />
              ) : null}
            </label>
            <QuotePicker field="incident_type" quotes={quotes} fieldQuoteMap={fieldQuoteMap} onLinkQuote={handleLinkQuote} onUnlinkQuote={handleUnlinkQuote} onVerifyQuote={verifyQuote} showLinkedDetails />
          </div>
          <select 
            className="w-full border-2 border-blue-500 rounded px-3 py-2 text-sm font-medium"
            value={String(editedIncident.incident_type || '')}
            onChange={e => setEditedIncident({ ...editedIncident, incident_type: e.target.value })}
          >
            <option value="">Select type...</option>
            <optgroup label="Deaths">
              <option value="death_in_custody">Death in Custody</option>
              <option value="death_during_operation">Death During Operation</option>
              <option value="death_at_protest">Death at Protest</option>
              <option value="death">Death (General)</option>
              <option value="detention_death">Detention Death</option>
            </optgroup>
            <optgroup label="Force/Violence">
              <option value="shooting">Shooting</option>
              <option value="excessive_force">Excessive Force</option>
              <option value="injury">Injury</option>
            </optgroup>
            <optgroup label="Enforcement">
              <option value="arrest">Arrest/Detention</option>
              <option value="deportation">Deportation</option>
              <option value="workplace_raid">Workplace Raid</option>
              <option value="family_separation">Family Separation</option>
            </optgroup>
            <optgroup label="Rights Issues">
              <option value="rights_violation">Rights Violation</option>
              <option value="protest_suppression">Protest Suppression</option>
              <option value="retaliation">Retaliation</option>
              <option value="medical_neglect">Medical Neglect</option>
            </optgroup>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {INCIDENT_FIELDS.filter(f => f.key !== 'incident_type').map(f => {
            const showAutoSuggest = ['victim_name', 'facility', 'city', 'summary'].includes(f.key);
            
            // Format date values correctly for date inputs (YYYY-MM-DD format)
            let fieldValue = '';
            if (f.type === 'date' && editedIncident[f.key]) {
              try {
                const dateObj = new Date(editedIncident[f.key] as string);
                fieldValue = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
              } catch (e) {
                fieldValue = String(editedIncident[f.key] || '');
              }
            } else {
              fieldValue = String(editedIncident[f.key] || '');
            }
            
            const isTypingThisField = activeTypingField === f.key;
            
            // Check if field has real data
            const rawValue = editedIncident[f.key];
            const hasValue = (() => {
              if (rawValue === null || rawValue === undefined || rawValue === '') return false;
              // Check for date placeholders (should never happen now with proper formatting)
              if (typeof rawValue === 'string' && (rawValue === 'mm/dd/yyyy' || rawValue === 'MM/DD/YYYY' || rawValue.match(/^[mMdDyY\\/]+$/))) return false;
              return true;
            })();
            
            const isVerified = verifiedFields[f.key] || false;
            const isUnverified = hasValue && !isVerified;
            return (
            <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''} data-field-key={f.key}>
              <label className={`block text-xs text-gray-500 mb-1 flex items-center gap-2 transition-all ${isUnverified && highlightUnverified ? 'bg-yellow-200 px-2 py-1 rounded animate-pulse' : ''}`}>
                {f.label}
                {f.tooltip && <Tooltip text={f.tooltip} />}
                {hasValue && (
                  <input 
                    type="checkbox" 
                    checked={isVerified}
                    onChange={(e) => setVerifiedFields(prev => ({ ...prev, [f.key]: e.target.checked }))}
                    className="w-4 h-4"
                    title="Check to confirm you've verified this field"
                  />
                )}
              </label>
              <div className="flex gap-2 items-start">
                {f.type === 'textarea' ? (
                  <textarea className="flex-1 border rounded px-3 py-2 text-sm" rows={3} value={fieldValue}
                    onChange={e => handleFieldChange(f.key, e.target.value)} />
                ) : f.type === 'select' ? (
                  <select className="flex-1 border rounded px-3 py-2 text-sm" value={fieldValue}
                    onChange={e => handleFieldChange(f.key, e.target.value)}>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} className="flex-1 border rounded px-3 py-2 text-sm" value={fieldValue}
                    onChange={e => handleFieldChange(f.key, f.type === 'number' ? (Number(e.target.value) || null) : e.target.value)} />
                )}
                {LINKABLE_FIELDS.includes(f.key) && <QuotePicker field={f.key} quotes={quotes} fieldQuoteMap={fieldQuoteMap} onLinkQuote={handleLinkQuote} onUnlinkQuote={handleUnlinkQuote} onVerifyQuote={verifyQuote} showLinkedDetails />}
              </div>
              {/* Auto-suggest quotes when typing in key fields or when a quote is linked */}
              {showAutoSuggest && (
                <QuoteAutoSuggest 
                  searchValue={fieldValue}
                  quotes={quotes}
                  fieldQuoteMap={fieldQuoteMap}
                  currentField={f.key}
                  isTyping={isTypingThisField}
                  onSelect={(qid) => handleLinkQuote(f.key, qid)}
                  onVerifyQuote={verifyQuote}
                />
              )}
            </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveIncidentDetails} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Save Details</button>
        </div>
      </Section>

      {/* Type-Specific Details Section - Uses editedIncident for dynamic switching */}
      {(() => {
        const currentType = String(editedIncident.incident_type || incident?.incident_type || '');
        const showTypeDetails = ['shooting', 'death_in_custody', 'death_during_operation', 'death_at_protest', 'death', 'detention_death', 'arrest', 'excessive_force', 'injury', 'medical_neglect', 'protest_suppression'].includes(currentType);
        
        if (!showTypeDetails) return null;
        
        const typeLabel = currentType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        return (
          <Section title={`${typeLabel} Details`} open={sectionsOpen.typeDetails} onToggle={() => toggleSection('typeDetails')}>
            {currentType === 'shooting' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1">Fatal</label>
                <input type="checkbox" checked={!!incidentDetails.shooting_fatal} onChange={e => setIncidentDetails({ ...incidentDetails, shooting_fatal: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Shots Fired</label>
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.shots_fired || '')} onChange={e => setIncidentDetails({ ...incidentDetails, shots_fired: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Weapon Type</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.weapon_type || '')} onChange={e => setIncidentDetails({ ...incidentDetails, weapon_type: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="handgun">Handgun</option>
                  <option value="rifle">Rifle</option>
                  <option value="taser">Taser</option>
                  <option value="less_lethal">Less-lethal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Victim Armed</label>
                <input type="checkbox" checked={!!incidentDetails.victim_armed} onChange={e => setIncidentDetails({ ...incidentDetails, victim_armed: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Warning Given</label>
                <input type="checkbox" checked={!!incidentDetails.warning_given} onChange={e => setIncidentDetails({ ...incidentDetails, warning_given: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Bodycam Available</label>
                <input type="checkbox" checked={!!incidentDetails.bodycam_available} onChange={e => setIncidentDetails({ ...incidentDetails, bodycam_available: e.target.checked })} className="w-4 h-4" />
              </div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Context</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={String(incidentDetails.shooting_context || '')} onChange={e => setIncidentDetails({ ...incidentDetails, shooting_context: e.target.value })} />
              </div>
            </div>
          )}
          {['death_in_custody', 'death_during_operation', 'death_at_protest', 'death', 'detention_death'].includes(currentType) && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1">Cause of Death</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.cause_of_death || '')} onChange={e => setIncidentDetails({ ...incidentDetails, cause_of_death: e.target.value })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Official Cause</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.official_cause || '')} onChange={e => setIncidentDetails({ ...incidentDetails, official_cause: e.target.value })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Autopsy Available</label>
                <input type="checkbox" checked={!!incidentDetails.autopsy_available} onChange={e => setIncidentDetails({ ...incidentDetails, autopsy_available: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Medical Neglect Alleged</label>
                <input type="checkbox" checked={!!incidentDetails.medical_neglect_alleged} onChange={e => setIncidentDetails({ ...incidentDetails, medical_neglect_alleged: e.target.checked })} className="w-4 h-4" />
              </div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Circumstances</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={String(incidentDetails.death_circumstances || '')} onChange={e => setIncidentDetails({ ...incidentDetails, death_circumstances: e.target.value })} />
              </div>
            </div>
          )}
          {currentType === 'arrest' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Arrest Reason</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.arrest_reason || '')} onChange={e => setIncidentDetails({ ...incidentDetails, arrest_reason: e.target.value })} />
              </div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Charges</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.arrest_charges || '')} onChange={e => setIncidentDetails({ ...incidentDetails, arrest_charges: e.target.value })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Warrant Present</label>
                <input type="checkbox" checked={!!incidentDetails.warrant_present} onChange={e => setIncidentDetails({ ...incidentDetails, warrant_present: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Selective Enforcement</label>
                <input type="checkbox" checked={!!incidentDetails.selective_enforcement} onChange={e => setIncidentDetails({ ...incidentDetails, selective_enforcement: e.target.checked })} className="w-4 h-4" />
              </div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Context</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={String(incidentDetails.arrest_context || '')} onChange={e => setIncidentDetails({ ...incidentDetails, arrest_context: e.target.value })} />
              </div>
            </div>
          )}
          {(currentType === 'excessive_force' || currentType === 'injury') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-2">Force Types Used</label>
                <div className="flex flex-wrap gap-3">
                  {['physical', 'taser', 'pepper_spray', 'baton', 'rubber_bullets', 'chokehold', 'knee_on_neck'].map(ft => (
                    <label key={ft} className="flex items-center gap-1 text-sm">
                      <input 
                        type="checkbox" 
                        checked={Array.isArray(incidentDetails.force_types) && incidentDetails.force_types.includes(ft)}
                        onChange={e => {
                          const current = Array.isArray(incidentDetails.force_types) ? incidentDetails.force_types : [];
                          const updated = e.target.checked 
                            ? [...current, ft] 
                            : current.filter((t: string) => t !== ft);
                          setIncidentDetails({ ...incidentDetails, force_types: updated });
                        }}
                        className="w-4 h-4"
                      />
                      {ft.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Injuries Sustained</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.injuries_sustained || '')} onChange={e => setIncidentDetails({ ...incidentDetails, injuries_sustained: e.target.value })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Victim Restrained</label>
                <input type="checkbox" checked={!!incidentDetails.victim_restrained} onChange={e => setIncidentDetails({ ...incidentDetails, victim_restrained: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Victim Complying</label>
                <input type="checkbox" checked={!!incidentDetails.victim_complying} onChange={e => setIncidentDetails({ ...incidentDetails, victim_complying: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Video Evidence Available</label>
                <input type="checkbox" checked={!!incidentDetails.video_evidence} onChange={e => setIncidentDetails({ ...incidentDetails, video_evidence: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Hospitalization Required</label>
                <input type="checkbox" checked={!!incidentDetails.hospitalization_required} onChange={e => setIncidentDetails({ ...incidentDetails, hospitalization_required: e.target.checked })} className="w-4 h-4" />
              </div>
            </div>
          )}
          {currentType === 'medical_neglect' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Medical Condition</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.medical_condition || '')} onChange={e => setIncidentDetails({ ...incidentDetails, medical_condition: e.target.value })} />
              </div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Treatment Denied</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={String(incidentDetails.treatment_denied || '')} onChange={e => setIncidentDetails({ ...incidentDetails, treatment_denied: e.target.value })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Requests Documented</label>
                <input type="checkbox" checked={!!incidentDetails.requests_documented} onChange={e => setIncidentDetails({ ...incidentDetails, requests_documented: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Resulted in Death</label>
                <input type="checkbox" checked={!!incidentDetails.resulted_in_death} onChange={e => setIncidentDetails({ ...incidentDetails, resulted_in_death: e.target.checked })} className="w-4 h-4" />
              </div>
            </div>
          )}
          {currentType === 'protest_suppression' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Protest Topic</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.protest_topic || '')} onChange={e => setIncidentDetails({ ...incidentDetails, protest_topic: e.target.value })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Protest Size</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g., 50-100" value={String(incidentDetails.protest_size || '')} onChange={e => setIncidentDetails({ ...incidentDetails, protest_size: e.target.value })} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Permit Obtained</label>
                <input type="checkbox" checked={!!incidentDetails.permitted} onChange={e => setIncidentDetails({ ...incidentDetails, permitted: e.target.checked })} className="w-4 h-4" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Dispersal Method</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.dispersal_method || '')} onChange={e => setIncidentDetails({ ...incidentDetails, dispersal_method: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="tear_gas">Tear Gas</option>
                  <option value="pepper_spray">Pepper Spray</option>
                  <option value="rubber_bullets">Rubber Bullets</option>
                  <option value="batons">Batons</option>
                  <option value="sound_cannons">Sound Cannons (LRAD)</option>
                  <option value="mass_arrest">Mass Arrest</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Arrests Made</label>
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={String(incidentDetails.arrests_made || '')} onChange={e => setIncidentDetails({ ...incidentDetails, arrests_made: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={saveTypeSpecificDetails} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Save Type-Specific Details</button>
          </div>
        </Section>
      );
      })()}

      {/* Agencies Section */}
      <Section title={`Agencies Involved (${agencies.length})`} open={sectionsOpen.agencies} onToggle={() => toggleSection('agencies')}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AGENCY_OPTIONS.map(opt => (
            <div key={opt.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
                <input type="checkbox" checked={agencies.some(a => a.agency === opt.value)} onChange={() => toggleAgency(opt.value)} className="w-4 h-4" />
                {opt.label}
              </label>
              <QuotePicker field={`agency_${opt.value}`} quotes={quotes} fieldQuoteMap={fieldQuoteMap} onLinkQuote={handleLinkQuote} onUnlinkQuote={handleUnlinkQuote} onVerifyQuote={verifyQuote} showLinkedDetails />
            </div>
          ))}
        </div>
      </Section>

      {/* Violations Section */}
      <Section title={`Constitutional Violations (${violations.length})`} open={sectionsOpen.violations} onToggle={() => toggleSection('violations')}>
        <div className="space-y-3">
          {VIOLATION_OPTIONS.map(opt => {
            const violation = violations.find(v => v.violation_type === opt.value);
            const isChecked = !!violation;
            return (
              <div key={opt.value} className="border rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm font-medium">
                    <input type="checkbox" checked={isChecked} onChange={() => toggleViolation(opt.value)} className="w-4 h-4" />
                    {opt.label}
                  </label>
                  <QuotePicker field={`violation_${opt.value}`} quotes={quotes} fieldQuoteMap={fieldQuoteMap} onLinkQuote={handleLinkQuote} onUnlinkQuote={handleUnlinkQuote} onVerifyQuote={verifyQuote} showLinkedDetails />
                </div>
                {isChecked && violation && (
                  <div className="mt-2 space-y-3 pl-6">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <textarea 
                        className="w-full border rounded px-3 py-2 text-sm" 
                        rows={2} 
                        placeholder="Brief description of the violation..."
                        value={violation.description || ''}
                        onChange={async (e) => {
                          const newDesc = e.target.value;
                          setViolations(prev => prev.map(v => v.id === violation.id ? { ...v, description: newDesc } : v));
                          await apiCall('violations', 'PUT', { violation_id: violation.id, violation_type: opt.value, description: newDesc });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Case Law / Legal Framework</label>
                      <CaseLawPicker 
                        violationType={opt.value}
                        selectedCaseLaw={violation.constitutional_basis || ''}
                        onSelect={async (caseLaw, sourceUrl) => {
                          const newBasis = caseLaw;
                          setViolations(prev => prev.map(v => v.id === violation.id ? { ...v, constitutional_basis: newBasis } : v));
                          await apiCall('violations', 'PUT', { violation_id: violation.id, violation_type: opt.value, constitutional_basis: newBasis });
                        }}
                      />
                      {/* Custom entry input - shown when dropdown is set to custom or has custom text */}
                      {(violation.constitutional_basis === '' || !getCaseLawForViolation(opt.value).some(c => `${c.name} (${c.citation})` === violation.constitutional_basis)) && (
                        <textarea 
                          className="w-full border rounded px-3 py-2 text-sm mt-2" 
                          rows={2} 
                          placeholder="Enter custom case law citation or legal basis..."
                          value={violation.constitutional_basis || ''}
                          onChange={async (e) => {
                            const newBasis = e.target.value;
                            setViolations(prev => prev.map(v => v.id === violation.id ? { ...v, constitutional_basis: newBasis } : v));
                            await apiCall('violations', 'PUT', { violation_id: violation.id, violation_type: opt.value, constitutional_basis: newBasis });
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Media Section (Images/Videos) */}
      <Section title={`Media (${media.length})`} open={sectionsOpen.media} onToggle={() => toggleSection('media')}>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded mb-3">
          <input 
            placeholder="Media URL *" 
            className="flex-1 min-w-[300px] border rounded px-3 py-2 text-sm" 
            value={newMedia.url} 
            onChange={e => setNewMedia({ ...newMedia, url: e.target.value })} 
          />
          <select 
            className="border rounded px-3 py-2 text-sm" 
            value={newMedia.media_type} 
            onChange={e => setNewMedia({ ...newMedia, media_type: e.target.value as 'image' | 'video' })}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <input 
            placeholder="Description" 
            className="flex-1 min-w-[200px] border rounded px-3 py-2 text-sm" 
            value={newMedia.description} 
            onChange={e => setNewMedia({ ...newMedia, description: e.target.value })} 
          />
          <button 
            onClick={addMedia} 
            disabled={!newMedia.url || saving} 
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {media.map(m => (
            <div key={m.id} className="p-3 bg-gray-50 rounded flex justify-between items-center" data-media-id={m.id}>
              <div className="flex items-center gap-3 flex-1">
                <input 
                  type="checkbox" 
                  checked={verifiedMedia[m.id] || false}
                  onChange={(e) => setVerifiedMedia(prev => ({ ...prev, [m.id]: e.target.checked }))}
                  className="w-4 h-4"
                  title="Check to verify this media"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <a href={m.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                      {m.media_type === 'video' ? '🎥' : '📷'} {m.url.substring(0, 60)}...
                    </a>
                    <span className={`text-xs px-2 py-0.5 rounded ${m.media_type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {m.media_type}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-sm text-gray-600 mt-1">{m.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => deleteMedia(m.id)} 
                  className="text-red-600 text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {media.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No media yet</p>}
        </div>
      </Section>

      {/* Sources Section */}
      <Section title={`Sources (${sources.length})`} open={sectionsOpen.sources} onToggle={() => toggleSection('sources')}>
        <div className="flex gap-2 p-3 bg-gray-50 rounded mb-3">
          <input 
            placeholder="Source URL *" 
            className="flex-1 border rounded px-3 py-2 text-sm" 
            value={newSource.url} 
            onChange={e => setNewSource({ ...newSource, url: e.target.value })} 
          />
          <select 
            className="w-32 border rounded px-3 py-2 text-sm" 
            value={newSource.source_priority || 'secondary'} 
            onChange={e => setNewSource({ ...newSource, source_priority: e.target.value })}
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
          <button 
            onClick={addSource} 
            disabled={!newSource.url || saving} 
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {sources.map(s => (
            <div key={s.id} className="p-3 bg-gray-50 rounded" data-source-id={s.id}>
              {editingSourceId === s.id ? (
                <div className="space-y-2">
                  <input 
                    className="w-full border rounded px-3 py-2 text-sm" 
                    placeholder="URL *"
                    value={editSourceData.url || s.url}
                    onChange={(e) => setEditSourceData({ ...editSourceData, url: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 border rounded px-3 py-2 text-sm" 
                      value={editSourceData.source_priority || s.source_priority || 'secondary'}
                      onChange={(e) => setEditSourceData({ ...editSourceData, source_priority: e.target.value })}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                    </select>
                    <button 
                      onClick={() => updateSource(s.id, editSourceData)}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => { setEditingSourceId(null); setEditSourceData({}); }}
                      className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1">
                    <input 
                      type="checkbox" 
                      checked={verifiedSources[s.id] || false}
                      onChange={(e) => setVerifiedSources(prev => ({ ...prev, [s.id]: e.target.checked }))}
                      className="w-4 h-4"
                      title="Check to verify this source"
                    />
                    <div>
                      <a href={s.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{s.title || s.url}</a>
                      {s.publication && <span className="text-gray-500 text-sm ml-2">({s.publication})</span>}
                      <span className="text-xs bg-gray-200 ml-2 px-2 py-0.5 rounded">{s.source_type}</span>
                      {s.source_priority && <span className={`text-xs ml-2 px-2 py-0.5 rounded ${s.source_priority === 'primary' ? 'bg-green-100 text-green-700' : s.source_priority === 'secondary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{s.source_priority}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingSourceId(s.id); setEditSourceData({}); }} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button onClick={() => deleteSource(s.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {sources.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No sources yet</p>}
        </div>
      </Section>

      {/* Quotes Section */}
      <Section title={`Quotes (${quotes.length})`} open={sectionsOpen.quotes} onToggle={() => toggleSection('quotes')}>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded mb-3">
          <textarea placeholder="Quote text *" className="w-full border rounded px-3 py-2 text-sm" rows={2} value={newQuote.text} onChange={e => setNewQuote({ ...newQuote, text: e.target.value })} />
          <select className="border rounded px-3 py-2 text-sm" value={newQuote.source_id} onChange={e => setNewQuote({ ...newQuote, source_id: e.target.value })}>
            <option value="">Select source</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.title || s.url}</option>)}
          </select>
          <button onClick={addQuote} disabled={!newQuote.text || saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Add</button>
        </div>
        <div className="space-y-2">
          {quotes.map(q => (
            <div key={q.id} className="p-3 bg-gray-50 rounded" data-quote-id={q.id}>
              {editingQuoteId === q.id ? (
                <div className="space-y-2">
                  <textarea 
                    className="w-full border rounded px-3 py-2 text-sm" 
                    rows={3}
                    placeholder="Quote text *"
                    value={editQuoteData.quote_text !== undefined ? editQuoteData.quote_text : q.quote_text}
                    onChange={(e) => setEditQuoteData({ ...editQuoteData, quote_text: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      value={editQuoteData.source_id !== undefined ? editQuoteData.source_id : q.source_id || ''}
                      onChange={(e) => setEditQuoteData({ ...editQuoteData, source_id: parseInt(e.target.value) })}
                    >
                      <option value="">Select source</option>
                      {sources.map(s => <option key={s.id} value={s.id}>{s.title || s.url}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateQuote(q.id, editQuoteData)}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => { setEditingQuoteId(null); setEditQuoteData({}); }}
                      className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={verifiedQuotes[q.id] || false}
                    onChange={(e) => setVerifiedQuotes(prev => ({ ...prev, [q.id]: e.target.checked }))}
                    className="w-4 h-4 mt-1"
                    title="Check after reviewing this quote"
                  />
                  <div className="flex-1">
                    <p className="text-sm italic">&ldquo;{q.quote_text}&rdquo;</p>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex gap-2 text-xs text-gray-500">
                        {q.source_title && <span>Source: {q.source_title}</span>}
                        {q.linked_fields?.length ? <span className="text-blue-600">Linked: {q.linked_fields.join(', ')}</span> : null}
                        {q.verified ? <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded">Verified</span> : <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded">Unverified</span>}
                      </div>
                      <div className="flex gap-2">
                        {!q.verified && (
                          <button onClick={() => verifyQuote(q.id)} className="text-green-700 text-sm hover:underline font-semibold">Mark verified</button>
                        )}
                        <button onClick={() => { setEditingQuoteId(q.id); setEditQuoteData({}); }} className="text-blue-600 text-sm hover:underline">Edit</button>
                        <button onClick={() => deleteQuote(q.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {quotes.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No quotes yet</p>}
        </div>
      </Section>

      {/* Timeline Section */}
      <Section title={`Timeline (${timeline.length})`} open={sectionsOpen.timeline} onToggle={() => toggleSection('timeline')}>
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          💡 <strong>Tip:</strong> Drag and drop entries to reorder. Timeline order is saved automatically.
        </div>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded mb-3">
          <input type="date" className="border rounded px-3 py-2 text-sm" value={newTimeline.event_date} onChange={e => setNewTimeline({ ...newTimeline, event_date: e.target.value })} />
          <input placeholder="Description *" className="flex-1 min-w-[200px] border rounded px-3 py-2 text-sm" value={newTimeline.description} onChange={e => setNewTimeline({ ...newTimeline, description: e.target.value })} />
          <select className="border rounded px-3 py-2 text-sm" value={newTimeline.quote_id} onChange={e => setNewTimeline({ ...newTimeline, quote_id: e.target.value })}>
            <option value="">Link quote</option>
            {quotes.map(q => <option key={q.id} value={q.id}>{q.quote_text.substring(0, 50)}{q.quote_text.length > 50 ? '...' : ''}</option>)}
          </select>
          <button onClick={addTimelineEntry} disabled={!newTimeline.description || saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Add</button>
        </div>
        <div className="space-y-2">
          {timeline.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)).map(t => (
            <div 
              key={t.id}
              data-timeline-id={t.id}
              draggable
              onDragStart={() => setDraggedTimelineId(t.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedTimelineId && draggedTimelineId !== t.id) {
                  reorderTimeline(draggedTimelineId, t.id);
                }
                setDraggedTimelineId(null);
              }}
              className={`p-3 bg-gray-50 rounded cursor-move border-2 transition-all ${draggedTimelineId === t.id ? 'border-blue-500 opacity-50' : 'border-transparent hover:border-gray-300'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-gray-400 mt-1" style={{ cursor: 'grab' }}>⋮⋮</span>
                <input 
                  type="checkbox" 
                  checked={verifiedTimeline[t.id] || false}
                  onChange={(e) => setVerifiedTimeline(prev => ({ ...prev, [t.id]: e.target.checked }))}
                  className="w-4 h-4 mt-1"
                  title="Check to verify this timeline entry"
                />
                <div className="flex-1">
              {editingTimeline?.id === t.id ? (
                <div className="flex flex-wrap gap-2">
                  <input type="date" className="border rounded px-3 py-2 text-sm" value={editingTimeline.event_date} onChange={e => setEditingTimeline({ ...editingTimeline, event_date: e.target.value })} />
                  <input className="flex-1 min-w-[200px] border rounded px-3 py-2 text-sm" value={editingTimeline.description} onChange={e => setEditingTimeline({ ...editingTimeline, description: e.target.value })} />
                  <select className="border rounded px-3 py-2 text-sm" value={editingTimeline.quote_id} onChange={e => setEditingTimeline({ ...editingTimeline, quote_id: e.target.value })}>
                    <option value="">Link quote</option>
                    {quotes.map(q => <option key={q.id} value={q.id}>{q.quote_text.substring(0, 50)}{q.quote_text.length > 50 ? '...' : ''}</option>)}
                  </select>
                  <button onClick={updateTimelineEntry} className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">Save</button>
                  <button onClick={() => setEditingTimeline(null)} className="px-3 py-2 bg-gray-400 text-white rounded text-sm hover:bg-gray-500">Cancel</button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">#{t.sequence_order}</span>
                      <span className="font-mono text-sm text-gray-600">{t.date || 'No date'}</span>
                    </div>
                    <p className="text-sm mb-1">{t.description}</p>
                    {t.quote && (
                      <div className="mt-2 pl-3 border-l-2 border-blue-300">
                        <p className="text-xs italic text-gray-600">&ldquo;{t.quote.quote_text}&rdquo;</p>
                        {t.source && (
                          <p className="text-xs text-gray-500 mt-1">
                            Source: {t.source.title || t.source.url}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingTimeline({ id: t.id, event_date: t.date || '', description: t.description, quote_id: String(t.quote_id || '') })} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button onClick={() => deleteTimelineEntry(t.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
          ))}
          {timeline.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No timeline entries yet</p>}
        </div>
      </Section>

      {/* Final Submit Section */}
      <div className="mt-8 p-6 bg-gray-50 border-2 border-gray-300 rounded-lg">
        {/* Helper Find Buttons */}
        <div className="mb-4 p-3 bg-white border border-gray-300 rounded">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Find Tools:</p>
          <div className="flex flex-wrap gap-2">
            {!isNewIncident && (() => {
              const keyFields = ['victim_name', 'incident_date', 'city', 'state', 'summary'];
              const unlinkedFields = keyFields.filter(field => {
                const value = (editedIncident as any)[field] || (incident as any)?.[field];
                return value && !fieldQuoteMap[field];
              });
              return unlinkedFields.length > 0 && (
                <button
                  onClick={findFieldsWithoutQuotes}
                  className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded text-sm hover:bg-red-200"
                >
                  🔍 Find Fields Missing Quotes ({unlinkedFields.length})
                </button>
              );
            })()}
            {quotes.filter(q => !q.source_id).length > 0 && (
              <button
                onClick={findQuotesWithoutSources}
                className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded text-sm hover:bg-red-200"
              >
                🔍 Find Quotes Without Sources ({quotes.filter(q => !q.source_id).length})
              </button>
            )}
            {quotes.filter(q => !verifiedQuotes[q.id]).length > 0 && (
              <button
                onClick={findUnverifiedQuotes}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded text-sm hover:bg-yellow-200"
              >
                🔍 Find Unchecked Quote Boxes ({quotes.filter(q => !verifiedQuotes[q.id]).length})
              </button>
            )}
            {quotes.filter(q => !q.verified).length > 0 && (
              <button
                onClick={findUnverifiedQuotesData}
                className="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-300 rounded text-sm hover:bg-orange-200"
              >
                🔍 Find Unverified Quotes ({quotes.filter(q => !q.verified).length})
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg mb-1">Complete Review</h3>
            <p className="text-sm text-gray-600">All changes have been auto-saved. Review validation checklist before verifying:</p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>✓ All key fields (name, date, location) linked to verified quotes</li>
              <li>✓ All quotes linked to verified sources</li>
              <li>✓ Timeline entries ordered correctly</li>
              <li>✓ Summary accurately describes incident</li>
            </ul>
          </div>
          <button
            onClick={async () => {
              // If this is a new incident, create it first
              if (isNewIncident) {
                if (!editedIncident.incident_type) {
                  alert('Please select an incident type');
                  return;
                }
                
                try {
                  setSaving(true);
                  
                  // Generate incident_id
                  const incidentIdValue = `INC-${Date.now()}`;
                  
                  // Create incident
                  const createRes = await fetch('/api/incidents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      incident_id: incidentIdValue,
                      ...editedIncident,
                      from_guest_submission: fromGuest,
                      guest_submission_id: guestSubmissionId
                    }),
                  });
                  
                  if (!createRes.ok) {
                    const errorData = await createRes.json();
                    throw new Error(errorData.error || 'Failed to create incident');
                  }
                  
                  const createdIncident = await createRes.json();
                  const newIncidentId = createdIncident.id;
                  
                  // Create media records
                  for (const m of media) {
                    await fetch(`/api/incidents/${newIncidentId}/media`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        url: m.url,
                        media_type: m.media_type,
                        description: m.description
                      }),
                    });
                  }
                  
                  // Create sources
                  for (const s of sources.filter(s => s.id < 0)) { // Only create new ones (negative IDs)
                    await fetch(`/api/incidents/${newIncidentId}/sources`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        url: s.url,
                        title: s.title,
                        publication: s.publication,
                        source_type: s.source_type,
                        source_priority: s.source_priority
                      }),
                    });
                  }
                  
                  // Mark guest submission as reviewed if applicable
                  if (guestSubmissionId) {
                    await fetch(`/api/guest-submissions`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: guestSubmissionId,
                        status: 'reviewed',
                        notes: 'Reviewed and created incident'
                      }),
                    });
                  }
                  
                  alert('✅ Incident created! Redirecting to continue review...');
                  router.push(`/dashboard/review/${newIncidentId}`);
                  return;
                } catch (err) {
                  alert('Failed to create incident: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  console.error(err);
                  setSaving(false);
                  return;
                }
              }
              
              // Otherwise proceed with normal verification flow for existing incidents
              // Validation
              const unverifiedQuotes = quotes.filter(q => !q.verified);
              const quotesWithoutSources = quotes.filter(q => !q.source_id);
              // Check ALL linkable fields for quote links (expanded from just 5 key fields)
              const unlinkedFields = LINKABLE_FIELDS.filter(field => {
                const value = (editedIncident as any)[field] || (incident as any)?.[field];
                return value && !fieldQuoteMap[field];
              });

              // Check field verification (same logic as badge)
              const fieldsWithData = INCIDENT_FIELDS.filter(f => {
                const val = editedIncident[f.key];
                if (val === null || val === undefined || val === '') return false;
                // Check for date placeholders
                if (typeof val === 'string' && (val === 'mm/dd/yyyy' || val === 'MM/DD/YYYY' || val.match(/^[mMdDyY\/]+$/))) return false;
                return true;
              });
              
              // Add incident_type if it has a value
              const allFieldsToCheck = [...fieldsWithData];
              if (editedIncident.incident_type) {
                allFieldsToCheck.push({ key: 'incident_type', label: 'Incident Type', type: 'select' });
              }
              
              const unverifiedFieldsList = allFieldsToCheck.filter(f => !verifiedFields[f.key]);

              // Check sources, quotes, timeline, and media verification (checkboxes)
              const unverifiedSourcesList = sources.filter(s => !verifiedSources[s.id]);
              const unverifiedQuotesList = quotes.filter(q => !verifiedQuotes[q.id]);
              const unverifiedTimelineList = timeline.filter(t => !verifiedTimeline[t.id]);
              const unverifiedMediaList = media.filter(m => !verifiedMedia[m.id]);

              // DEBUG: Log all validation checks
              console.log('=== VERIFICATION DEBUG ===');
              console.log('Unverified quotes (q.verified === false):', unverifiedQuotes);
              console.log('Quotes without sources:', quotesWithoutSources);
              console.log('Unlinked fields:', unlinkedFields);
              console.log('fieldQuoteMap:', fieldQuoteMap);
              console.log('Unverified fields list:', unverifiedFieldsList.map(f => f.key));
              console.log('verifiedFields:', verifiedFields);
              console.log('Unverified sources:', unverifiedSourcesList);
              console.log('Unverified quotes (checkboxes):', unverifiedQuotesList);
              console.log('Unverified timeline:', unverifiedTimelineList);
              console.log('Unverified media:', unverifiedMediaList);
              console.log('=== END DEBUG ===');

              let blockingErrors: string[] = [];
              
              // Critical issues that BLOCK submission
              if (unlinkedFields.length > 0) {
                blockingErrors.push(`Key fields missing quote links: ${unlinkedFields.join(', ')}`);
              }
              if (quotesWithoutSources.length > 0) {
                blockingErrors.push(`${quotesWithoutSources.length} quote(s) lack source links`);
              }
              if (unverifiedQuotes.length > 0) {
                blockingErrors.push(`${unverifiedQuotes.length} quote(s) are unverified (verified checkbox in database not checked)`);
              }
              
              // Verification checkboxes are also BLOCKING for review submission
              if (unverifiedFieldsList.length > 0) {
                blockingErrors.push(`${unverifiedFieldsList.length} field(s) not checked: ${unverifiedFieldsList.map(f => f.label).join(', ')}`);
              }
              if (unverifiedSourcesList.length > 0) {
                blockingErrors.push(`${unverifiedSourcesList.length} source(s) not checked`);
              }
              if (unverifiedQuotesList.length > 0) {
                blockingErrors.push(`${unverifiedQuotesList.length} quote(s) not checked`);
              }
              if (unverifiedTimelineList.length > 0) {
                blockingErrors.push(`${unverifiedTimelineList.length} timeline event(s) not checked`);
              }
              if (unverifiedMediaList.length > 0) {
                blockingErrors.push(`${unverifiedMediaList.length} media item(s) not checked`);
              }

              // Block if critical errors exist
              if (blockingErrors.length > 0) {
                let errorMsg = '❌ CANNOT VERIFY - Critical Issues:\n\n';
                blockingErrors.forEach(e => {
                  errorMsg += '• ' + e + '\n';
                });
                errorMsg += '\n';
                
                // Add helper text about Find buttons
                if (unlinkedFields.length > 0) {
                  errorMsg += '💡 Use the "Find Fields Missing Quotes" button below to locate fields that need quotes.\n';
                }
                if (quotesWithoutSources.length > 0) {
                  errorMsg += '💡 Use the "Find Quotes Without Sources" button to locate quotes needing sources.\n';
                }
                if (unverifiedQuotes.length > 0) {
                  errorMsg += '💡 Use the "Find Unverified Quotes" button to locate quotes with unchecked verified boxes.\n';
                }
                errorMsg += '\nFix these issues before verifying.';
                
                alert(errorMsg);
                return; // Block submission
              }

              // Guard against null incident
              if (!incident) {
                alert('Error: Incident data not loaded');
                return;
              }

              // Determine confirmation message based on verification status
              const isFirstReview = incident.verification_status === 'pending';
              const isSecondReview = incident.verification_status === 'first_review';
              
              // Check if current user did the first review
              const currentUserId = session?.user?.id ? parseInt(session.user.id) : null;
              const userRole = (session?.user as any)?.role;
              const isAdmin = userRole === 'admin';
              const didFirstReview = incident.first_verified_by === currentUserId;
              
              // Block if user did first review and is not admin
              if (isSecondReview && didFirstReview && !isAdmin) {
                alert('⛔ You cannot perform the second review on an incident you already reviewed.\n\nThis incident needs review by a different analyst to ensure quality.');
                return;
              }
              
              let confirmMsg = '';
              if (isFirstReview) {
                confirmMsg = 'Submit first review? This incident will await a second review before going public.';
              } else if (isSecondReview) {
                if (isAdmin && didFirstReview) {
                  confirmMsg = '⚠️ ADMIN OVERRIDE: You are bypassing the two-analyst requirement.\n\nSubmit second review?';
                } else {
                  confirmMsg = 'Submit second review? After this, the incident will go to validation.';
                }
              } else {
                confirmMsg = 'Update verification?';
              }
              
              if (!confirm(confirmMsg)) return;

              // Check if user is logged in
              if (!currentUserId) {
                alert('You must be logged in to submit a review');
                return;
              }

              try {
                setSaving(true);
                const response = await fetch(`/api/incidents/${incident.id}/review`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: currentUserId })
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to submit review');
                }
                
                const result = await response.json();
                
                // Show appropriate success message
                if (result.verification_status === 'first_review') {
                  alert('✅ First review submitted! This incident will await a second review.');
                } else if (result.verification_status === 'second_review') {
                  alert('✅ Second review complete! Incident is now in the validation queue.');
                } else if (result.verification_status === 'verified') {
                  alert('✅ Incident is now publicly visible.');
                }
                
                router.push('/dashboard');
              } catch (err) {
                alert('Failed to submit review: ' + (err instanceof Error ? err.message : 'Unknown error'));
                console.error(err);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Submitting...' : 
             isNewIncident ? 'Create & Continue Review' :
             incident?.verification_status === 'pending' ? 'Submit First Review' :
             incident?.verification_status === 'first_review' ? 'Submit Second Review' :
             'Update Verification'}
          </button>
          
          {/* Show lock notice if user did first review */}
          {!isNewIncident && incident && incident.verification_status === 'first_review' && 
           incident.first_verified_by === (session?.user?.id ? parseInt(session.user.id) : null) &&
           (session?.user as any)?.role !== 'admin' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>🔒 Locked:</strong> You completed the first review. This incident requires a second review by a different analyst.
              </p>
            </div>
          )}
          
          {/* Show admin override notice */}
          {!isNewIncident && incident && incident.verification_status === 'first_review' && 
           incident.first_verified_by === (session?.user?.id ? parseInt(session.user.id) : null) &&
           (session?.user as any)?.role === 'admin' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>👑 Admin Override:</strong> You can bypass the two-analyst requirement and complete both reviews.
              </p>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg mb-4">
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-t-lg cursor-pointer hover:bg-gray-100" onClick={onToggle}>
        <span className="font-semibold text-sm">{title}</span>
        <span>{open ? '▼' : '▶'}</span>
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
