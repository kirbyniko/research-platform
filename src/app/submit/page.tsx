'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface DuplicateResults {
  existingCases: Array<{ id: number; victim_name: string; incident_date: string; facility_name: string; city?: string; state?: string }>;
  existingSources: Array<{ url: string; incident_id: number; victim_name: string }>;
  hasPotentialDuplicates: boolean;
}

export default function GuestSubmitPage() {
  const [formData, setFormData] = useState({
    victimName: '',
    dateOfDeath: '',
    location: '',
    facility: '',
    description: '',
    sourceUrls: '',
    contactEmail: '',
    incidentType: 'death'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  // Duplicate checking state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<DuplicateResults | null>(null);
  const [duplicatesChecked, setDuplicatesChecked] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const checkForDuplicates = useCallback(async () => {
    setCheckingDuplicates(true);
    setDuplicateResults(null);
    
    try {
      const sourceUrls = formData.sourceUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

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
        
        // If no duplicates found, allow direct submission
        if (!data.hasPotentialDuplicates) {
          setConfirmSubmit(true);
        }
      }
    } catch (err) {
      console.error('Error checking duplicates:', err);
      // On error, allow submission anyway
      setConfirmSubmit(true);
    } finally {
      setCheckingDuplicates(false);
    }
  }, [formData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    // If duplicates haven't been checked yet, check first
    if (!duplicatesChecked) {
      await checkForDuplicates();
      return;
    }
    
    // If duplicates found and not confirmed, don't submit
    if (duplicateResults?.hasPotentialDuplicates && !confirmSubmit) {
      return;
    }
    
    setSubmitting(true);

    try {
      const res = await fetch('/api/guest-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sourceUrls: formData.sourceUrls.split('\n').filter(url => url.trim())
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

  // Reset duplicate check when form data changes
  const handleFormChange = (field: string, value: string) => {
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold mb-4 text-green-600">Submission Received</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your report. Our team will review it and, if verified, 
              it may be added to our database. We may contact you if you provided an email.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => {
                  setFormData({
                    victimName: '',
                    dateOfDeath: '',
                    location: '',
                    facility: '',
                    description: '',
                    sourceUrls: '',
                    contactEmail: '',
                    incidentType: 'death'
                  });
                  setSubmitted(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Submit Another Report
              </button>
              <Link href="/" className="px-6 py-2 text-blue-600 hover:underline">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-2">Submit a Report</h1>
          <p className="text-gray-600 mb-6">
            Use this form to report information about deaths or incidents connected to ICE.
            All submissions are reviewed before being added to the database.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Please provide source links whenever possible.
              We can only include information that can be independently verified.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
              {error}
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
                <option value="death">Death in Custody</option>
                <option value="shooting">ICE Shooting</option>
                <option value="protest">Protest Incident</option>
                <option value="other">Other Incident</option>
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
                placeholder="Full name or 'Unknown'"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source URLs (one per line)
              </label>
              <textarea
                value={formData.sourceUrls}
                onChange={(e) => handleFormChange('sourceUrls', e.target.value)}
                placeholder="https://example.com/news-article&#10;https://example.com/another-source"
                rows={3}
                className="w-full px-3 py-2 border rounded font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">News articles, official reports, etc.</p>
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
                duplicateResults.hasPotentialDuplicates 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                {!duplicateResults.hasPotentialDuplicates ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">No existing records found matching your submission.</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-amber-700 mb-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-medium">We may already have this information:</span>
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
                                className="text-blue-600 hover:underline break-all"
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
                          I understand and want to submit anyway (I have new information)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4">
              {!duplicatesChecked ? (
                <button
                  type="submit"
                  disabled={checkingDuplicates || formData.description.length < 20}
                  className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {checkingDuplicates ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Checking for existing records...
                    </span>
                  ) : 'Check & Submit Report'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || formData.description.length < 20 || (duplicateResults?.hasPotentialDuplicates && !confirmSubmit)}
                  className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              )}
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
