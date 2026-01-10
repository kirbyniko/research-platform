'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface FormData {
  petitionerName: string;
  petitionerRelationship: string;
  petitionerPhone: string;
  petitionerEmail: string;
  detaineeName: string;
  detaineeANumber: string;
  detaineeDOB: string;
  detaineeNationality: string;
  detaineeAddress: string;
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  detentionStartDate: string;
  hadBondHearing: string;
  bondHearingDate: string;
  bondHearingOutcome: string;
  bondAmount: string;
  legalGrounds: string[];
  priorDeportationOrders: string;
  criminalHistory: string;
  additionalDetails: string;
}

export default function HabeasCorpusPreviewPage() {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [district, setDistrict] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/legal-help/habeas-corpus-preview');
      return;
    }
    const user = session.user as { role?: string };
    if (user.role !== 'analyst' && user.role !== 'admin' && user.role !== 'editor') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    const stored = sessionStorage.getItem('habeas_form_data');
    if (stored) {
      setFormData(JSON.parse(stored));
    }
  }, []);

  if (status === 'loading' || !session) {
    return <div className="max-w-4xl mx-auto px-4 py-12">Loading...</div>;
  }

  if (!formData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">No form data found. Please complete the form first.</p>
          <Link href="/legal-help/habeas-corpus-form" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Go to Form
          </Link>
        </div>
      </div>
    );
  }

  const calculateDetentionDays = () => {
    if (!formData.detentionStartDate) return 0;
    const start = new Date(formData.detentionStartDate);
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const detentionDays = calculateDetentionDays();
  const detentionMonths = Math.floor(detentionDays / 30);

  const generatePetition = () => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `UNITED STATES DISTRICT COURT
FOR THE ${district || '[DISTRICT]'}

${formData.petitionerName},
    Petitioner,
    
v.                                      Case No. __________

ALEJANDRO MAYORKAS, Secretary of
Homeland Security, et al.,
    Respondents.

PETITION FOR WRIT OF HABEAS CORPUS

COMES NOW Petitioner, ${formData.petitionerName}, ${formData.petitionerRelationship === 'self' ? 'pro se' : 'on behalf of ' + formData.detaineeName}, and respectfully petitions this Court for a writ of habeas corpus pursuant to 28 U.S.C. § 2241, and in support thereof states as follows:

I. INTRODUCTION

This petition challenges the unlawful detention of ${formData.detaineeName} by U.S. Immigration and Customs Enforcement (ICE). ${formData.detaineeName} has been detained at ${formData.facilityName} in ${formData.facilityCity}, ${formData.facilityState} since ${new Date(formData.detentionStartDate).toLocaleDateString()} (approximately ${detentionMonths} months, ${detentionDays % 30} days).

${formData.hadBondHearing === 'no' ? `Despite this prolonged detention, ${formData.detaineeName} has not been afforded a bond hearing before an immigration judge.` : ''}

${formData.legalGrounds.includes('prolonged_detention') ? `This prolonged civil detention without an individualized bond hearing violates ${formData.detaineeName}'s Fifth Amendment right to due process under Rodriguez v. Robbins, 715 F.3d 1127 (9th Cir. 2013) and Jennings v. Rodriguez, 138 S. Ct. 830 (2018).` : ''}

II. JURISDICTION AND VENUE

This Court has jurisdiction over this petition pursuant to 28 U.S.C. § 2241. Venue is proper in this district under 28 U.S.C. § 2241(a) because ${formData.detaineeName} is detained at ${formData.facilityName}, which is located within this district.

III. PARTIES

A. Petitioner

Petitioner ${formData.petitionerName} ${formData.petitionerRelationship === 'self' ? 'is the detained individual' : `is the ${formData.petitionerRelationship} of ${formData.detaineeName} and brings this petition on ${formData.detaineeName}'s behalf`}.

${formData.petitionerEmail ? `Petitioner's contact information:
Email: ${formData.petitionerEmail}` : ''}
${formData.petitionerPhone ? `Phone: ${formData.petitionerPhone}` : ''}

B. Respondents

1. Alejandro Mayorkas, Secretary of the U.S. Department of Homeland Security, is sued in his official capacity as the federal official with ultimate authority over immigration detention.

2. John Doe, ICE Field Office Director responsible for ${formData.detaineeName}'s detention, is sued in his or her official capacity.

3. Jane Roe, Warden of ${formData.facilityName}, is sued in her official capacity as the immediate custodian of ${formData.detaineeName}.

IV. FACTUAL BACKGROUND

${formData.detaineeName} is a ${formData.detaineeNationality} national${formData.detaineeAge ? `, ${formData.detaineeAge} years old,` : ''} ${formData.detaineeANumber ? `with alien registration number ${formData.detaineeANumber}` : ''}.

${formData.detaineeAddress ? `Prior to detention, ${formData.detaineeName} resided at ${formData.detaineeAddress}.` : ''}

${formData.detaineeName} has been in ICE custody since ${new Date(formData.detentionStartDate).toLocaleDateString()}, a period of ${detentionMonths} months and ${detentionDays % 30} days. ${formData.detaineeName} is currently detained at:

${formData.facilityName}
${formData.facilityAddress || ''}
${formData.facilityCity}, ${formData.facilityState}

${formData.hadBondHearing === 'yes' ? `
A bond hearing was held on ${new Date(formData.bondHearingDate).toLocaleDateString()}. ${formData.bondHearingOutcome === 'bond_denied' ? `Bond was denied.` : formData.bondHearingOutcome === 'bond_granted' ? `Bond was set at ${formData.bondAmount}, which ${formData.detaineeName} has been unable to pay.` : `No bond determination was made.`}` : ''}

${formData.priorDeportationOrders === 'final' ? `A final order of removal has been issued.` : formData.priorDeportationOrders === 'pending' ? `Removal proceedings are pending.` : ''}

${formData.additionalDetails ? `

Additional relevant facts:

${formData.additionalDetails}` : ''}

V. LEGAL CLAIMS

${formData.legalGrounds.includes('prolonged_detention') ? `
A. Prolonged Detention Without Bond Hearing Violates Due Process

${formData.detaineeName}'s detention of ${detentionMonths} months without an individualized bond hearing violates the Fifth Amendment's Due Process Clause. The Supreme Court has held that civil immigration detention is non-punitive and must be subject to constitutional constraints. Jennings v. Rodriguez, 138 S. Ct. 830, 846 (2018).

The Ninth Circuit in Rodriguez v. Robbins held that prolonged detention triggers due process protections requiring a bond hearing before an immigration judge with the burden on the government to prove detention is justified. 715 F.3d 1127, 1136-37 (9th Cir. 2013). The court found that detention exceeding six months presumptively becomes unreasonable. Id. at 1138.

Here, ${formData.detaineeName} has been detained for ${detentionMonths} months—well beyond the six-month threshold—without the constitutionally required bond hearing. This prolonged civil detention without individualized review violates due process.
` : ''}

${formData.legalGrounds.includes('indefinite_detention') ? `
B. Indefinite Post-Removal Order Detention Violates Due Process

${formData.priorDeportationOrders === 'final' ? `Following the final removal order, ${formData.detaineeName}'s continued detention has become indefinite and presumptively unreasonable under Zadvydas v. Davis, 533 U.S. 678 (2001). Zadvydas holds that post-removal detention must be limited to a period reasonably necessary to effect removal. Id. at 689. The Court established a six-month presumptively reasonable period, after which detention becomes constitutionally suspect absent evidence that removal is imminent. Id. at 701.

${formData.detaineeName} has been detained for ${detentionMonths} months since the removal order, with no reasonable prospect of removal to ${formData.detaineeNationality} in the foreseeable future. This indefinite detention violates due process.` : ''}
` : ''}

${formData.legalGrounds.includes('due_process') ? `
C. Procedural Due Process Violations

${formData.detaineeName} has been denied adequate procedural protections in violation of the Fifth Amendment. [Additional specific facts about procedural violations would be inserted here based on the case.]
` : ''}

${formData.legalGrounds.includes('conditions') ? `
D. Conditions of Confinement Violate the Eighth Amendment

The conditions at ${formData.facilityName} constitute cruel and unusual punishment in violation of the Eighth Amendment as applied to civil detainees through the Fifth Amendment's Due Process Clause. [Specific facts about dangerous conditions, medical neglect, or other constitutional violations would be detailed here.]
` : ''}

${formData.legalGrounds.includes('unreasonable_seizure') ? `
E. Unreasonable Seizure Under the Fourth Amendment

${formData.detaineeName}'s initial detention and continued custody constitute an unreasonable seizure under the Fourth Amendment. [Specific facts about the basis for the Fourth Amendment claim would be detailed here.]
` : ''}

VI. PRAYER FOR RELIEF

WHEREFORE, Petitioner respectfully requests that this Court:

1. Issue a writ of habeas corpus directing Respondents to release ${formData.detaineeName} from custody;

2. Alternatively, order Respondents to provide ${formData.detaineeName} with an immediate bond hearing before an immigration judge, with the burden on the government to prove by clear and convincing evidence that ${formData.detaineeName}'s detention is justified;

3. Issue a temporary restraining order and preliminary injunction enjoining ${formData.detaineeName}'s removal pending resolution of this petition;

4. Award Petitioner costs and attorneys' fees; and

5. Grant such other and further relief as the Court deems just and proper.

Dated: ${today}

Respectfully submitted,


_____________________________
${formData.petitionerName}
${formData.petitionerRelationship === 'self' ? 'Pro Se Petitioner' : `${formData.petitionerRelationship.charAt(0).toUpperCase() + formData.petitionerRelationship.slice(1)} of ${formData.detaineeName}`}
${formData.petitionerEmail || ''}
${formData.petitionerPhone || ''}


VERIFICATION

I, ${formData.petitionerName}, declare under penalty of perjury pursuant to 28 U.S.C. § 1746 that the foregoing is true and correct to the best of my knowledge, information, and belief.

Executed on ${today}.


_____________________________
${formData.petitionerName}
`;
  };

  const downloadPetition = () => {
    const petition = generatePetition();
    const blob = new Blob([petition], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habeas-petition-${formData.detaineeName.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link href="/legal-help/habeas-corpus-form" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← Edit Form
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Petition Preview</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <p className="text-sm font-medium text-yellow-800">
          <strong>Important:</strong> This is a template. You must review and customize it for your specific case. 
          We strongly recommend having an attorney review this document before filing.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Federal District Court:</label>
        <select
          className="w-full max-w-md border border-gray-300 rounded px-3 py-2"
          value={district}
          onChange={e => setDistrict(e.target.value)}
        >
          <option value="">Select district...</option>
          <option value="SOUTHERN DISTRICT OF CALIFORNIA">S.D. California</option>
          <option value="CENTRAL DISTRICT OF CALIFORNIA">C.D. California</option>
          <option value="SOUTHERN DISTRICT OF TEXAS">S.D. Texas</option>
          <option value="DISTRICT OF ARIZONA">D. Arizona</option>
          <option value="MIDDLE DISTRICT OF GEORGIA">M.D. Georgia</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          <Link href="/legal-help/district-info" className="text-blue-600 hover:underline">
            View filing instructions by district →
          </Link>
        </p>
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-lg p-8 mb-6 font-mono text-sm whitespace-pre-wrap">
        {generatePetition()}
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={downloadPetition}
          className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 font-medium"
        >
          Download Petition (.txt)
        </button>
        <Link
          href="/legal-help/case-law"
          className="px-6 py-3 border border-gray-300 rounded hover:bg-gray-50 inline-block"
        >
          Review Case Law
        </Link>
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal ml-5">
          <li>Review and customize this petition for your specific circumstances</li>
          <li>Gather supporting evidence (detention records, medical records, declarations)</li>
          <li>File the petition with the appropriate federal district court</li>
          <li>Serve copies on all named respondents according to court rules</li>
          <li>Follow up with the court clerk regarding hearing dates</li>
        </ol>
        <p className="text-sm text-blue-800 mt-4">
          <strong>Need help?</strong> <Link href="/legal-help#pro-bono" className="underline">Contact pro bono resources →</Link>
        </p>
      </div>
    </div>
  );
}
