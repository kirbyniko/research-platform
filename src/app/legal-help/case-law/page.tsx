'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface LegalCase {
  name: string;
  citation: string;
  year: number;
  court: string;
  holding: string;
  relevance: string;
  link: string;
}

const cases: LegalCase[] = [
  {
    name: "Jennings v. Rodriguez",
    citation: "138 S. Ct. 830 (2018)",
    year: 2018,
    court: "U.S. Supreme Court",
    holding: "Immigration statutes do not authorize prolonged detention without a bond hearing, but the Court remanded to determine what process is constitutionally required.",
    relevance: "Establishes that prolonged immigration detention triggers due process concerns and that detainees may be entitled to periodic bond hearings.",
    link: "https://www.supremecourt.gov/opinions/17pdf/15-1204_f29g.pdf"
  },
  {
    name: "Rodriguez v. Robbins",
    citation: "715 F.3d 1127 (9th Cir. 2013)",
    year: 2013,
    court: "Ninth Circuit",
    holding: "Detained immigrants must receive bond hearings after six months of detention, with the government bearing the burden of proof.",
    relevance: "Key precedent in the Ninth Circuit establishing six-month threshold for bond hearings and shifting burden to government.",
    link: "https://cdn.ca9.uscourts.gov/datastore/opinions/2013/12/13/10-56971.pdf"
  },
  {
    name: "Zadvydas v. Davis",
    citation: "533 U.S. 678 (2001)",
    year: 2001,
    court: "U.S. Supreme Court",
    holding: "Post-removal-order detention is limited to a period reasonably necessary to effect removal. After six months, detention becomes presumptively unreasonable.",
    relevance: "Limits indefinite detention after final removal orders. Critical for cases where removal is not reasonably foreseeable.",
    link: "https://www.supremecourt.gov/opinions/00pdf/99-7791.pdf"
  },
  {
    name: "Demore v. Kim",
    citation: "538 U.S. 510 (2003)",
    year: 2003,
    court: "U.S. Supreme Court",
    holding: "Congress may require detention of certain criminal aliens during removal proceedings without violating due process.",
    relevance: "Government often cites this for mandatory detention, but later cases have limited its scope for prolonged detention.",
    link: "https://www.supremecourt.gov/opinions/02pdf/01-1491.pdf"
  },
  {
    name: "Casas-Castrillon v. Department of Homeland Security",
    citation: "535 F.3d 942 (9th Cir. 2008)",
    year: 2008,
    court: "Ninth Circuit",
    holding: "Prolonged detention under INA § 236(a) requires periodic review through bond hearings to comply with due process.",
    relevance: "Establishes framework for bond hearings in pre-removal order detention cases.",
    link: "https://cdn.ca9.uscourts.gov/datastore/opinions/2008/07/23/06-71652.pdf"
  },
  {
    name: "Diouf v. Napolitano",
    citation: "634 F.3d 1081 (9th Cir. 2011)",
    year: 2011,
    court: "Ninth Circuit",
    holding: "Immigration detainees are entitled to individualized bond hearings with the government bearing the burden of proof by clear and convincing evidence.",
    relevance: "Clarifies burden of proof standards at bond hearings and procedural requirements.",
    link: "https://cdn.ca9.uscourts.gov/datastore/opinions/2011/01/31/09-71142.pdf"
  },
  {
    name: "Hernandez v. Sessions",
    citation: "872 F.3d 976 (9th Cir. 2017)",
    year: 2017,
    court: "Ninth Circuit",
    holding: "Due process requires bond hearings for immigrants detained under INA § 236(a) after six months of detention.",
    relevance: "Reaffirms and extends Rodriguez to broader categories of detainees.",
    link: "https://cdn.ca9.uscourts.gov/datastore/opinions/2017/09/01/16-55039.pdf"
  },
  {
    name: "Singh v. Holder",
    citation: "638 F.3d 1196 (9th Cir. 2011)",
    year: 2011,
    court: "Ninth Circuit",
    holding: "At bond hearings, the government must prove detention is necessary by clear and convincing evidence, considering danger and flight risk.",
    relevance: "Establishes evidentiary standards and factors immigration judges must consider at bond hearings.",
    link: "https://cdn.ca9.uscourts.gov/datastore/opinions/2011/04/26/08-71799.pdf"
  },
  {
    name: "Prieto-Romero v. Clark",
    citation: "534 F.3d 1053 (9th Cir. 2008)",
    year: 2008,
    court: "Ninth Circuit",
    holding: "Habeas jurisdiction exists to review due process claims challenging the fact or duration of detention.",
    relevance: "Establishes federal courts' jurisdiction to hear habeas challenges to immigration detention.",
    link: "https://cdn.ca9.uscourts.gov/datastore/opinions/2008/07/02/06-35585.pdf"
  },
  {
    name: "Velasco Lopez v. Decker",
    citation: "978 F.3d 842 (2d Cir. 2020)",
    year: 2020,
    court: "Second Circuit",
    holding: "Due process requires bond hearings for immigrants detained under INA § 236(c) after six months.",
    relevance: "Extends bond hearing requirements to mandatory detention cases in the Second Circuit.",
    link: "https://law.justia.com/cases/federal/appellate-courts/ca2/18-1268/18-1268-2020-10-14.html"
  }
];

export default function CaseLawPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/legal-help/case-law');
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
      
      <h1 className="text-3xl font-bold mb-6">Key Immigration Detention Cases</h1>
      
      <p className="text-gray-700 mb-8">
        This database contains landmark cases relevant to habeas corpus petitions challenging immigration detention. 
        Cases are organized by importance and applicability to common detention scenarios.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-8">
        <h3 className="font-semibold text-blue-900 mb-2">Circuit Split Notice</h3>
        <p className="text-sm text-blue-800">
          Immigration detention law varies significantly by federal circuit. The cases below include Supreme Court 
          precedents (binding nationwide) and circuit court decisions. Check which circuit governs your detention 
          facility's jurisdiction.
        </p>
      </div>

      <div className="space-y-6">
        {cases.map((legalCase, index) => (
          <div key={index} className="border border-gray-300 rounded-lg p-6 bg-white">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{legalCase.name}</h2>
                <div className="text-sm text-gray-600 mt-1">
                  {legalCase.citation} • {legalCase.court} • {legalCase.year}
                </div>
              </div>
              <a
                href={legalCase.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800"
              >
                Read Opinion →
              </a>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Holding:</div>
                <p className="text-gray-800">{legalCase.holding}</p>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Relevance:</div>
                <p className="text-gray-700 text-sm">{legalCase.relevance}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded">
        <h3 className="font-semibold text-gray-900 mb-3">Circuit Coverage</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong className="text-gray-900">Ninth Circuit</strong>
            <p className="text-gray-700">CA, AZ, NV, OR, WA, ID, MT, AK, HI</p>
            <p className="text-xs text-gray-600 mt-1">Most developed bond hearing precedents</p>
          </div>
          <div>
            <strong className="text-gray-900">Second Circuit</strong>
            <p className="text-gray-700">NY, CT, VT</p>
            <p className="text-xs text-gray-600 mt-1">Extended bond hearings to § 236(c) detainees</p>
          </div>
          <div>
            <strong className="text-gray-900">Fifth Circuit</strong>
            <p className="text-gray-700">TX, LA, MS</p>
            <p className="text-xs text-gray-600 mt-1">More restrictive on bond hearing rights</p>
          </div>
          <div>
            <strong className="text-gray-900">Eleventh Circuit</strong>
            <p className="text-gray-700">FL, GA, AL</p>
            <p className="text-xs text-gray-600 mt-1">Variable precedents, check district cases</p>
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
