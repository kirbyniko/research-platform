'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface District {
  name: string;
  states: string;
  courtAddress: string;
  clerkPhone: string;
  eFilingSystem: string;
  eFilingUrl: string;
  filingFee: string;
  feeWaiverForm: string;
  localRules: string;
  proSeHelp: string;
  notes: string[];
}

const districts: District[] = [
  {
    name: "U.S. District Court, Southern District of California",
    states: "CA (San Diego area)",
    courtAddress: "880 Front Street, San Diego, CA 92101",
    clerkPhone: "(619) 557-5600",
    eFilingSystem: "CM/ECF",
    eFilingUrl: "https://ecf.casd.uscourts.gov",
    filingFee: "$5 (habeas corpus petition)",
    feeWaiverForm: "Form AO 240 (Application to Proceed In Forma Pauperis)",
    localRules: "https://www.casd.uscourts.gov/rules/local-rules",
    proSeHelp: "Self-Help Center: (619) 557-6915",
    notes: [
      "Heavy immigration caseload due to border proximity",
      "Judges familiar with Rodriguez/Jennings claims",
      "Must serve ICE Field Office Director and facility warden",
      "Pro se filers: File original + 2 copies",
      "Response typically due 30 days after service"
    ]
  },
  {
    name: "U.S. District Court, Central District of California",
    states: "CA (Los Angeles area)",
    courtAddress: "350 W 1st Street, Los Angeles, CA 90012",
    clerkPhone: "(213) 894-1565",
    eFilingSystem: "CM/ECF",
    eFilingUrl: "https://ecf.cacd.uscourts.gov",
    filingFee: "$5 (habeas corpus petition)",
    feeWaiverForm: "Form AO 240",
    localRules: "https://www.cacd.uscourts.gov/rules",
    proSeHelp: "Pro Se Clinic: Check court website for hours",
    notes: [
      "Busiest immigration detention district in U.S.",
      "Strong precedents for bond hearings after 6 months",
      "E-filing requires PACER account (free for pro se)",
      "Consider filing in Santa Ana or Riverside divisions for facilities there",
      "Local Rule 83-2.3 covers pro se procedures"
    ]
  },
  {
    name: "U.S. District Court, Southern District of Texas",
    states: "TX (Houston, Brownsville, Laredo areas)",
    courtAddress: "515 Rusk Avenue, Houston, TX 77002",
    clerkPhone: "(713) 250-5500",
    eFilingSystem: "CM/ECF",
    eFilingUrl: "https://ecf.txs.uscourts.gov",
    filingFee: "$5 (habeas corpus petition)",
    feeWaiverForm: "Form AO 240",
    localRules: "https://www.txs.uscourts.gov/page/local-rules",
    proSeHelp: "Limited pro se assistance; consider legal aid",
    notes: [
      "Fifth Circuit precedent less favorable than Ninth Circuit",
      "Emphasize Jennings (Supreme Court) over circuit cases",
      "Multiple detention facilities across wide geographic area",
      "Determine correct division based on facility location",
      "Response deadline varies by judge (typically 30-60 days)"
    ]
  },
  {
    name: "U.S. District Court, District of Arizona",
    states: "AZ",
    courtAddress: "401 W Washington Street, Phoenix, AZ 85003",
    clerkPhone: "(602) 322-7200",
    eFilingSystem: "CM/ECF",
    eFilingUrl: "https://ecf.azd.uscourts.gov",
    filingFee: "$5 (habeas corpus petition)",
    feeWaiverForm: "Form AO 240",
    localRules: "https://www.azd.uscourts.gov/local-rules",
    proSeHelp: "Florence Project: (520) 474-7014 (free representation)",
    notes: [
      "Ninth Circuit precedents apply (favorable)",
      "High volume of ICE detention cases",
      "Florence Correctional Center has dedicated legal services",
      "File in Tucson division for southern facilities",
      "Eloy Detention Center cases typically filed in Phoenix"
    ]
  },
  {
    name: "U.S. District Court, Middle District of Georgia",
    states: "GA (Atlanta area and Irwin County)",
    courtAddress: "475 Mulberry Street, Macon, GA 31201",
    clerkPhone: "(478) 752-3497",
    eFilingSystem: "CM/ECF",
    eFilingUrl: "https://ecf.gamd.uscourts.gov",
    filingFee: "$5 (habeas corpus petition)",
    feeWaiverForm: "Form AO 240",
    localRules: "https://www.gamd.uscourts.gov/local-rules",
    proSeHelp: "Georgia Detention Watch: (404) 738-7230",
    notes: [
      "Eleventh Circuit - mixed precedents on bond hearings",
      "Irwin County Detention Center heavily scrutinized",
      "Emphasize Supreme Court precedents over circuit law",
      "Stewart Detention Center cases filed in Columbus division",
      "Atlanta ICE Field Office address: 180 Ted Turner Drive SW"
    ]
  }
];

export default function DistrictInfoPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/legal-help/district-info');
      return;
    }
    const user = session.user as { role?: string };
    if (user.role !== 'analyst' && user.role !== 'admin' && user.role !== 'editor') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return <div className="max-w-5xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link href="/legal-help" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Legal Resources
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">District Court Filing Instructions</h1>
      
      <p className="text-gray-700 mb-8">
        Step-by-step filing information for the federal district courts handling the highest volume of 
        immigration detention habeas corpus cases. Always verify current procedures with the clerk's office.
      </p>

      <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-8">
        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Critical Filing Requirements</h3>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>File in the district where the detainee is physically located</li>
          <li>Name all required parties: DHS Secretary, ICE Director, Facility Warden</li>
          <li>Serve all parties via U.S. Marshals Service or certified mail</li>
          <li>Include certificate of service with proof of mailing dates</li>
          <li>Request fee waiver (IFP) if unable to pay $5 filing fee</li>
        </ul>
      </div>

      <div className="space-y-8">
        {districts.map((district, index) => (
          <div key={index} className="border border-gray-300 rounded-lg p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{district.name}</h2>
            <div className="text-sm text-gray-600 mb-4">{district.states}</div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm font-semibold text-gray-700">Court Address</div>
                <div className="text-sm text-gray-800">{district.courtAddress}</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-700">Clerk's Office</div>
                <div className="text-sm text-gray-800">{district.clerkPhone}</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-700">E-Filing System</div>
                <div className="text-sm">
                  <a href={district.eFilingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {district.eFilingSystem} →
                  </a>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-700">Filing Fee</div>
                <div className="text-sm text-gray-800">{district.filingFee}</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-700">Fee Waiver Form</div>
                <div className="text-sm text-gray-800">{district.feeWaiverForm}</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-700">Pro Se Help</div>
                <div className="text-sm text-gray-800">{district.proSeHelp}</div>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">Local Rules & Procedures</div>
              <a href={district.localRules} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                View local rules →
              </a>
            </div>
            
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Important Notes</div>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {district.notes.map((note, noteIndex) => (
                  <li key={noteIndex}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded">
        <h3 className="font-semibold text-gray-900 mb-3">General Filing Steps (All Districts)</h3>
        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex">
            <span className="font-semibold mr-2">1.</span>
            <span>Complete the habeas corpus petition using this tool or with attorney assistance</span>
          </li>
          <li className="flex">
            <span className="font-semibold mr-2">2.</span>
            <span>Identify the correct district based on detention facility location</span>
          </li>
          <li className="flex">
            <span className="font-semibold mr-2">3.</span>
            <span>Register for CM/ECF account (if filing electronically) at court's e-filing website</span>
          </li>
          <li className="flex">
            <span className="font-semibold mr-2">4.</span>
            <span>File Form AO 240 (fee waiver application) if unable to afford $5 filing fee</span>
          </li>
          <li className="flex">
            <span className="font-semibold mr-2">5.</span>
            <span>Submit petition to clerk's office (e-file or mail 3 copies if pro se paper filing)</span>
          </li>
          <li className="flex">
            <span className="font-semibold mr-2">6.</span>
            <span>Serve all respondents: DHS Secretary (via U.S. Attorney), ICE Director, Facility Warden</span>
          </li>
          <li className="flex">
            <span className="font-semibold mr-2">7.</span>
            <span>File certificate of service within 3 days of serving respondents</span>
          </li>
          <li className="flex">
            <span className="font-semibold mr-2">8.</span>
            <span>Monitor case docket for government's response (typically 30-60 days)</span>
          </li>
        </ol>
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-3">Service of Process Addresses</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>U.S. Attorney's Office:</strong> Find the address for the district where you're filing at 
            <a href="https://www.justice.gov/usao/find-your-united-states-attorney" target="_blank" rel="noopener noreferrer" className="underline ml-1">
              justice.gov/usao
            </a>
          </div>
          <div>
            <strong>ICE Field Office Directors:</strong> Listed on petition preview page based on detention location
          </div>
          <div>
            <strong>Facility Warden/Administrator:</strong> Contact detention facility directly for correct name and address
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/legal-help/habeas-corpus-form"
          className="inline-block px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
        >
          Start Petition Form →
        </Link>
      </div>
    </div>
  );
}
