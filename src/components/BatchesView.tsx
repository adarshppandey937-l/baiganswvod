import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  Play,
  Search,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { cn, parseHighlights } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Batch } from '../types';
import { BatchImage } from './BatchImage';
import { EmptyState } from './EmptyState';

function BatchCard({
  batch,
  index,
  onOpen,
}: {
  batch: Batch;
  index: number;
  onOpen: (batch: Batch) => void;
}) {
  const highlights = parseHighlights(batch.highlights).slice(0, 3);
  const faculty = batch.facultyName || 'Expert Faculty';
  const totalClasses = (batch.recordedClassesCount || 0) + (batch.liveClassesCount || 0);

  return (
    <article
      onClick={() => onOpen(batch)}
      className="liquid-glass liquid-glass-hover rounded-[1.75rem] overflow-hidden cursor-pointer group sb-fade-up w-full"
      style={{ animationDelay: `${(index % 12) * 45}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(batch);
      }}
      aria-label={`Open batch ${batch.title}`}
    >
      <div className="relative w-full aspect-video sm:aspect-[21/9] bg-stone-50 border-b border-stone-200/80">
        <BatchImage src={batch.banner || batch.bannerSquare} alt={batch.title} />
        <div className="absolute top-4 left-4 z-30 flex flex-wrap gap-2">
          {batch.isLive && (
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-red-50/95 text-red-600 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 sb-live-dot" /> Live
            </span>
          )}
          {batch.isRecorded && (
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-purple-50/95 text-purple-700 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-200">
              <Zap className="w-3 h-3" /> Recorded
            </span>
          )}
          {totalClasses > 0 && (
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/90 text-stone-700 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200">
              <BookOpen className="w-3 h-3" /> {batch._count?.classes || totalClasses} Classes
            </span>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-7 flex flex-col bg-white">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl lg:text-[1.7rem] font-black text-stone-900 group-hover:text-purple-700 transition-colors mb-3 leading-tight tracking-tight sb-clamp-2">
              {batch.title}
            </h3>
            {batch.shortDescription && (
              <p className="text-xs sm:text-sm text-stone-600 font-medium mb-3 sb-clamp-2">
                {batch.shortDescription}
              </p>
            )}
            <p className="text-xs sm:text-sm text-stone-600 font-medium mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-stone-500 shrink-0" />
              Faculty: <span className="text-stone-900 font-bold">{faculty}</span>
            </p>
            {highlights.length > 0 && (
              <ul className="text-xs sm:text-sm text-stone-600 font-medium space-y-2 mb-4 max-w-xl">
                {highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="sb-clamp-2">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {batch.validity && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5" /> Validity: {batch.validity}
              </p>
            )}
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-5 shrink-0 border-t md:border-t-0 border-stone-200 pt-4 md:pt-0">
            <div className="flex flex-col items-center md:items-end">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none">
                FREE
              </span>
              {Boolean(batch.studentCount && batch.studentCount > 0) && (
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">
                  {batch.studentCount} students
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen(batch);
              }}
              className="glow-purple w-full md:w-52 bg-purple-600 hover:bg-purple-500 text-white border border-purple-500 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 active:scale-95"
            >
              Let&apos;s Study <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold text-stone-700">
      <span className="text-purple-600">{icon}</span>
      {label}
    </span>
  );
}

export function BatchesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="sb-skeleton rounded-[2rem] h-56 w-full" />
      <div className="sb-skeleton rounded-2xl h-14 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sb-skeleton rounded-[1.75rem] h-72 w-full" />
        ))}
      </div>
    </div>
  );
}

export function BatchesView({
  batches,
  loading,
  error,
}: {
  batches: Batch[];
  loading: boolean;
  error: string | null;
}) {
  const { searchQuery, setSearchQuery, setView } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('All Courses');

  const categories = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.mainCategory) set.add(b.mainCategory);
    });
    return ['All Courses', ...Array.from(set)];
  }, [batches]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    batches.forEach((b) => {
      const cat = b.mainCategory || 'Other';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return map;
  }, [batches]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const byCat =
      selectedCategory === 'All Courses'
        ? batches
        : batches.filter((b) => b.mainCategory === selectedCategory);
    if (!q) return byCat;
    const words = q.split(/\s+/);
    return byCat.filter((b) => {
      const text = `${b.title} ${b.facultyName || ''} ${b.mainCategory || ''} ${
        b.categoryName || ''
      } ${b.shortDescription || ''}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [batches, selectedCategory, searchQuery]);

  if (loading) return <BatchesSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-10 h-10 text-red-500" />}
        title="Couldn't load batches"
        msg={error}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="liquid-glass rounded-[2rem] p-6 sm:p-10 relative overflow-hidden sb-fade-up">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-purple-100/70 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-700 bg-purple-50 border border-purple-200 px-3.5 py-2 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Premium Batch Library
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-[1.08] mb-4">
            Explore <span className="gold-text">All Batches</span>
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-medium leading-relaxed">
            Hand-picked batches with recorded &amp; live video lectures, daily class notes and PDFs
            — everything you need to charge ahead. Always free. 🦬
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <StatBadge icon={<LayoutGrid className="w-4 h-4" />} label={`${batches.length} Batches`} />
            <StatBadge
              icon={<BookOpen className="w-4 h-4" />}
              label={`${batches.reduce(
                (acc, b) => acc + (b._count?.classes || b.recordedClassesCount || 0),
                0
              )}+ Lectures`}
            />
            <StatBadge
              icon={<Users className="w-4 h-4" />}
              label={`${new Set(batches.map((b) => b.facultyName).filter(Boolean)).size}+ Faculties`}
            />
          </div>
        </div>
      </section>

      <div className="relative sb-fade-up" style={{ animationDelay: '60ms' }}>
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search batches or faculty…"
          aria-label="Search batches"
          className="w-full liquid-glass rounded-2xl pl-14 pr-5 py-4 text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      <div
        className="flex gap-2.5 overflow-x-auto sb-scroll pb-2 -mx-1 px-1 sb-fade-up"
        style={{ animationDelay: '90ms' }}
        role="tablist"
        aria-label="Filter by category"
      >
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          const count = categoryCounts.get(cat);
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'shrink-0 px-5 py-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap',
                active
                  ? 'bg-purple-600 text-white border-purple-500 glow-purple'
                  : 'liquid-glass text-stone-600 hover:text-stone-900 hover:border-purple-300'
              )}
            >
              {cat}
              {cat !== 'All Courses' && count ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-10 h-10 text-stone-400" />}
          title="No batches found"
          msg="Try a different search term or category."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((batch, i) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              index={i}
              onOpen={(b) => setView('batch', b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { BatchCard };
