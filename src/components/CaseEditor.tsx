'use client';

import { useState } from 'react';
import { Case, TimelineEvent, Discrepancy, Source } from '@/types/case';

interface CaseEditorProps {
  caseData: Case;
  onSave: (data: Case) => void;
  onCancel: () => void;
}

// Predefined categories for ICE detention deaths
const PREDEFINED_CATEGORIES = [
  'Medical Neglect',
  'Suicide',
  'Natural Causes',
  'COVID-19',
  'Use of Force',
  'Inadequate Medical Care',
  'Mental Health Crisis',
  'Delayed Treatment',
  'Preventable Death',
  'Facility Conditions',
  'Hunger Strike',
  'Infectious Disease',
  'Pre-existing Condition',
  'Denial of Care',
  'Staff Misconduct',
  'Solitary Confinement',
  'Chronic Illness',
  'Sudden Death',
  'Under Investigation'
];

export default function CaseEditor({ caseData, onSave, onCancel }: CaseEditorProps) {
  const [editedCase, setEditedCase] = useState<Case>(caseData);
  const [jsonError, setJsonError] = useState<string>('');
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');

  const handleJsonEdit = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setEditedCase(parsed);
      setJsonError('');
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedCase),
      });

      if (response.ok) {
        alert('Case saved successfully!');
        onSave(editedCase);
      } else {
        alert('Failed to save case');
      }
    } catch (error) {
      console.error('Error saving case:', error);
      alert('Error saving case');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(editedCase, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedCase.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(editedCase, null, 2));
    alert('JSON copied to clipboard!');
  };

  // Basic field handler
  const updateField = (field: keyof Case, value: any) => {
    setEditedCase({ ...editedCase, [field]: value });
  };

  // Timeline handlers
  const addTimelineEvent = () => {
    setEditedCase({
      ...editedCase,
      timeline: [...editedCase.timeline, { date: '', event: '' }]
    });
  };

  const updateTimelineEvent = (index: number, field: keyof TimelineEvent, value: string) => {
    const newTimeline = [...editedCase.timeline];
    newTimeline[index] = { ...newTimeline[index], [field]: value };
    setEditedCase({ ...editedCase, timeline: newTimeline });
  };

  const removeTimelineEvent = (index: number) => {
    setEditedCase({
      ...editedCase,
      timeline: editedCase.timeline.filter((_, i) => i !== index)
    });
  };

  // Discrepancy handlers
  const addDiscrepancy = () => {
    setEditedCase({
      ...editedCase,
      discrepancies: [...(editedCase.discrepancies || []), { ice_claim: '', counter_evidence: '' }]
    });
  };

  const updateDiscrepancy = (index: number, field: keyof Discrepancy, value: string) => {
    const newDiscrepancies = [...(editedCase.discrepancies || [])];
    newDiscrepancies[index] = { ...newDiscrepancies[index], [field]: value };
    setEditedCase({ ...editedCase, discrepancies: newDiscrepancies });
  };

  const removeDiscrepancy = (index: number) => {
    setEditedCase({
      ...editedCase,
      discrepancies: editedCase.discrepancies?.filter((_, i) => i !== index)
    });
  };

  // Source handlers
  const addSource = () => {
    setEditedCase({
      ...editedCase,
      sources: [...editedCase.sources, { title: '', publisher: '', date: '', url: '' }]
    });
  };

  const updateSource = (index: number, field: keyof Source, value: string) => {
    const newSources = [...editedCase.sources];
    newSources[index] = { ...newSources[index], [field]: value };
    setEditedCase({ ...editedCase, sources: newSources });
  };

  const removeSource = (index: number) => {
    setEditedCase({
      ...editedCase,
      sources: editedCase.sources.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Edit Case Data</h2>
          <div className="flex gap-2">
            <div className="flex border border-gray-300 rounded overflow-hidden">
              <button
                onClick={() => setEditMode('form')}
                className={`px-4 py-2 text-sm ${editMode === 'form' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Form
              </button>
              <button
                onClick={() => setEditMode('json')}
                className={`px-4 py-2 text-sm ${editMode === 'json' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                JSON
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Copy JSON
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              Download JSON
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {editMode === 'json' ? (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Edit the JSON below. Changes are validated in real-time. 
                  <strong> Download the JSON file and replace the file in <code className="bg-gray-100 px-1">data/cases/</code> to save permanently.</strong>
                </p>
              </div>

              <textarea
                className="w-full h-[500px] font-mono text-sm border border-gray-300 rounded p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={JSON.stringify(editedCase, null, 2)}
                onChange={(e) => handleJsonEdit(e.target.value)}
                spellCheck={false}
              />
              
              {jsonError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <strong>JSON Error:</strong> {jsonError}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={editedCase.name}
                      onChange={(e) => setEditedCase({ ...editedCase, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Age</label>
                    <input
                      type="number"
                      value={editedCase.age}
                      onChange={(e) => setEditedCase({ ...editedCase, age: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nationality</label>
                    <input
                      type="text"
                      value={editedCase.nationality}
                      onChange={(e) => setEditedCase({ ...editedCase, nationality: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Death</label>
                    <input
                      type="date"
                      value={editedCase.date_of_death}
                      onChange={(e) => setEditedCase({ ...editedCase, date_of_death: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Custody Status</label>
                    <input
                      type="text"
                      value={editedCase.custody_status}
                      onChange={(e) => setEditedCase({ ...editedCase, custody_status: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Official Cause of Death</label>
                    <input
                      type="text"
                      value={editedCase.official_cause_of_death}
                      onChange={(e) => setEditedCase({ ...editedCase, official_cause_of_death: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Image URL (optional)</label>
                    <input
                      type="url"
                      value={editedCase.image_url || ''}
                      onChange={(e) => updateField('image_url', e.target.value || undefined)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    {editedCase.image_url && (
                      <div className="mt-2">
                        <img 
                          src={editedCase.image_url} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover border border-gray-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Facility */}
              <section>
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Facility</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Facility Name</label>
                    <input
                      type="text"
                      value={editedCase.facility.name}
                      onChange={(e) => setEditedCase({ ...editedCase, facility: { ...editedCase.facility, name: e.target.value } })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={editedCase.facility.state}
                      onChange={(e) => setEditedCase({ ...editedCase, facility: { ...editedCase.facility, state: e.target.value } })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Facility Type</label>
                    <select
                      value={editedCase.facility.type}
                      onChange={(e) => setEditedCase({ ...editedCase, facility: { ...editedCase.facility, type: e.target.value } })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="ICE facility">ICE facility</option>
                      <option value="ICE-contracted jail">ICE-contracted jail</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {editedCase.facility.city && (
                    <div>
                      <label className="block text-sm font-medium mb-1">City (optional)</label>
                      <input
                        type="text"
                        value={editedCase.facility.city}
                        onChange={(e) => setEditedCase({ ...editedCase, facility: { ...editedCase.facility, city: e.target.value } })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Categories */}
              <section>
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Categories</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Categories</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      onChange={(e) => {
                        const category = e.target.value;
                        if (category && !editedCase.category.includes(category)) {
                          setEditedCase({ 
                            ...editedCase, 
                            category: [...editedCase.category, category] 
                          });
                        }
                        e.target.value = ''; // Reset selector
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>-- Add a category --</option>
                      {PREDEFINED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Selected Categories</label>
                    {editedCase.category.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No categories selected</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editedCase.category.map((cat, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm"
                          >
                            {cat}
                            <button
                              onClick={() => setEditedCase({
                                ...editedCase,
                                category: editedCase.category.filter((_, i) => i !== index)
                              })}
                              className="text-red-600 hover:text-red-800 font-bold"
                              title="Remove category"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Or Add Custom Category</label>
                    <input
                      type="text"
                      placeholder="Type and press Enter"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = e.currentTarget.value.trim();
                          if (value && !editedCase.category.includes(value)) {
                            setEditedCase({ 
                              ...editedCase, 
                              category: [...editedCase.category, value] 
                            });
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Press Enter to add a custom category</p>
                  </div>
                </div>
              </section>

              {/* Timeline */}
              <section>
                <div className="flex justify-between items-center mb-3 pb-2 border-b">
                  <h3 className="text-lg font-semibold">Timeline</h3>
                  <button
                    onClick={addTimelineEvent}
                    className="text-sm px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                  >
                    + Add Event
                  </button>
                </div>
                <div className="space-y-3">
                  {editedCase.timeline.map((event, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => updateTimelineEvent(index, 'date', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                        />
                        <input
                          type="text"
                          value={event.event}
                          onChange={(e) => updateTimelineEvent(index, 'event', e.target.value)}
                          placeholder="Event description"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeTimelineEvent(index)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Discrepancies */}
              <section>
                <div className="flex justify-between items-center mb-3 pb-2 border-b">
                  <h3 className="text-lg font-semibold">Discrepancies</h3>
                  <button
                    onClick={addDiscrepancy}
                    className="text-sm px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                  >
                    + Add Discrepancy
                  </button>
                </div>
                <div className="space-y-3">
                  {editedCase.discrepancies?.map((disc, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Discrepancy {index + 1}</span>
                        <button
                          onClick={() => removeDiscrepancy(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        value={disc.ice_claim}
                        onChange={(e) => updateDiscrepancy(index, 'ice_claim', e.target.value)}
                        placeholder="ICE claim"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                        rows={2}
                      />
                      <textarea
                        value={disc.counter_evidence}
                        onChange={(e) => updateDiscrepancy(index, 'counter_evidence', e.target.value)}
                        placeholder="Counter evidence"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Sources */}
              <section>
                <div className="flex justify-between items-center mb-3 pb-2 border-b">
                  <h3 className="text-lg font-semibold">Sources</h3>
                  <button
                    onClick={addSource}
                    className="text-sm px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                  >
                    + Add Source
                  </button>
                </div>
                <div className="space-y-3">
                  {editedCase.sources.map((source, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Source {index + 1}</span>
                        <button
                          onClick={() => removeSource(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={source.title}
                          onChange={(e) => updateSource(index, 'title', e.target.value)}
                          placeholder="Title"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={source.publisher}
                          onChange={(e) => updateSource(index, 'publisher', e.target.value)}
                          placeholder="Publisher"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                        <input
                          type="date"
                          value={source.date}
                          onChange={(e) => updateSource(index, 'date', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                        <input
                          type="url"
                          value={source.url}
                          onChange={(e) => updateSource(index, 'url', e.target.value)}
                          placeholder="URL"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section>
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Notes</h3>
                <textarea
                  value={editedCase.notes || ''}
                  onChange={(e) => setEditedCase({ ...editedCase, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  rows={3}
                />
              </section>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Save to Database
            </button>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              Connected to PostgreSQL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
