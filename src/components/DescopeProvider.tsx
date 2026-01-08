'use client';

import { AuthProvider } from '@descope/react-sdk';

export function DescopeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider projectId="P33aQmmh4pAGRtI33dXBwgbTGhyQ">
      {children}
    </AuthProvider>
  );
}
