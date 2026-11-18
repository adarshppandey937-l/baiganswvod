import { Heart, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Batch } from '../types';
import { BatchCard, BatchesSkeleton } from './BatchesView';
import { EmptyState } from './EmptyState';

export function FavoritesView({
  batches,
  loading,
  error,
}: {
  batches: Batch[];
  loading: boolean;
  error: string | null;
}) {
  const { favoriteIds, searchQuery, setSearchQuery, setView } = useAppStore();

  const favoriteBatches = useMemo(() => {
    const favSet = new Set(favoriteIds);
    const list = batches.filter((b) => favSet.has(b.id));
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    const words = q.split(/\s+/);
    return list.filter((b) => {
      const text = `${b.title} ${b.facultyName || ''} ${b.mainCategory || ''} ${
        b.categoryName || ''
      } ${b.shortDescription || ''}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [batches, favoriteIds, searchQuery]);

  if (loading) return <BatchesSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<Heart className="w-10 h-10 text-red-500" />}
        title="Couldn't load favourites"
        msg={error}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="liquid-glass rounded-[2rem] p-6 sm:p-10 relative overflow-hidden sb-fade-up">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-rose-100/70 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-full mb-5">
            <Heart className="w-3.5 h-3.5 fill-current" /> Saved Batches
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-[1.08] mb-4">
            Your <span className="gold-text">Favourite</span> Batches
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-medium leading-relaxed">
            All batches you&apos;ve marked with a heart appear here for quick access anytime.
          </p>
        </div>
      </section>

      {favoriteIds.length > 0 && (
        <div className="relative sb-fade-up" style={{ animationDelay: '60ms' }}>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search favourite batches…"
            aria-label="Search favourite batches"
            className="w-full liquid-glass rounded-2xl pl-14 pr-5 py-4 text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      )}

      {favoriteBatches.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-10 h-10 text-rose-400" />}
          title={favoriteIds.length === 0 ? 'No favourite batches yet' : 'No matching favourites'}
          msg={
            favoriteIds.length === 0
              ? 'Tap the heart icon on any batch card to save it to your Favourite list.'
              : 'Try a different search term.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {favoriteBatches.map((batch, idx) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              index={idx}
              onOpen={(b) => setView('batch', b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
