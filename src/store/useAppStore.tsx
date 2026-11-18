import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ViewMode } from '../types';

const FAVORITES_STORAGE_KEY = 'pandeyji_favorite_batches';

interface AppState {
  view: ViewMode;
  activeCourseId: string | null;
  searchQuery: string;
  sidebarOpen: boolean;
  favoriteIds: string[];
  setView: (view: ViewMode, courseId?: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: (open?: boolean) => void;
  toggleFavorite: (batchId: string) => void;
  isFavorite: (batchId: string) => boolean;
}

const AppStoreContext = createContext<AppState | null>(null);

function loadFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseHash(): { view: ViewMode; courseId: string | null } {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const first = parts[0] || 'batches';
  if (first === 'batch' && parts[1]) {
    return { view: 'batch', courseId: parts[1] };
  }
  if (first === 'batches' || first === 'free' || first === 'ebooks' || first === 'favorites') {
    return { view: first, courseId: null };
  }
  return { view: 'batches', courseId: null };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = useState<ViewMode>('batches');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavorites());

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
    if (nextView !== 'batches' && nextView !== 'free' && nextView !== 'favorites') {
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

  const toggleFavorite = useCallback((batchId: string) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(batchId);
      const next = exists ? prev.filter((id) => id !== batchId) : [...prev, batchId];
      try {
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (batchId: string) => favoriteIds.includes(batchId),
    [favoriteIds]
  );

  return (
    <AppStoreContext.Provider
      value={{
        view,
        activeCourseId,
        searchQuery,
        sidebarOpen,
        favoriteIds,
        setView,
        setSearchQuery,
        toggleSidebar,
        toggleFavorite,
        isFavorite,
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
