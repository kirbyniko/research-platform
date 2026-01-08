import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { DescopeProvider } from '@/components/DescopeProvider';

export const metadata: Metadata = {
  title: 'ICE Deaths Documentation Project',
  description: 'Verified records of deaths connected to U.S. Immigration and Customs Enforcement',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DescopeProvider>
        <header className="border-b border-gray-200">
          <nav className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Link href="/" className="text-xl font-semibold">
                ICE Deaths Documentation
              </Link>
              <ul className="flex flex-wrap gap-6 text-sm">
                <li><Link href="/" className="hover:underline">Home</Link></li>
                <li><Link href="/cases" className="hover:underline">Cases</Link></li>
                <li><Link href="/patterns" className="hover:underline">Patterns</Link></li>
                <li><Link href="/methodology" className="hover:underline">Methodology</Link></li>
                <li><Link href="/data" className="hover:underline">Data</Link></li>
              </ul>
            </div>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600">
            <p>This project documents deaths in ICE custody using publicly available sources.</p>
            <p className="mt-2">All data is version-controlled and open for verification.</p>
          </div>
        </footer>
        </DescopeProvider>
      </body>
    </html>
  );
}
