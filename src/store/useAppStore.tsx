import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ViewMode } from '../types';

interface AppState {
  view: ViewMode;
  activeCourseId: string | null;
  searchQuery: string;
  sidebarOpen: boolean;
  setView: (view: ViewMode, courseId?: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: (open?: boolean) => void;
}

const AppStoreContext = createContext<AppState | null>(null);

function parseHash(): { view: ViewMode; courseId: string | null } {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const first = parts[0] || 'batches';
  if (first === 'batch' && parts[1]) {
    return { view: 'batch', courseId: parts[1] };
  }
  if (first === 'batches' || first === 'free' || first === 'ebooks') {
    return { view: first, courseId: null };
  }
  return { view: 'batches', courseId: null };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = useState<ViewMode>('batches');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const syncFromHash = () => {
      const parsed = parseHash();
      setViewState(parsed.view);
      setActiveCourseId(parsed.courseId);
      setSidebarOpen(false);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const setView = useCallback((nextView: ViewMode, courseId?: string | null) => {
    const cid = courseId ?? null;
    setViewState(nextView);
    setActiveCourseId(cid);
    setSidebarOpen(false);
    if (nextView !== 'batches' && nextView !== 'free') {
      setSearchQuery('');
    }
    const nextHash = nextView === 'batch' && cid ? `#/batch/${cid}` : `#/${nextView}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleSidebar = useCallback((open?: boolean) => {
    setSidebarOpen((prev) => (open === undefined ? !prev : open));
  }, []);

  return (
    <AppStoreContext.Provider
      value={{
        view,
        activeCourseId,
        searchQuery,
        sidebarOpen,
        setView,
        setSearchQuery,
        toggleSidebar,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppState {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore must be used inside AppStoreProvider');
  }
  return ctx;
}
