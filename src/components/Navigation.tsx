'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'guest' | 'user' | 'analyst' | 'admin' | 'editor' | 'viewer';
}

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      // Not logged in
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut({ redirect: false });
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  const isActive = (path: string) => pathname?.startsWith(path);

  const navLinkClass = (path: string) =>
    `hover:text-blue-600 transition-colors ${isActive(path) ? 'text-blue-600 font-medium' : 'text-gray-700'}`;

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            Research Platform
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <ul className="flex gap-6 text-sm">
              <li><Link href="/projects" className={navLinkClass('/projects')}>Projects</Link></li>
            </ul>

            <div className="h-5 w-px bg-gray-300" />

            {/* Auth Section */}
            {loading ? (
              <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600"
                >
                  <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </span>
                  <span className="hidden lg:inline">{user.name || user.email.split('@')[0]}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'analyst' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </div>

                      <Link
                        href="/projects"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        My Projects
                      </Link>

                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}

                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={() => { setMenuOpen(false); handleLogout(); }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Link href="/api/auth/signin" className="text-gray-700 hover:text-blue-600">
                  Sign In
                </Link>
                <Link
                  href="/api/auth/signin"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-100 pt-4">
            <ul className="flex flex-col gap-3 text-sm">
              <li><Link href="/projects" className={navLinkClass('/projects')} onClick={() => setMenuOpen(false)}>Projects</Link></li>
            </ul>

            <div className="mt-4 pt-4 border-t border-gray-100">
              {user ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Signed in as {user.email}</p>
                  <Link href="/projects" className="block text-sm text-blue-600" onClick={() => setMenuOpen(false)}>My Projects</Link>
                  <button onClick={handleLogout} className="text-sm text-red-600">Sign Out</button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/api/auth/signin" className="text-sm text-gray-700" onClick={() => setMenuOpen(false)}>Sign In</Link>
                  <Link href="/api/auth/signin" className="text-sm text-blue-600 font-medium" onClick={() => setMenuOpen(false)}>Get Started</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
