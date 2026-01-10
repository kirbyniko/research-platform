'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HabeasCorpusGuidePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/legal-help/habeas-corpus-guide');
      return;
    }
    const user = session.user as { role?: string };
    if (user.role !== 'analyst' && user.role !== 'admin' && user.role !== 'editor') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return <div className="max-w-4xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/legal-help" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Legal Resources
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Habeas Corpus Petition Guide</h1>
      
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
        <p className="text-sm font-medium text-red-800">
          <strong>Legal Disclaimer:</strong> This information is for educational purposes only and does not constitute legal advice. 
          Immigration law is complex and constantly changing. We strongly recommend consulting with a qualified immigration attorney 
          before filing any petition. Self-representation in habeas corpus cases has a significantly lower success rate than 
          representation by counsel.
        </p>
      </div>

      <div className="prose max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">What is Habeas Corpus?</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            <em>Habeas corpus</em> (Latin: "you shall have the body") is a constitutional right that allows individuals 
            to challenge unlawful detention. In immigration contexts, habeas corpus petitions can challenge:
          </p>
          <ul className="list-disc ml-6 space-y-2 text-gray-700">
            <li>Prolonged detention without bond hearings</li>
            <li>Indefinite detention after final removal orders</li>
            <li>Lack of due process during detention proceedings</li>
            <li>Constitutional violations while in detention</li>
            <li>Dangerous conditions or medical neglect in detention facilities</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">When Can You File?</h2>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <p className="font-semibold text-blue-900 mb-2">You can file immediately if detention is unlawful.</p>
            <p className="text-sm text-blue-800">
              You do NOT need to wait 6 months if someone is being held despite court-ordered release, 
              is facing life-threatening medical neglect, or if there's no legal basis for detention. 
              File as soon as you have grounds.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
            <h3 className="font-semibold mb-2">Who Can File</h3>
            <p className="text-sm text-gray-700 mb-2">You may file a habeas petition if you are:</p>
            <ul className="list-disc ml-6 text-sm text-gray-700 space-y-1">
              <li>The detained person (petitioner)</li>
              <li>A family member acting on behalf of the detained person</li>
              <li>An attorney representing the detained person</li>
              <li>A legal guardian or authorized representative</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h3 className="font-semibold mb-2">Common Legal Grounds</h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="text-gray-900">Prolonged Detention (Rodriguez/Jennings Claims)</strong>
                <p className="text-gray-700">
                  Detention exceeding 6 months without a bond hearing may violate due process. 
                  Courts have held that prolonged civil immigration detention requires periodic bond hearings.
                </p>
              </div>
              <div>
                <strong className="text-gray-900">Indefinite Post-Order Detention (Zadvydas Claims)</strong>
                <p className="text-gray-700">
                  After a final removal order, detention must be reasonably limited. If removal is not reasonably 
                  foreseeable, continued detention may be unlawful.
                </p>
              </div>
              <div>
                <strong className="text-gray-900">Constitutional Violations</strong>
                <p className="text-gray-700">
                  Fourth Amendment (unreasonable seizure), Fifth Amendment (due process), 
                  Eighth Amendment (cruel and unusual punishment), Fourteenth Amendment (equal protection).
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">What Can Habeas Corpus Do?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-green-200 bg-green-50 rounded p-4">
              <h3 className="font-semibold text-green-900 mb-2">Possible Relief</h3>
              <ul className="text-sm text-green-800 space-y-1 list-disc ml-4">
                <li>Order a bond hearing</li>
                <li>Release from detention</li>
                <li>Reduce bond amount</li>
                <li>Transfer to better conditions</li>
                <li>Stay of removal pending hearing</li>
              </ul>
            </div>
            <div className="border border-red-200 bg-red-50 rounded p-4">
              <h3 className="font-semibold text-red-900 mb-2">Cannot Do</h3>
              <ul className="text-sm text-red-800 space-y-1 list-disc ml-4">
                <li>Grant immigration status</li>
                <li>Cancel removal orders</li>
                <li>Reopen closed cases</li>
                <li>Change immigration court decisions</li>
                <li>Guarantee release</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Timeline and Representation</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm text-yellow-900"><strong>Important:</strong> Having an attorney significantly improves outcomes. Federal courts accept pro se (self-represented) petitions, but navigating the legal process alone is challenging.</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <strong>Typical Timeline:</strong>
                <ul className="list-disc ml-6 mt-1 space-y-1">
                  <li>Government response: 30-60 days after service</li>
                  <li>Hearing scheduled: 2-6 months after filing</li>
                  <li>Decision: Days to months after hearing</li>
                  <li>Emergency motions (TRO): 24-48 hours if life/safety at risk</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Before You File</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">1</div>
              <div>
                <strong className="text-gray-900">Exhaust Administrative Remedies</strong>
                <p className="text-sm text-gray-700">In most circuits, you must first request a bond hearing through immigration court before filing habeas.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">2</div>
              <div>
                <strong className="text-gray-900">Check Jurisdiction</strong>
                <p className="text-sm text-gray-700">File in the federal district court with jurisdiction over the detention facility where the person is held.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">3</div>
              <div>
                <strong className="text-gray-900">Gather Evidence</strong>
                <p className="text-sm text-gray-700">Collect detention records, medical records, family declarations, and supporting documents.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">4</div>
              <div>
                <strong className="text-gray-900">Seek Legal Counsel</strong>
                <p className="text-sm text-gray-700">Contact pro bono organizations, law school clinics, or local legal aid societies.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Ready to Proceed?</h2>
          <p className="text-gray-700 mb-6">
            Our form will guide you through gathering the necessary information to create a habeas corpus petition. 
            The process takes approximately 30-45 minutes. You can save your progress and return later.
          </p>
          <div className="flex gap-4">
            <Link 
              href="/legal-help/habeas-corpus-form"
              className="inline-block px-6 py-3 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
            >
              Start the Form →
            </Link>
            <Link 
              href="/legal-help/case-law"
              className="inline-block px-6 py-3 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Review Case Law
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
