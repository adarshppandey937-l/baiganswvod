import { Gift, LoaderCircle, MonitorPlay, Play, Search, User, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cn,
  fetchFreeVideos,
  fileProxyUrl,
  formatDate,
  getPlaybackSources,
} from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Batch, FreeVideo, PlaybackSource } from '../types';
import { BatchCard } from './BatchesView';
import { EmptyState } from './EmptyState';
import { VideoPlayer } from './VideoPlayer';

function useDebouncedSearch() {
  const storeQuery = useAppStore().searchQuery;
  const setStoreQuery = useAppStore().setSearchQuery;
  const [localVal, setLocalVal] = useState(storeQuery);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalVal(storeQuery);
  }, [storeQuery]);

  const setValue = (val: string) => {
    setLocalVal(val);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStoreQuery(val), 350);
  };

  return { value: localVal, set: setValue };
}

function FreeVideoCard({
  video,
  index,
  onPlay,
}: {
  video: FreeVideo;
  index: number;
  onPlay: (v: FreeVideo) => void;
}) {
  const isYt = Boolean(video.isYoutube);

  return (
    <article
      onClick={() => onPlay(video)}
      className="liquid-glass liquid-glass-hover rounded-2xl overflow-hidden cursor-pointer group sb-fade-up flex flex-col"
      style={{ animationDelay: `${40 * Math.min(index, 12)}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(video);
      }}
      aria-label={`Play ${video.title}`}
    >
      <div className="relative w-full aspect-video bg-stone-100 border-b border-stone-200/80">
        {video.image ? (
          <img
            src={fileProxyUrl(video.image)}
            alt={video.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-500"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-stone-100">
            <MonitorPlay className="w-10 h-10 text-purple-500/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent z-10" />
        <span
          className={cn(
            'absolute top-3 left-3 z-20 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border backdrop-blur-md',
            video.isShort
              ? 'bg-fuchsia-500/90 text-white border-fuchsia-300/60'
              : isYt
              ? 'bg-red-600/90 text-white border-red-300/60'
              : 'bg-purple-600/90 text-white border-purple-300/60'
          )}
        >
          {video.isShort ? 'Short' : isYt ? 'YouTube' : 'Class'}
        </span>
        <span className="absolute inset-0 z-20 m-auto w-14 h-14 rounded-full bg-purple-600/90 group-hover:bg-purple-500 border border-purple-300/60 shadow-[0_0_24px_rgba(147,51,234,0.45)] flex items-center justify-center transition-all group-hover:scale-110">
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </span>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-[13px] font-bold text-stone-900 sb-clamp-2 leading-snug group-hover:text-purple-700 transition-colors">
          {video.title}
        </h3>
        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-auto">
          <User className="w-3 h-3" />
          <span className="truncate">{video.teacherName || 'Faculty'}</span>
          {video.categoryName && (
            <>
              <span className="text-stone-300">·</span>
              <span className="truncate text-purple-600">{video.categoryName}</span>
            </>
          )}
        </p>
        <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">
          {formatDate(video.sourceDate)}
        </p>
      </div>
    </article>
  );
}

export function FreeView({ freeBatches }: { freeBatches: Batch[] }) {
  const { setView } = useAppStore();
  const [videos, setVideos] = useState<FreeVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videoType, setVideoType] = useState<'all' | 'classes' | 'shorts'>('all');
  const [activePlayer, setActivePlayer] = useState<{
    video: FreeVideo;
    source: PlaybackSource;
    sources: PlaybackSource[];
  } | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { value: searchVal, set: setSearchVal } = useDebouncedSearch();

  const loadPage = useCallback(
    async (pageNum: number, reset: boolean) => {
      try {
        const res = await fetchFreeVideos({
          page: pageNum,
          limit: 12,
          search: searchVal,
          type: videoType,
        });
        setHasMore(res.hasMore);
        setTotal(res.total);
        setVideos((prev) => (reset ? res.data : [...prev, ...res.data]));
      } catch {
        setHasMore(false);
      } finally {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    [searchVal, videoType]
  );

  useEffect(() => {
    setInitialLoading(true);
    setPage(1);
    loadPage(1, true);
  }, [loadPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !initialLoading && !loadingMore) {
          setLoadingMore(true);
          const next = page + 1;
          setPage(next);
          loadPage(next, false);
        }
      },
      { rootMargin: '600px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, initialLoading, loadingMore, page, loadPage]);

  const handlePlay = (video: FreeVideo) => {
    const sources = getPlaybackSources({ classLink: video.classLink, recordings: [] });
    if (sources.length === 0) return;
    setActivePlayer({ video, source: sources[0], sources });
    setTimeout(() => {
      document
        .getElementById('sb-free-player-anchor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const tabs: Array<{ id: 'all' | 'classes' | 'shorts'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'classes', label: 'Classes' },
    { id: 'shorts', label: 'Shorts' },
  ];

  return (
    <div className="space-y-8">
      <section className="liquid-glass rounded-[2rem] p-6 sm:p-10 relative overflow-hidden sb-fade-up">
        <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-emerald-100/70 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-full mb-5">
            <Gift className="w-3.5 h-3.5" /> 100% Free Content
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-[1.08] mb-4">
            Explore <span className="gold-text">Free Content</span>
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-medium leading-relaxed max-w-2xl">
            Free full batches, free classes &amp; shorts — no payment, no catch. Just pure learning,
            straight from the herd.
          </p>
        </div>
      </section>

      <div id="sb-free-player-anchor">
        <AnimatePresence>
          {activePlayer && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
            >
              <VideoPlayer
                source={activePlayer.source}
                sources={activePlayer.sources}
                onSourceChange={(s) =>
                  setActivePlayer((prev) => (prev ? { ...prev, source: s } : prev))
                }
                title={activePlayer.video.title}
                subtitle={activePlayer.video.teacherName || 'Free Class'}
                poster={
                  activePlayer.video.image ? fileProxyUrl(activePlayer.video.image) : undefined
                }
                onBack={() => setActivePlayer(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="space-y-5">
        <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2.5 px-1">
          <Zap className="w-5 h-5 text-emerald-600" /> Free Full Batches
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            ({freeBatches.length})
          </span>
        </h2>
        {freeBatches.length === 0 ? (
          <EmptyState
            icon={<Gift className="w-10 h-10 text-stone-400" />}
            title="No free batches yet"
            msg="Check back soon — new free batches drop regularly."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {freeBatches.map((batch, idx) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                index={idx}
                onOpen={(b) => setView('batch', b.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2.5">
            <MonitorPlay className="w-5 h-5 text-purple-600" /> Free Classes &amp; Shorts
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
              ({total})
            </span>
          </h2>
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVideoType(tab.id)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                  videoType === tab.id
                    ? 'bg-purple-600 text-white border-purple-500 glow-purple'
                    : 'liquid-glass text-stone-600 hover:text-stone-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search free videos…"
            aria-label="Search free videos"
            className="w-full liquid-glass rounded-2xl pl-14 pr-5 py-4 text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {initialLoading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sb-skeleton rounded-2xl h-56" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptyState
            icon={<Search className="w-10 h-10 text-stone-400" />}
            title="No free videos found"
            msg="Try a different search term."
          />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {videos.map((v, idx) => (
                <FreeVideoCard key={v.id} video={v} index={idx} onPlay={handlePlay} />
              ))}
            </div>
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="flex justify-center py-6">
                <LoaderCircle className="w-6 h-6 text-purple-600 animate-spin" />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
