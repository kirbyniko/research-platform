'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
interface Quote { id: number; quote_text: string; category: string | null; source_id: number | null; linked_fields: string[] | null; source_title?: string | null; }
interface Agency { id: number; agency: string; role: string | null; }
interface Violation { id: number; violation_type: string; description: string | null; constitutional_basis: string | null; }
interface TimelineEntry { id: number; event_date: string | null; description: string; sequence_order: number | null; source_id: number | null; }

// Field definitions
const INCIDENT_FIELDS: { key: string; label: string; type: string; options?: string[] }[] = [
  { key: 'victim_name', label: 'Victim Name', type: 'text' },
  { key: 'incident_date', label: 'Date', type: 'date' },
  { key: 'incident_type', label: 'Type', type: 'select', options: ['death', 'medical_neglect', 'assault', 'sexual_assault', 'suicide', 'use_of_force', 'solitary', 'family_separation', 'deportation', 'other'] },
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
function QuotePicker({ field, quotes, fieldQuoteMap, onLinkQuote, onUnlinkQuote }: {
  field: string; quotes: Quote[]; fieldQuoteMap: Record<string, number>;
  onLinkQuote: (f: string, qid: number) => void; onUnlinkQuote: (f: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const linkedQuoteId = fieldQuoteMap[field];
  const linkedQuote = linkedQuoteId ? quotes.find(q => q.id === linkedQuoteId) : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filteredQuotes = quotes.filter(q => !search || q.quote_text.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${linkedQuote ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
        {linkedQuote ? (
          <><span className="max-w-[150px] truncate">[linked] &ldquo;{linkedQuote.quote_text.substring(0, 25)}...&rdquo;</span>
            <span onClick={(e) => { e.stopPropagation(); onUnlinkQuote(field); }} className="text-red-500 ml-1">✕</span></>
        ) : <span>[src] Link...</span>}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 w-80 max-h-72 bg-white border rounded-lg shadow-xl overflow-hidden">
          <input type="text" placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border-b text-sm" />
          <div className="max-h-56 overflow-y-auto">
            {filteredQuotes.length === 0 ? <p className="p-4 text-gray-500 text-sm text-center">No quotes yet</p> :
              filteredQuotes.map(q => (
                <div key={q.id} onClick={() => { onLinkQuote(field, q.id); setOpen(false); }}
                  className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${linkedQuoteId === q.id ? 'bg-blue-50' : ''}`}>
                  <p className="text-sm">&ldquo;{q.quote_text}&rdquo;</p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    {q.category && <span className="bg-gray-200 px-1 rounded">{q.category}</span>}
                    {q.source_title && <span>{q.source_title}</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
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
  const [newSource, setNewSource] = useState({ url: '', title: '', publication: '', source_type: 'news' });
  const [newQuote, setNewQuote] = useState({ text: '', category: '', source_id: '' });
  const [newTimeline, setNewTimeline] = useState({ event_date: '', description: '', sequence_order: '', source_id: '' });
  const [sectionsOpen, setSectionsOpen] = useState({ details: true, agencies: true, violations: true, sources: true, quotes: true, timeline: true });

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
        <div className="grid grid-cols-2 gap-4">
          {INCIDENT_FIELDS.map(f => (
            <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              <div className="flex gap-2 items-start">
                {f.type === 'textarea' ? (
                  <textarea className="flex-1 border rounded px-3 py-2 text-sm" rows={3} value={String(editedIncident[f.key] || '')}
                    onChange={e => setEditedIncident({ ...editedIncident, [f.key]: e.target.value })} />
                ) : f.type === 'select' ? (
                  <select className="flex-1 border rounded px-3 py-2 text-sm" value={String(editedIncident[f.key] || '')}
                    onChange={e => setEditedIncident({ ...editedIncident, [f.key]: e.target.value })}>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} className="flex-1 border rounded px-3 py-2 text-sm" value={String(editedIncident[f.key] || '')}
                    onChange={e => setEditedIncident({ ...editedIncident, [f.key]: f.type === 'number' ? (Number(e.target.value) || null) : e.target.value })} />
                )}
                {LINKABLE_FIELDS.includes(f.key) && <QuotePicker field={f.key} quotes={quotes} fieldQuoteMap={fieldQuoteMap} onLinkQuote={handleLinkQuote} onUnlinkQuote={handleUnlinkQuote} />}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveIncidentDetails} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">Save Details</button>
        </div>
      </Section>

      {/* Agencies Section */}
      <Section title={`Agencies Involved (${agencies.length})`} open={sectionsOpen.agencies} onToggle={() => toggleSection('agencies')}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AGENCY_OPTIONS.map(opt => (
            <div key={opt.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
                <input type="checkbox" checked={agencies.some(a => a.agency === opt.value)} onChange={() => toggleAgency(opt.value)} className="w-4 h-4" />
                {opt.label}
              </label>
              <QuotePicker field={`agency_${opt.value}`} quotes={quotes} fieldQuoteMap={fieldQuoteMap} onLinkQuote={handleLinkQuote} onUnlinkQuote={handleUnlinkQuote} />
            </div>
          ))}
        </div>
      </Section>

      {/* Violations Section */}
      <Section title={`Constitutional Violations (${violations.length})`} open={sectionsOpen.violations} onToggle={() => toggleSection('violations')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {VIOLATION_OPTIONS.map(opt => (
            <div key={opt.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
                <input type="checkbox" checked={violations.some(v => v.violation_type === opt.value)} onChange={() => toggleViolation(opt.value)} className="w-4 h-4" />
                {opt.label}
              </label>
              <QuotePicker field={`violation_${opt.value}`} quotes={quotes} fieldQuoteMap={fieldQuoteMap} onLinkQuote={handleLinkQuote} onUnlinkQuote={handleUnlinkQuote} />
            </div>
          ))}
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
