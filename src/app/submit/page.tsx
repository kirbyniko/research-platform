'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

interface DuplicateResults {
  existingCases: Array<{ id: number; victim_name: string; incident_date: string; facility_name: string; city?: string; state?: string; verification_status: string }>;
  existingSources: Array<{ url: string; incident_id: number; victim_name: string; verification_status?: string }>;
  guestSubmissionCount: number;
  hasPotentialDuplicates: boolean;
  hasVerifiedMatch: boolean;
  allowSubmission: boolean;
  reason?: string;
}

// Collapsible section component
function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100">
        <span className="font-medium text-gray-700">{title}</span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  description: string;
}

interface SourceItem {
  url: string;
  title: string;
}

export default function GuestSubmitPage() {
  const [formData, setFormData] = useState({
    victimName: '',
    dateOfDeath: '',
    location: '',
    facility: '',
    description: '',
    contactEmail: '',
    incidentType: 'death_in_custody',
    // Extended fields
    age: '',
    gender: '',
    nationality: '',
    city: '',
    state: '',
    agencies: {} as Record<string, boolean>,
    causeOfDeath: '',
    mannerOfDeath: '',
    custodyDuration: '',
    medicalDenied: false,
    // Shooting
    shotsFired: '',
    weaponType: '',
    bodycamAvailable: false,
    victimArmed: false,
    shootingContext: '',
    // Force
    forceTypes: {} as Record<string, boolean>,
    victimRestrained: false,
    victimComplying: false,
  });
  const [sourceItems, setSourceItems] = useState<SourceItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  // Duplicate checking state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<DuplicateResults | null>(null);
  const [duplicatesChecked, setDuplicatesChecked] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Reset duplicate check when source items change
  useEffect(() => {
    setDuplicatesChecked(false);
    setDuplicateResults(null);
    setConfirmSubmit(false);
  }, [sourceItems]);

  // Auto-submit after duplicate check if no duplicates found
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  
  useEffect(() => {
    if (shouldAutoSubmit && duplicatesChecked && confirmSubmit && !checkingDuplicates) {
      setShouldAutoSubmit(false);
      // Trigger form submission
      document.querySelector('form')?.requestSubmit();
    }
  }, [shouldAutoSubmit, duplicatesChecked, confirmSubmit, checkingDuplicates]);

  const checkForDuplicates = useCallback(async () => {
    setCheckingDuplicates(true);
    setDuplicateResults(null);
    setError('');
    
    try {
      const sourceUrls = sourceItems.map(s => s.url).filter(url => url.trim());

      // If no identifying info provided, skip duplicate check
      if (!formData.victimName?.trim() && !formData.dateOfDeath && sourceUrls.length === 0) {
        setDuplicatesChecked(true);
        setConfirmSubmit(true);
        setCheckingDuplicates(false);
        return;
      }

      const res = await fetch('/api/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          victimName: formData.victimName,
          dateOfDeath: formData.dateOfDeath,
          facility: formData.facility,
          sourceUrls
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDuplicateResults(data);
        setDuplicatesChecked(true);
        
        // If submission is blocked (10+ guest submissions), don't allow
        if (!data.allowSubmission) {
          setConfirmSubmit(false);
          setError(data.reason || 'Too many submissions for this person. Please wait for review.');
        }
        // If no duplicates found, set confirmSubmit and trigger auto-submit
        else if (!data.hasPotentialDuplicates) {
          setConfirmSubmit(true);
          setShouldAutoSubmit(true);
        } else {
          setConfirmSubmit(false);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error checking duplicates:', errorData);
        setError(`Duplicate check failed: ${errorData.error || 'Please try again'}`);
        // On error, still allow submission
        setConfirmSubmit(true);
        setDuplicatesChecked(true);
      }
    } catch (err: any) {
      console.error('Error checking duplicates:', err);
      setError(`Network error during duplicate check: ${err.message || 'Please try again'}`);
      // On error, allow submission anyway
      setConfirmSubmit(true);
      setDuplicatesChecked(true);
    } finally {
      setCheckingDuplicates(false);
    }
  }, [formData, sourceItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    // Basic validation: require description
    if (!formData.description || formData.description.length < 20) {
      setError('Please provide a description of at least 20 characters');
      // Scroll to description field
      const descField = document.querySelector('textarea[placeholder*="Provide details"]') as HTMLElement;
      if (descField) {
        descField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        descField.focus();
        descField.classList.add('ring-2', 'ring-red-500');
        setTimeout(() => descField.classList.remove('ring-2', 'ring-red-500'), 3000);
      }
      return;
    }

    // Require at least ONE of: name, date, location, facility, sources, or media
    const hasIdentifyingInfo = 
      formData.victimName?.trim() ||
      formData.dateOfDeath ||
      formData.location?.trim() ||
      formData.facility?.trim() ||
      sourceItems.some(s => s.url.trim()) ||
      mediaItems.some(m => m.url.trim());

    if (!hasIdentifyingInfo) {
      setError('Please provide at least one identifying detail: name, date, location, facility, source URL, or media link');
      // Scroll to top of form
      const firstField = document.querySelector('input[type="text"]') as HTMLElement;
      if (firstField) {
        firstField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // If duplicates haven't been checked yet, check first
    if (!duplicatesChecked) {
      await checkForDuplicates();
      // After check, need user to click again if duplicates found
      // But if no duplicates, will proceed automatically via useEffect
      return;
    }
    
    // If submission is blocked (10+ guest submissions), prevent submit
    if (duplicateResults && !duplicateResults.allowSubmission) {
      setError(duplicateResults.reason || 'This submission cannot be processed at this time. Too many submissions for this person are already pending review.');
      // Scroll to duplicate results
      const duplicateSection = document.querySelector('.bg-red-50') as HTMLElement;
      if (duplicateSection) {
        duplicateSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // If duplicates found and not confirmed, don't submit
    if (duplicateResults?.hasPotentialDuplicates && !confirmSubmit) {
      setError('Please review the similar cases above and confirm whether you want to submit this as a new report');
      // Scroll to duplicate results
      const duplicateSection = document.querySelector('.bg-amber-50') as HTMLElement;
      if (duplicateSection) {
        duplicateSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setSubmitting(true);

    try {
      const res = await fetch('/api/guest-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sourceUrls: sourceItems.map(s => s.url).filter(url => url.trim()),
          mediaUrls: mediaItems
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    // Reset duplicate check if key fields change
    if (['victimName', 'dateOfDeath', 'sourceUrls'].includes(field)) {
      setDuplicatesChecked(false);
      setDuplicateResults(null);
      setConfirmSubmit(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold mb-4 text-green-600">Submission Received</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your report. Our team will review it and, if verified, 
              it may be added to our database. We may contact you if you provided an email.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={() => {
                  setFormData({
                    victimName: '',
                    dateOfDeath: '',
                    location: '',
                    facility: '',
                    description: '',
                    contactEmail: '',
                    incidentType: 'death_in_custody',
                    age: '', gender: '', nationality: '', city: '', state: '',
                    agencies: {}, causeOfDeath: '', mannerOfDeath: '', custodyDuration: '', medicalDenied: false,
                    shotsFired: '', weaponType: '', bodycamAvailable: false, victimArmed: false, shootingContext: '',
                    forceTypes: {}, victimRestrained: false, victimComplying: false,
                  });
                  setMediaItems([]);
                  setSourceItems([]);
                  setSubmitted(false);
                  setDuplicatesChecked(false);
                  setDuplicateResults(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
              >
                Submit Another Report
              </button>
              <Link href="/" className="px-6 py-2 text-blue-600 hover:underline text-center inline-block">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-2">Submit a Report</h1>
          <p className="text-gray-600 mb-6">
            Use this form to report information about deaths or incidents connected to ICE.
            All submissions are reviewed before being added to the database.
          </p>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
            <p className="text-sm text-blue-800">
              <strong>Anonymous/Unknown Cases:</strong> If the victim&apos;s name is not known, you can leave the name field blank or enter &quot;Unknown&quot;. 
              Please provide other identifying information such as date, location, facility, or source documents.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Please provide source links whenever possible.
              We can only include information that can be independently verified.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Incident Type
              </label>
              <select
                value={formData.incidentType}
                onChange={(e) => handleFormChange('incidentType', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <optgroup label="Deaths">
                  <option value="death_in_custody">Death in Custody</option>
                  <option value="death_during_operation">Death During Operation</option>
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
                </optgroup>
                <optgroup label="Rights Issues">
                  <option value="rights_violation">Rights Violation</option>
                  <option value="medical_neglect">Medical Neglect</option>
                </optgroup>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Victim&apos;s Name (if known)
              </label>
              <input
                type="text"
                value={formData.victimName}
                onChange={(e) => handleFormChange('victimName', e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Incident
              </label>
              <input
                type="date"
                value={formData.dateOfDeath}
                onChange={(e) => handleFormChange('dateOfDeath', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (City, State)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleFormChange('location', e.target.value)}
                placeholder="e.g., Houston, TX"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name (if applicable)
              </label>
              <input
                type="text"
                value={formData.facility}
                onChange={(e) => handleFormChange('facility', e.target.value)}
                placeholder="e.g., Stewart Detention Center"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* Extended Subject Info */}
            <CollapsibleSection title="Additional Subject Details (Optional)">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" value={formData.age} onChange={(e) => handleFormChange('age', e.target.value)} placeholder="Age" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={formData.gender} onChange={(e) => handleFormChange('gender', e.target.value)} className="w-full px-3 py-2 border rounded">
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                  <input type="text" value={formData.nationality} onChange={(e) => handleFormChange('nationality', e.target.value)} placeholder="Country" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={formData.city} onChange={(e) => handleFormChange('city', e.target.value)} placeholder="City" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input type="text" value={formData.state} onChange={(e) => handleFormChange('state', e.target.value)} placeholder="State" className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
            </CollapsibleSection>

            {/* Agencies Involved */}
            <CollapsibleSection title="Agencies Involved (Optional)">
              <div className="grid grid-cols-3 gap-2">
                {['ice', 'cbp', 'border_patrol', 'local_police', 'state_police', 'dhs', 'private_contractor', 'unknown'].map(agency => (
                  <label key={agency} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={formData.agencies[agency] || false} onChange={(e) => setFormData({...formData, agencies: {...formData.agencies, [agency]: e.target.checked}})} />
                    {agency.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            {/* Death Details - Conditional */}
            {formData.incidentType.includes('death') && (
              <CollapsibleSection title="Death Details (Optional)">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cause of Death</label>
                    <input type="text" value={formData.causeOfDeath} onChange={(e) => handleFormChange('causeOfDeath', e.target.value)} placeholder="As stated in records" className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manner of Death</label>
                    <select value={formData.mannerOfDeath} onChange={(e) => handleFormChange('mannerOfDeath', e.target.value)} className="w-full px-3 py-2 border rounded">
                      <option value="">Unknown</option>
                      <option value="natural">Natural</option>
                      <option value="accident">Accident</option>
                      <option value="suicide">Suicide</option>
                      <option value="homicide">Homicide</option>
                      <option value="undetermined">Undetermined</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custody Duration</label>
                    <input type="text" value={formData.custodyDuration} onChange={(e) => handleFormChange('custodyDuration', e.target.value)} placeholder="e.g., 6 months" className="w-full px-3 py-2 border rounded" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={formData.medicalDenied} onChange={(e) => handleFormChange('medicalDenied', e.target.checked)} />
                    Medical requests denied
                  </label>
                </div>
              </CollapsibleSection>
            )}

            {/* Shooting Details - Conditional */}
            {formData.incidentType === 'shooting' && (
              <CollapsibleSection title="Shooting Details (Optional)">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shots Fired</label>
                      <input type="number" value={formData.shotsFired} onChange={(e) => handleFormChange('shotsFired', e.target.value)} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weapon Type</label>
                      <select value={formData.weaponType} onChange={(e) => handleFormChange('weaponType', e.target.value)} className="w-full px-3 py-2 border rounded">
                        <option value="">Select...</option>
                        <option value="handgun">Handgun</option>
                        <option value="rifle">Rifle</option>
                        <option value="taser">Taser</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.bodycamAvailable} onChange={(e) => handleFormChange('bodycamAvailable', e.target.checked)} /> Bodycam Available</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.victimArmed} onChange={(e) => handleFormChange('victimArmed', e.target.checked)} /> Victim Armed</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Context</label>
                    <textarea value={formData.shootingContext} onChange={(e) => handleFormChange('shootingContext', e.target.value)} placeholder="Brief circumstances..." rows={2} className="w-full px-3 py-2 border rounded" />
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Force Details - Conditional */}
            {formData.incidentType === 'excessive_force' && (
              <CollapsibleSection title="Force Details (Optional)">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {['physical', 'taser', 'pepper_spray', 'baton', 'rubber_bullets'].map(ft => (
                      <label key={ft} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.forceTypes[ft] || false} onChange={(e) => setFormData({...formData, forceTypes: {...formData.forceTypes, [ft]: e.target.checked}})} />
                        {ft.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.victimRestrained} onChange={(e) => handleFormChange('victimRestrained', e.target.checked)} /> Victim Restrained</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.victimComplying} onChange={(e) => handleFormChange('victimComplying', e.target.checked)} /> Victim Complying</label>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Describe what happened. Include as many details as you know..."
                rows={5}
                required
                minLength={20}
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source URLs
              </label>
              <p className="text-xs text-gray-600 mb-3 bg-blue-50 border border-blue-200 rounded p-2">
                <strong className="text-blue-700">Important:</strong> Please provide source links whenever possible. We can only include information that can be independently verified.
              </p>
              
              <div className="space-y-3 mb-3">
                {sourceItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) => {
                          const newItems = [...sourceItems];
                          newItems[index].url = e.target.value;
                          setSourceItems(newItems);
                        }}
                        placeholder="https://example.com/news-article"
                        className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSourceItems(sourceItems.filter((_, i) => i !== index));
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const newItems = [...sourceItems];
                        newItems[index].title = e.target.value;
                        setSourceItems(newItems);
                      }}
                      placeholder="Source title (e.g., 'NY Times Article', 'ICE Press Release')"
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setSourceItems([...sourceItems, { url: '', title: '' }])}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 text-sm"
              >
                + Add Source
              </button>
              <p className="text-xs text-gray-500 mt-2">News articles, official reports, etc.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images &amp; Videos
              </label>
              
              <div className="space-y-3 mb-3">
                {mediaItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) => {
                          const newItems = [...mediaItems];
                          newItems[index].url = e.target.value;
                          setMediaItems(newItems);
                        }}
                        placeholder="https://example.com/photo.jpg"
                        className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                      />
                      <select
                        value={item.type}
                        onChange={(e) => {
                          const newItems = [...mediaItems];
                          newItems[index].type = e.target.value as 'image' | 'video';
                          setMediaItems(newItems);
                        }}
                        className="px-3 py-2 border rounded text-sm"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setMediaItems(mediaItems.filter((_, i) => i !== index))}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...mediaItems];
                        newItems[index].description = e.target.value;
                        setMediaItems(newItems);
                      }}
                      placeholder="Description / Alt text (what does this show?)"
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setMediaItems([...mediaItems, { url: '', type: 'image', description: '' }])}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50 text-sm"
              >
                + Add Image/Video
              </button>
              
              <p className="text-xs text-gray-500 mt-2">
                Images/videos serve as evidence and don&apos;t require quote verification. Add descriptions to explain what each shows.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Email (optional)
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleFormChange('contactEmail', e.target.value)}
                placeholder="For follow-up questions only"
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                We&apos;ll only contact you if we need clarification. Your email won&apos;t be published.
              </p>
            </div>

            {/* Duplicate Check Results */}
            {duplicatesChecked && duplicateResults && (
              <div className={`p-4 rounded border ${
                !duplicateResults.allowSubmission
                  ? 'bg-red-50 border-red-200'
                  : duplicateResults.hasPotentialDuplicates 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-green-50 border-green-200'
              }`}>
                {!duplicateResults.allowSubmission ? (
                  <div>
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="font-medium">Submission Blocked</span>
                    </div>
                    <p className="text-sm text-red-800">{duplicateResults.reason}</p>
                  </div>
                ) : !duplicateResults.hasPotentialDuplicates ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">No existing records found matching your submission.</span>
                  </div>
                ) : duplicateResults.hasVerifiedMatch ? (
                  // Verified match found - redirect to suggest edit
                  <div>
                    <div className="flex items-center gap-2 text-blue-700 mb-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">This case is already verified in our database:</span>
                    </div>

                    {duplicateResults.existingCases.filter(c => c.verification_status === 'verified').length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-blue-800 mb-2">Verified cases matching your submission:</p>
                        <ul className="space-y-2">
                          {duplicateResults.existingCases.filter(c => c.verification_status === 'verified').map((c) => (
                            <li key={c.id} className="text-sm bg-white/50 p-3 rounded border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Link 
                                    href={`/incidents/${c.id}`} 
                                    className="text-blue-600 hover:underline font-medium"
                                    target="_blank"
                                  >
                                    {c.victim_name || 'Unknown'}
                                  </Link>
                                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Verified</span>
                                  <p className="text-gray-600 text-sm mt-1">
                                    {new Date(c.incident_date).toLocaleDateString()}
                                    {c.facility_name && ` at ${c.facility_name}`}
                                    {c.city && c.state && ` (${c.city}, ${c.state})`}
                                  </p>
                                </div>
                                <Link
                                  href={`/incidents/${c.id}#suggest-edit`}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 whitespace-nowrap"
                                >
                                  Suggest Edit
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {duplicateResults.existingSources.filter(s => s.verification_status === 'verified').length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-blue-800 mb-2">Your source is linked to a verified case:</p>
                        <ul className="space-y-2">
                          {duplicateResults.existingSources.filter(s => s.verification_status === 'verified').map((s, i) => (
                            <li key={i} className="text-sm bg-white/50 p-3 rounded border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-gray-700 font-medium">{s.victim_name || 'Unknown'}</span>
                                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Verified</span>
                                  <p className="text-gray-500 text-xs mt-1 break-all">
                                    Source: {s.url.length > 50 ? s.url.substring(0, 50) + '...' : s.url}
                                  </p>
                                </div>
                                <Link
                                  href={`/incidents/${s.incident_id}#suggest-edit`}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 whitespace-nowrap"
                                >
                                  Suggest Edit
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <p className="text-sm text-blue-800 mb-3">
                        <strong>Want to add information to this verified case?</strong> Click &quot;Suggest Edit&quot; above to propose changes or additions. 
                        Your suggestions will be reviewed by our team.
                      </p>
                      <p className="text-sm text-gray-600">
                        If this is a <strong>different incident</strong> with a similar name, you can still submit a new report:
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={confirmSubmit}
                          onChange={(e) => setConfirmSubmit(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">
                          This is a different incident — submit as a new report
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  // Unverified matches or guest submissions - show warning but allow submission
                  <div>
                    <div className="flex items-center gap-2 text-amber-700 mb-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-medium">
                        {duplicateResults.reason || 'We may already have this information (pending review):'}
                      </span>
                    </div>

                    {duplicateResults.existingCases.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-amber-800 mb-2">Similar cases in our database:</p>
                        <ul className="space-y-2">
                          {duplicateResults.existingCases.map((c) => (
                            <li key={c.id} className="text-sm bg-white/50 p-2 rounded">
                              <Link 
                                href={`/incidents/${c.id}`} 
                                className="text-blue-600 hover:underline font-medium"
                                target="_blank"
                              >
                                {c.victim_name || 'Unknown'}
                              </Link>
                              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                {c.verification_status === 'first_review' ? 'Under Review' : 'Pending'}
                              </span>
                              <span className="text-gray-600">
                                {' '}&mdash; {new Date(c.incident_date).toLocaleDateString()}
                                {c.facility_name && ` at ${c.facility_name}`}
                                {c.city && c.state && ` (${c.city}, ${c.state})`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {duplicateResults.existingSources.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-amber-800 mb-2">Sources already in our database:</p>
                        <ul className="space-y-2">
                          {duplicateResults.existingSources.map((s, i) => (
                            <li key={i} className="text-sm bg-white/50 p-2 rounded">
                              <a 
                                href={s.url} 
                                className="text-blue-600 hover:underline break-words"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {s.url.length > 60 ? s.url.substring(0, 60) + '...' : s.url}
                              </a>
                              {s.victim_name && (
                                <span className="text-gray-600"> &mdash; linked to {s.victim_name}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-amber-200">
                      <p className="text-sm text-amber-800 mb-3">
                        If you have <strong>additional information</strong> about an existing case, 
                        your submission is still valuable. Otherwise, this case may already be documented.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmSubmit}
                          onChange={(e) => setConfirmSubmit(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-amber-900">
                          I may have new or different information
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={checkingDuplicates || submitting}
                className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingDuplicates ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking for existing records...
                  </span>
                ) : submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Log in
          </Link>{' '}
          to submit with attribution.
        </div>
      </div>
    </div>
  );
}
