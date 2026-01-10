'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface FormData {
  // Petitioner Info
  petitionerName: string;
  petitionerRelationship: string;
  petitionerPhone: string;
  petitionerEmail: string;
  hasAttorney: string;
  
  // Detainee Info
  detaineeName: string;
  detaineeANumber: string;
  detaineeDOB: string;
  detaineeNationality: string;
  detaineeAddress: string;
  
  // Detention Details
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  detentionStartDate: string;
  detentionLength: string;
  
  // Bond Hearing
  hadBondHearing: string;
  bondHearingDate: string;
  bondHearingOutcome: string;
  bondAmount: string;
  
  // Legal Grounds
  legalGrounds: string[];
  prolongedDetention: boolean;
  medicalNeglect: boolean;
  dueProcessViolation: boolean;
  constitutionalViolation: boolean;
  
  // Additional Info
  priorDeportationOrders: string;
  criminalHistory: string;
  additionalDetails: string;
}

export default function HabeasCorpusFormPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    petitionerName: '',
    petitionerRelationship: '',
    petitionerPhone: '',
    petitionerEmail: '',
    hasAttorney: 'no',
    detaineeName: '',
    detaineeANumber: '',
    detaineeDOB: '',
    detaineeNationality: '',
    detaineeAddress: '',
    facilityName: '',
    facilityAddress: '',
    facilityCity: '',
    facilityState: '',
    detentionStartDate: '',
    detentionLength: '',
    hadBondHearing: 'no',
    bondHearingDate: '',
    bondHearingOutcome: '',
    bondAmount: '',
    legalGrounds: [],
    prolongedDetention: false,
    medicalNeglect: false,
    dueProcessViolation: false,
    constitutionalViolation: false,
    priorDeportationOrders: '',
    criminalHistory: '',
    additionalDetails: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/legal-help/habeas-corpus-form');
      return;
    }
    const user = session.user as { role?: string };
    if (user.role !== 'analyst' && user.role !== 'admin' && user.role !== 'editor') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return <div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>;
  }

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleLegalGround = (ground: string) => {
    setFormData(prev => ({
      ...prev,
      legalGrounds: prev.legalGrounds.includes(ground)
        ? prev.legalGrounds.filter(g => g !== ground)
        : [...prev.legalGrounds, ground]
    }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    // Store form data in sessionStorage and redirect to preview
    sessionStorage.setItem('habeas_form_data', JSON.stringify(formData));
    router.push('/legal-help/habeas-corpus-preview');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/legal-help/habeas-corpus-guide" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Guide
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Habeas Corpus Petition Form</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <p className="text-sm font-medium text-yellow-800">
          <strong>Privacy Notice:</strong> This form is processed entirely in your browser. 
          No personal information is sent to our servers unless you explicitly choose to save a draft.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4, 5].map(num => (
            <div key={num} className={`text-sm ${step >= num ? 'text-black font-semibold' : 'text-gray-400'}`}>
              Step {num}
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-black rounded-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {/* Step 1: Petitioner Information */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Petitioner Information</h2>
            <p className="text-sm text-gray-600 mb-4">
              The petitioner is the person filing this petition (you or the detained person).
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-1">Your Full Name *</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.petitionerName}
                onChange={e => updateField('petitionerName', e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Relationship to Detainee *</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.petitionerRelationship}
                onChange={e => updateField('petitionerRelationship', e.target.value)}
              >
                <option value="">Select relationship...</option>
                <option value="self">Self (I am the detained person)</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="other_family">Other Family Member</option>
                <option value="friend">Friend</option>
                <option value="advocate">Advocate/Organization</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.petitionerPhone}
                  onChange={e => updateField('petitionerPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.petitionerEmail}
                  onChange={e => updateField('petitionerEmail', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Do you have an attorney? *</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="yes"
                    checked={formData.hasAttorney === 'yes'}
                    onChange={e => updateField('hasAttorney', e.target.value)}
                    className="mr-2"
                  />
                  Yes, I have attorney representation
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="no"
                    checked={formData.hasAttorney === 'no'}
                    onChange={e => updateField('hasAttorney', e.target.value)}
                    className="mr-2"
                  />
                  No, I am representing myself (pro se)
                </label>
              </div>
            </div>

            {formData.hasAttorney === 'no' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
                <strong className="text-blue-900">We strongly recommend seeking legal counsel.</strong>
                <p className="text-blue-800 mt-1">
                  <Link href="/legal-help#pro-bono" className="underline">View pro bono resources →</Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Detainee Information */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Detainee Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">Full Legal Name *</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.detaineeName}
                onChange={e => updateField('detaineeName', e.target.value)}
                placeholder="As it appears on official documents"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">A-Number (if known)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.detaineeANumber}
                  onChange={e => updateField('detaineeANumber', e.target.value)}
                  placeholder="A123456789"
                />
                <p className="text-xs text-gray-500 mt-1">9-digit number starting with A</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.detaineeDOB}
                  onChange={e => updateField('detaineeDOB', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Country of Nationality *</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.detaineeNationality}
                onChange={e => updateField('detaineeNationality', e.target.value)}
                placeholder="Mexico"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Last Known Address (before detention)</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={2}
                value={formData.detaineeAddress}
                onChange={e => updateField('detaineeAddress', e.target.value)}
                placeholder="Street address, city, state, ZIP"
              />
            </div>
          </div>
        )}

        {/* Step 3: Detention Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Detention Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">Detention Facility Name *</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.facilityName}
                onChange={e => updateField('facilityName', e.target.value)}
                placeholder="e.g., Stewart Detention Center"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Facility Address</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                value={formData.facilityAddress}
                onChange={e => updateField('facilityAddress', e.target.value)}
                placeholder="Street address"
              />
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  className="border border-gray-300 rounded px-3 py-2"
                  value={formData.facilityCity}
                  onChange={e => updateField('facilityCity', e.target.value)}
                  placeholder="City"
                />
                <input
                  type="text"
                  className="border border-gray-300 rounded px-3 py-2"
                  value={formData.facilityState}
                  onChange={e => updateField('facilityState', e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date Detention Began *</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.detentionStartDate}
                  onChange={e => updateField('detentionStartDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Length of Detention</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.detentionLength}
                  onChange={e => updateField('detentionLength', e.target.value)}
                  placeholder="e.g., 8 months"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from start date</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Has there been a bond hearing? *</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="yes"
                    checked={formData.hadBondHearing === 'yes'}
                    onChange={e => updateField('hadBondHearing', e.target.value)}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="no"
                    checked={formData.hadBondHearing === 'no'}
                    onChange={e => updateField('hadBondHearing', e.target.value)}
                    className="mr-2"
                  />
                  No
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pending"
                    checked={formData.hadBondHearing === 'pending'}
                    onChange={e => updateField('hadBondHearing', e.target.value)}
                    className="mr-2"
                  />
                  Pending/Requested
                </label>
              </div>
            </div>

            {formData.hadBondHearing === 'yes' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded border border-gray-200">
                <div>
                  <label className="block text-sm font-medium mb-1">Bond Hearing Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={formData.bondHearingDate}
                    onChange={e => updateField('bondHearingDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Outcome</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={formData.bondHearingOutcome}
                    onChange={e => updateField('bondHearingOutcome', e.target.value)}
                  >
                    <option value="">Select outcome...</option>
                    <option value="bond_granted">Bond Granted</option>
                    <option value="bond_denied">Bond Denied</option>
                    <option value="no_bond_set">No Bond Determination</option>
                  </select>
                </div>
                {formData.bondHearingOutcome === 'bond_granted' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Bond Amount</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      value={formData.bondAmount}
                      onChange={e => updateField('bondAmount', e.target.value)}
                      placeholder="$10,000"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Legal Grounds */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Legal Grounds for Petition</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select all grounds that apply to this case:
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start p-4 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.legalGrounds.includes('prolonged_detention')}
                  onChange={() => toggleLegalGround('prolonged_detention')}
                  className="mt-1 mr-3 flex-shrink-0"
                />
                <div>
                  <div className="font-medium">Prolonged Detention Without Bond Hearing</div>
                  <div className="text-sm text-gray-600">
                    Detained for 6+ months without individualized bond hearing (Rodriguez/Jennings claim)
                  </div>
                </div>
              </label>

              <label className="flex items-start p-4 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.legalGrounds.includes('indefinite_detention')}
                  onChange={() => toggleLegalGround('indefinite_detention')}
                  className="mt-1 mr-3 flex-shrink-0"
                />
                <div>
                  <div className="font-medium">Indefinite Post-Removal Detention</div>
                  <div className="text-sm text-gray-600">
                    Continued detention after final removal order with no foreseeable removal (Zadvydas claim)
                  </div>
                </div>
              </label>

              <label className="flex items-start p-4 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.legalGrounds.includes('due_process')}
                  onChange={() => toggleLegalGround('due_process')}
                  className="mt-1 mr-3 flex-shrink-0"
                />
                <div>
                  <div className="font-medium">Due Process Violations</div>
                  <div className="text-sm text-gray-600">
                    Fifth Amendment - lack of adequate hearing, improper procedures, denial of rights
                  </div>
                </div>
              </label>

              <label className="flex items-start p-4 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.legalGrounds.includes('conditions')}
                  onChange={() => toggleLegalGround('conditions')}
                  className="mt-1 mr-3 flex-shrink-0"
                />
                <div>
                  <div className="font-medium">Conditions of Confinement</div>
                  <div className="text-sm text-gray-600">
                    Eighth Amendment - cruel and unusual punishment, medical neglect, unsafe conditions
                  </div>
                </div>
              </label>

              <label className="flex items-start p-4 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.legalGrounds.includes('unreasonable_seizure')}
                  onChange={() => toggleLegalGround('unreasonable_seizure')}
                  className="mt-1 mr-3 flex-shrink-0"
                />
                <div>
                  <div className="font-medium">Unreasonable Seizure</div>
                  <div className="text-sm text-gray-600">
                    Fourth Amendment - unlawful arrest or detention without probable cause
                  </div>
                </div>
              </label>
            </div>

            {formData.legalGrounds.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800">
                Please select at least one legal ground to proceed.
              </div>
            )}
          </div>
        )}

        {/* Step 5: Additional Information */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">Prior Deportation Orders</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.priorDeportationOrders}
                onChange={e => updateField('priorDeportationOrders', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="none">None</option>
                <option value="pending">Pending removal order</option>
                <option value="final">Final removal order issued</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Criminal History</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.criminalHistory}
                onChange={e => updateField('criminalHistory', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="none">No criminal history</option>
                <option value="minor">Minor offenses (traffic, misdemeanors)</option>
                <option value="major">Felony convictions</option>
                <option value="pending">Pending criminal charges</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Additional Details</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={6}
                value={formData.additionalDetails}
                onChange={e => updateField('additionalDetails', e.target.value)}
                placeholder="Provide any additional relevant information about the case, including medical conditions, family ties, community support, employment history, or other factors..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Be specific about facts that support your legal claims.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold text-green-900 mb-2">Review Your Information</h3>
              <p className="text-sm text-green-800 mb-3">
                Before proceeding, please review all information for accuracy. You'll be able to preview 
                the generated petition and make changes before downloading.
              </p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✓ Petitioner: {formData.petitionerName || '(not provided)'}</li>
                <li>✓ Detainee: {formData.detaineeName || '(not provided)'}</li>
                <li>✓ Facility: {formData.facilityName || '(not provided)'}</li>
                <li>✓ Legal grounds: {formData.legalGrounds.length} selected</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        
        {step < 5 ? (
          <button
            onClick={nextStep}
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!formData.petitionerName || !formData.detaineeName || formData.legalGrounds.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Generate Petition →
          </button>
        )}
      </div>
    </div>
  );
}
