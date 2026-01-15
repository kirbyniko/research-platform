import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'ICE Incident Tracker',
  description: 'Verified records of incidents connected to U.S. Immigration and Customs Enforcement',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
        <Navigation />
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Beta Site:</strong> This site is under active construction. Data is currently unverified and should not be cited as authoritative.
            </p>
          </div>
        </div>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600">
            <p>This project documents incidents connected to ICE using publicly available sources.</p>
            <p className="mt-2">All data is version-controlled and open for verification.</p>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
