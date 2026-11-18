import { Search, Sparkles } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { BatchDetailView } from './components/BatchDetailView';
import { BatchesView } from './components/BatchesView';
import { EBooksView } from './components/EBooksView';
import { FavoritesView } from './components/FavoritesView';
import { FreeView } from './components/FreeView';
import { Sidebar, SidebarToggle } from './components/Sidebar';
import { WhatsAppModal } from './components/WhatsAppModal';
import { fetchBatches, HEADER_PHOTO_FALLBACK, HEADER_PHOTO_SRC } from './lib/api';
import { AppStoreProvider, useAppStore } from './store/useAppStore';
import type { Batch } from './types';

function StudyBisonApp() {
  const { view, activeCourseId, searchQuery, setSearchQuery, setView } = useAppStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(true);

  useEffect(() => {
    fetchBatches()
      .then((data) => {
        setBatches(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setLoading(false);
      });
  }, []);

  const freeBatches = batches.filter((b) => b.inFreeList);
  const showSearch = view === 'batches' || view === 'free' || view === 'favorites';

  return (
    <div className="sb-app min-h-screen flex flex-col bg-white">
      <div className="flex flex-1 items-start">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 liquid-glass-deep border-b border-stone-200/80">
            <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3 sm:gap-5">
              <SidebarToggle />
              <button
                onClick={() => setView('batches')}
                className="flex items-center gap-2.5 shrink-0"
                aria-label="PANDEY JI home"
              >
                <span className="w-10 h-10 rounded-xl overflow-hidden liquid-glass flex items-center justify-center shrink-0">
                  <img
                    src={HEADER_PHOTO_SRC}
                    alt="PANDEY JI logo"
                    onError={(e) => {
                      e.currentTarget.src = HEADER_PHOTO_FALLBACK;
                    }}
                    className="w-full h-full object-cover"
                  />
                </span>
                <span className="hidden md:block text-base font-black text-stone-900 tracking-tight whitespace-nowrap">
                  PANDEY <span className="gold-text">JI</span>
                </span>
              </button>

              {showSearch ? (
                <div className="relative flex-1 max-w-xl ml-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      view === 'free'
                        ? 'Search free videos…'
                        : view === 'favorites'
                        ? 'Search favourite batches…'
                        : 'Search batches or faculty…'
                    }
                    aria-label="Search"
                    className="w-full liquid-glass rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold text-stone-900 placeholder:text-stone-400 outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              ) : (
                <span className="ml-auto hidden sm:inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-700 bg-purple-50 border border-purple-200 px-3.5 py-2 rounded-full whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5" /> Learn • Practice • Charge Ahead
                </span>
              )}
            </div>
          </header>

          <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {view === 'batches' && (
              <BatchesView batches={batches} loading={loading} error={error} />
            )}
            {view === 'batch' && activeCourseId && (
              <BatchDetailView key={activeCourseId} courseId={activeCourseId} />
            )}
            {view === 'batch' && !activeCourseId && (
              <BatchesView batches={batches} loading={loading} error={error} />
            )}
            {view === 'free' && <FreeView freeBatches={freeBatches} />}
            {view === 'ebooks' && <EBooksView />}
            {view === 'favorites' && (
              <FavoritesView batches={batches} loading={loading} error={error} />
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showWhatsAppPopup && <WhatsAppModal onClose={() => setShowWhatsAppPopup(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <StudyBisonApp />
    </AppStoreProvider>
  );
}
