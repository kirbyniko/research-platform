'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Context for managing source visibility across the page
interface SourceVisibilityContextType {
  showSources: boolean;
  setShowSources: (show: boolean) => void;
}

const SourceVisibilityContext = createContext<SourceVisibilityContextType>({
  showSources: true,
  setShowSources: () => {},
});

export function useSourceVisibility() {
  return useContext(SourceVisibilityContext);
}

export function SourceVisibilityProvider({ children }: { children: ReactNode }) {
  const [showSources, setShowSources] = useState(true);

  return (
    <SourceVisibilityContext.Provider value={{ showSources, setShowSources }}>
      {children}
    </SourceVisibilityContext.Provider>
  );
}

export function SourceToggle() {
  const { showSources, setShowSources } = useSourceVisibility();

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
      <input
        type="checkbox"
        checked={showSources}
        onChange={(e) => setShowSources(e.target.checked)}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span>Show source evidence</span>
    </label>
  );
}
