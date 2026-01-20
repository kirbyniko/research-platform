import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Research Platform',
  description: 'A multi-project research documentation platform with verified records and collaborative workflows',
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
              <strong>⚠️ Beta:</strong> This platform is under active development. Features may change.
            </p>
          </div>
        </div>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600">
            <p>Research Platform - A documentation-first approach to verified research.</p>
            <p className="mt-2">All data is version-controlled and open for verification.</p>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
