'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function LegalHelpPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/legal-help');
      return;
    }
    const user = session.user as { role?: string };
    if (user.role !== 'analyst' && user.role !== 'admin' && user.role !== 'editor') {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <div className="max-w-4xl mx-auto px-4 py-12">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const user = session.user as { role?: string };
  if (user.role !== 'analyst' && user.role !== 'admin' && user.role !== 'editor') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Legal Resources</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <p className="text-sm font-medium text-yellow-800">
          <strong>Important:</strong> This site provides educational information and document templates only. 
          This is not legal advice. We strongly recommend consulting with an immigration attorney before filing any legal documents.
        </p>
      </div>

      <div className="space-y-6">
        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-3">Habeas Corpus Petition Helper</h2>
          <p className="text-gray-700 mb-4">
            A habeas corpus petition challenges unlawful detention. This tool helps families and advocates prepare 
            petitions for individuals held in ICE detention, particularly those detained for prolonged periods without bond hearings.
          </p>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p><strong>When to use:</strong></p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Detained for 6+ months without a bond hearing</li>
              <li>Indefinite detention after final removal order</li>
              <li>Constitutional violations during detention</li>
              <li>Dangerous conditions or medical neglect</li>
            </ul>
          </div>
          <Link 
            href="/legal-help/habeas-corpus-guide"
            className="inline-block px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Get Started →
          </Link>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-3">Find Free Legal Help</h2>
          <p className="text-gray-700 mb-4"><strong>Always try to get a lawyer.</strong> These organizations offer free legal assistance:</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="https://www.aclu.org/issues/immigrants-rights" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                ACLU Immigrants' Rights Project
              </a> - Constitutional rights advocacy and litigation
            </li>
            <li>
              <a href="https://www.nilc.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                National Immigration Law Center
              </a> - Policy analysis and legal resources
            </li>
            <li>
              <a href="https://www.immigrationadvocates.org/nonprofit/legaldirectory/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Immigration Advocates Network
              </a> - Directory of legal service providers
            </li>
            <li>
              <a href="https://www.americanbar.org/groups/public_interest/immigration/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                ABA Immigration Justice Project
              </a> - Pro bono panels by circuit
            </li>
          </ul>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-3">Additional Resources</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/legal-help/case-law" className="text-blue-600 hover:underline">
                Case Law Database
              </Link> - Key immigration detention cases
            </li>
            <li>
              <Link href="/legal-help/district-info" className="text-blue-600 hover:underline">
                Federal District Court Information
              </Link> - Filing instructions by jurisdiction
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
