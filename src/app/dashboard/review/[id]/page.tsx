'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LEGAL_REFERENCES, getCaseLawForViolation, VIOLATION_TO_LEGAL_KEY } from '@/lib/legal-references';
import type { LegalCase } from '@/lib/legal-references';

// Types
interface Incident {
  id: number; incident_id: string; incident_type: string; incident_date: string | null;
  city: string | null; state: string | null; country: string | null; facility: string | null;
  victim_name: string | null; subject_name: string | null; subject_age: number | null;
  subject_gender: string | null; subject_nationality: string | null;
  subject_immigration_status: string | null; summary: string | null;
  verified: boolean; verification_status: string;
}
interface Source { id: number; url: string; title: string | null; publication: string | null; source_type: string; }
interface Quote { id: number; quote_text: string; category: string | null; source_id: number | null; linked_fields: string[] | null; source_title?: string | null; source_url?: string | null; verified?: boolean; }
interface Agency { id: number; agency: string; role: string | null; }
interface Violation { id: number; violation_type: string; description: string | null; constitutional_basis: string | null; }
interface TimelineEntry { id: number; event_date: string | null; description: string; sequence_order: number | null; source_id: number | null; }
interface IncidentDetails { [key: string]: unknown; }

// Field definitions
const INCIDENT_FIELDS: { key: string; label: string; type: string; options?: string[] }[] = [
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
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'facility', label: 'Facility', type: 'text' },
  { key: 'subject_age', label: 'Age', type: 'number' },
  { key: 'subject_gender', label: 'Gender', type: 'text' },
  { key: 'subject_nationality', label: 'Nationality', type: 'text' },
  { key: 'subject_immigration_status', label: 'Immigration Status', type: 'text' },
  { key: 'summary', label: 'Summary', type: 'textarea' },
];

const LINKABLE_FIELDS = ['victim_name', 'incident_date', 'city', 'state', 'facility', 'subject_age', 'subject_nationality', 'summary'];

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

export default function ReviewPage() {
  const params = useParams();
  const incidentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [fieldQuoteMap, setFieldQuoteMap] = useState<Record<string, number>>({});
  const [editedIncident, setEditedIncident] = useState<Record<string, unknown>>({});
  const [incidentDetails, setIncidentDetails] = useState<IncidentDetails>({});
  const [newSource, setNewSource] = useState({ url: '', title: '', publication: '', source_type: 'news' });
  const [newQuote, setNewQuote] = useState({ text: '', category: '', source_id: '' });
  const [newTimeline, setNewTimeline] = useState({ event_date: '', description: '', sequence_order: '', source_id: '' });
  const [sectionsOpen, setSectionsOpen] = useState({ details: true, typeDetails: true, agencies: true, violations: true, sources: true, quotes: true, timeline: true });
  const [activeTypingField, setActiveTypingField] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchData(); }, [incidentId]);

  useEffect(() => {
    const map: Record<string, number> = {};
    quotes.forEach(q => { if (q.linked_fields) q.linked_fields.forEach(f => { map[f] = q.id; }); });
    setFieldQuoteMap(map);
  }, [quotes]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/incidents/${incidentId}/verify-field`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setIncident(data.incident);
      setSources(data.sources || []);
      setQuotes(data.quotes || []);
      setAgencies(data.agencies || []);
      setViolations(data.violations || []);
      setTimeline(data.timeline || []);
      if (data.incident) setEditedIncident(data.incident);
      
      // Fetch type-specific details
      const detailsRes = await fetch(`/api/incidents/${incidentId}/details`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setIncidentDetails(detailsData.details || {});
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
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
    setNewSource({ url: '', title: '', publication: '', source_type: 'news' });
  }

  async function deleteSource(id: number) {
    if (!confirm('Delete this source?')) return;
    await apiCall('sources', 'DELETE', { source_id: id });
    setSources(prev => prev.filter(s => s.id !== id));
  }

  async function addQuote() {
    if (!newQuote.text) return;
    const payload = { text: newQuote.text, category: newQuote.category || null, source_id: newQuote.source_id ? Number(newQuote.source_id) : null };
    const result = await apiCall('quotes', 'POST', payload);
    const sourceInfo = newQuote.source_id ? sources.find(s => s.id === Number(newQuote.source_id)) : null;
    setQuotes(prev => [...prev, { id: result.id, quote_text: newQuote.text, category: newQuote.category || null, source_id: payload.source_id, linked_fields: null, source_title: sourceInfo?.title || null }]);
    setNewQuote({ text: '', category: '', source_id: '' });
  }

  async function deleteQuote(id: number) {
    if (!confirm('Delete this quote?')) return;
    await apiCall('quotes', 'DELETE', { quote_id: id });
    setQuotes(prev => prev.filter(q => q.id !== id));
    setFieldQuoteMap(prev => { const next = { ...prev }; Object.keys(next).forEach(k => { if (next[k] === id) delete next[k]; }); return next; });
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
    const payload = { event_date: newTimeline.event_date || null, description: newTimeline.description, sequence_order: newTimeline.sequence_order ? Number(newTimeline.sequence_order) : null, source_id: newTimeline.source_id ? Number(newTimeline.source_id) : null };
    const result = await apiCall('timeline', 'POST', payload);
    setTimeline(prev => [...prev, { ...payload, id: result.id } as TimelineEntry]);
    setNewTimeline({ event_date: '', description: '', sequence_order: '', source_id: '' });
  }

  async function deleteTimelineEntry(id: number) {
    if (!confirm('Delete this entry?')) return;
    await apiCall('timeline', 'DELETE', { entry_id: id });
    setTimeline(prev => prev.filter(t => t.id !== id));
  }

  const toggleSection = (s: keyof typeof sectionsOpen) => setSectionsOpen(prev => ({ ...prev, [s]: !prev[s] }));

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!incident) return <div className="p-8">Not found</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {saving && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm z-50">Saving...</div>}

      {/* Header */}
      <div className="mb-6 pb-4 border-b">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">← Back to Queue</Link>
        <h1 className="text-2xl font-bold mt-2">{incident.victim_name || incident.subject_name || 'Unknown'}</h1>
        <p className="text-gray-500 text-sm">{incident.incident_id} • {incident.incident_type}</p>
        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${incident.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {incident.verification_status}
        </span>
      </div>

      {/* Details Section */}
      <Section title="Incident Details" open={sectionsOpen.details} onToggle={() => toggleSection('details')}>
        {/* Incident Type - Make it prominent */}
        <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Incident Type *</label>
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
            const fieldValue = String(editedIncident[f.key] || '');
            const isTypingThisField = activeTypingField === f.key;
            return (
            <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
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

      {/* Sources Section */}
      <Section title={`Sources (${sources.length})`} open={sectionsOpen.sources} onToggle={() => toggleSection('sources')}>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded mb-3">
          <input placeholder="URL *" className="flex-1 min-w-[200px] border rounded px-3 py-2 text-sm" value={newSource.url} onChange={e => setNewSource({ ...newSource, url: e.target.value })} />
          <input placeholder="Title" className="flex-1 min-w-[150px] border rounded px-3 py-2 text-sm" value={newSource.title} onChange={e => setNewSource({ ...newSource, title: e.target.value })} />
          <input placeholder="Publication" className="w-32 border rounded px-3 py-2 text-sm" value={newSource.publication} onChange={e => setNewSource({ ...newSource, publication: e.target.value })} />
          <select className="border rounded px-3 py-2 text-sm" value={newSource.source_type} onChange={e => setNewSource({ ...newSource, source_type: e.target.value })}>
            <option value="news">News</option><option value="government">Government</option><option value="legal">Legal</option><option value="ngo">NGO</option><option value="social_media">Social Media</option>
          </select>
          <button onClick={addSource} disabled={!newSource.url || saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Add</button>
        </div>
        <div className="space-y-2">
          {sources.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div><a href={s.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{s.title || s.url}</a>
                {s.publication && <span className="text-gray-500 text-sm ml-2">({s.publication})</span>}
                <span className="text-xs bg-gray-200 ml-2 px-2 py-0.5 rounded">{s.source_type}</span></div>
              <button onClick={() => deleteSource(s.id)} className="text-red-600 text-sm hover:underline">Delete</button>
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
          <input placeholder="Category" className="border rounded px-3 py-2 text-sm" value={newQuote.category} onChange={e => setNewQuote({ ...newQuote, category: e.target.value })} />
          <button onClick={addQuote} disabled={!newQuote.text || saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Add</button>
        </div>
        <div className="space-y-2">
          {quotes.map(q => (
            <div key={q.id} className="p-3 bg-gray-50 rounded">
              <p className="text-sm italic">&ldquo;{q.quote_text}&rdquo;</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2 text-xs text-gray-500">
                  {q.category && <span className="bg-gray-200 px-2 py-0.5 rounded">{q.category}</span>}
                  {q.source_title && <span>Source: {q.source_title}</span>}
                  {q.linked_fields?.length ? <span className="text-blue-600">Linked: {q.linked_fields.join(', ')}</span> : null}
                </div>
                <button onClick={() => deleteQuote(q.id)} className="text-red-600 text-sm hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {quotes.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No quotes yet</p>}
        </div>
      </Section>

      {/* Timeline Section */}
      <Section title={`Timeline (${timeline.length})`} open={sectionsOpen.timeline} onToggle={() => toggleSection('timeline')}>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded mb-3">
          <input type="date" className="border rounded px-3 py-2 text-sm" value={newTimeline.event_date} onChange={e => setNewTimeline({ ...newTimeline, event_date: e.target.value })} />
          <input type="number" placeholder="#" className="w-16 border rounded px-3 py-2 text-sm" value={newTimeline.sequence_order} onChange={e => setNewTimeline({ ...newTimeline, sequence_order: e.target.value })} />
          <input placeholder="Description *" className="flex-1 min-w-[200px] border rounded px-3 py-2 text-sm" value={newTimeline.description} onChange={e => setNewTimeline({ ...newTimeline, description: e.target.value })} />
          <select className="border rounded px-3 py-2 text-sm" value={newTimeline.source_id} onChange={e => setNewTimeline({ ...newTimeline, source_id: e.target.value })}>
            <option value="">Link source</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.title || s.url}</option>)}
          </select>
          <button onClick={addTimelineEntry} disabled={!newTimeline.description || saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Add</button>
        </div>
        <div className="space-y-2">
          {timeline.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)).map(t => (
            <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div><span className="font-mono text-sm mr-2">{t.event_date || 'No date'}</span>
                {t.sequence_order && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-2">#{t.sequence_order}</span>}
                <span>{t.description}</span></div>
              <button onClick={() => deleteTimelineEntry(t.id)} className="text-red-600 text-sm hover:underline">Delete</button>
            </div>
          ))}
          {timeline.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No timeline entries yet</p>}
        </div>
      </Section>
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
