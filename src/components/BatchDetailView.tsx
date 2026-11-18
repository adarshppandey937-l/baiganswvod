import {
  AlertTriangle,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileStack,
  FileText,
  Folder,
  Info,
  Layers,
  MonitorPlay,
  NotebookPen,
  Play,
  User,
  Youtube,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  cn,
  fetchBatchClasses,
  fileProxyUrl,
  formatDate,
  formatDuration,
  getPdfKind,
  getPlaybackSources,
  isYoutubeUrl,
  parseHighlights,
} from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Batch, BatchClass, BatchTopic, PdfItem, PdfKind, PlaybackSource } from '../types';
import { BatchImage } from './BatchImage';
import { EmptyState } from './EmptyState';
import { PDF_STYLES, PdfViewerModal, PlaybackSettingsModal } from './Modals';
import { VideoPlayer } from './VideoPlayer';

type ContentFilter = 'all' | 'lectures' | 'notes' | 'dpp' | 'tests';

function matchesFilter(cls: BatchClass, filter: ContentFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'lectures') return Boolean(cls.classLink) || (cls.recordings || []).length > 0;
  return (cls.pdfs || []).some((p) => {
    const kind = getPdfKind(p);
    if (filter === 'notes') return kind === 'notes';
    if (filter === 'dpp') return kind === 'dpp';
    return kind === 'test';
  });
}

function PdfRow({
  pdf,
  onOpen,
}: {
  pdf: PdfItem;
  onOpen: (pdf: PdfItem) => void;
}) {
  const style = PDF_STYLES[getPdfKind(pdf)] || PDF_STYLES.notes;
  const Icon = style.icon;
  return (
    <button
      onClick={() => onOpen(pdf)}
      className="w-full flex items-center justify-between gap-2 bg-stone-50 hover:bg-purple-50 border border-stone-200 hover:border-purple-300 p-3 rounded-xl transition-all group/pdf min-w-0"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            style.box
          )}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-[11px] font-bold text-stone-700 group-hover/pdf:text-stone-900 truncate">
          {pdf.name}
        </span>
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        <span
          className={cn(
            'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border',
            style.badgeWrap
          )}
        >
          {style.badge}
        </span>
        <Download className="w-4 h-4 text-stone-400 group-hover/pdf:text-pink-600 shrink-0" />
      </span>
    </button>
  );
}

function ClassCard({
  cls,
  index,
  onPlay,
  onOpenPdf,
}: {
  cls: BatchClass;
  index: number;
  onPlay: () => void;
  onOpenPdf: (pdf: PdfItem) => void;
}) {
  const pdfs = cls.pdfs || [];
  const recordings = cls.recordings || [];
  const hasVideo = Boolean(cls.classLink) || recordings.length > 0;
  const isYt = isYoutubeUrl(cls.classLink);
  const [expanded, setExpanded] = useState(false);
  const visiblePdfs = expanded ? pdfs : pdfs.slice(0, 2);

  return (
    <article
      className="liquid-glass liquid-glass-hover rounded-[1.5rem] p-5 flex flex-col sb-fade-up min-w-0"
      style={{ animationDelay: `${40 * Math.min(index, 12)}ms` }}
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="w-11 h-11 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center shrink-0">
          {hasVideo ? (
            isYt ? (
              <Youtube className="w-5 h-5 text-red-500" />
            ) : (
              <MonitorPlay className="w-5 h-5 text-purple-600" />
            )
          ) : (
            <FileStack className="w-5 h-5 text-stone-400" />
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isYt && (
            <span className="text-[8px] font-black uppercase tracking-widest bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-200">
              YouTube
            </span>
          )}
          <span className="text-[9px] font-black uppercase tracking-widest bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-md text-stone-600 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> {formatDate(cls.date)}
          </span>
        </div>
      </div>

      <h3 className="text-[15px] font-bold text-stone-900 mb-2 sb-clamp-2 leading-snug">
        {cls.title}
      </h3>
      <p className="text-[11px] text-stone-600 font-semibold flex items-center gap-1.5 mb-1.5 min-w-0">
        <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span className="truncate">{cls.teacherName || 'Faculty'}</span>
      </p>
      <p className="text-[9px] text-stone-500 font-black uppercase tracking-widest flex items-center gap-1.5 mb-4">
        <Bookmark className="w-3 h-3" />
        <span className="truncate">{cls.sectionName || 'General'}</span>
        {cls.duration ? (
          <span className="text-purple-600">· {formatDuration(cls.duration)}</span>
        ) : null}
      </p>

      {pdfs.length > 0 && (
        <div className="space-y-2 mb-5">
          {visiblePdfs.map((p) => (
            <PdfRow key={p.id} pdf={p} onOpen={onOpenPdf} />
          ))}
          {pdfs.length > 2 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="text-[9px] font-black uppercase tracking-widest text-purple-600 hover:text-purple-800 pl-1 transition-colors"
            >
              {expanded ? '− Show less' : `+ ${pdfs.length - 2} more PDFs`}
            </button>
          )}
        </div>
      )}

      <div className="mt-auto">
        {hasVideo ? (
          <button
            onClick={onPlay}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs py-3.5 rounded-xl border border-purple-500 shadow-[0_6px_18px_rgba(147,51,234,0.22)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" /> Play Video
          </button>
        ) : (
          <div className="w-full bg-stone-100 text-stone-500 font-bold uppercase tracking-widest text-[10px] py-3.5 rounded-xl border border-stone-200 flex items-center justify-center gap-2">
            <Info className="w-4 h-4" /> No Video Linked
          </div>
        )}
      </div>
    </article>
  );
}

export function BatchDetailView({ courseId }: { courseId: string }) {
  const { setView } = useAppStore();
  const [course, setCourse] = useState<Batch | null>(null);
  const [topics, setTopics] = useState<BatchTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);
  const [activePlayer, setActivePlayer] = useState<{
    cls: BatchClass;
    source: PlaybackSource;
    sources: PlaybackSource[];
  } | null>(null);
  const [settingsCls, setSettingsCls] = useState<BatchClass | null>(null);
  const [activePdf, setActivePdf] = useState<{
    name: string;
    url: string;
    directUrl?: string;
    kind: PdfKind;
  } | null>(null);
  const [filter, setFilter] = useState<ContentFilter>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setActiveTopicIdx(0);
    setActivePlayer(null);
    fetchBatchClasses(courseId)
      .then((data) => {
        if (!mounted) return;
        setCourse(data.course);
        setTopics(data.topics || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load course content');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const currentClasses = topics[activeTopicIdx]?.classes || [];

  const filterCounts = useMemo(() => {
    const counts: Record<ContentFilter, number> = {
      all: currentClasses.length,
      lectures: 0,
      notes: 0,
      dpp: 0,
      tests: 0,
    };
    for (const cls of currentClasses) {
      if (matchesFilter(cls, 'lectures')) counts.lectures++;
      if (matchesFilter(cls, 'notes')) counts.notes++;
      if (matchesFilter(cls, 'dpp')) counts.dpp++;
      if (matchesFilter(cls, 'tests')) counts.tests++;
    }
    return counts;
  }, [currentClasses]);

  const filteredClasses = useMemo(
    () => (filter === 'all' ? currentClasses : currentClasses.filter((c) => matchesFilter(c, filter))),
    [currentClasses, filter]
  );

  const courseTotals = useMemo(() => {
    let notes = 0;
    let dpp = 0;
    let tests = 0;
    let classes = 0;
    for (const t of topics) {
      for (const c of t.classes) {
        classes++;
        for (const p of c.pdfs) {
          const kind = getPdfKind(p);
          if (kind === 'notes') notes++;
          else if (kind === 'dpp') dpp++;
          else tests++;
        }
      }
    }
    return { notes, dpp, tests, classes };
  }, [topics]);

  const highlights = useMemo(() => parseHighlights(course?.highlights).slice(0, 3), [course]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="sb-skeleton rounded-[2rem] h-40 w-full" />
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="sb-skeleton rounded-2xl h-96 hidden lg:block" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="sb-skeleton rounded-2xl h-44 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-10 h-10 text-red-500" />}
        title="Failed to load batch"
        msg={error || 'This batch could not be found.'}
      />
    );
  }

  const filterTabs: Array<[ContentFilter, string, typeof Layers]> = [
    ['all', 'All', Layers],
    ['lectures', 'Lectures', MonitorPlay],
    ['notes', 'Notes', FileText],
    ['dpp', 'DPP', NotebookPen],
    ['tests', 'Tests', ClipboardList],
  ];

  return (
    <div className="space-y-6">
      <section className="liquid-glass rounded-[2rem] overflow-hidden sb-fade-up">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-72 lg:w-96 shrink-0 aspect-video sm:aspect-auto sm:min-h-[190px] bg-stone-50 relative border-b sm:border-b-0 sm:border-r border-stone-200/80">
            <BatchImage src={course.banner} alt={course.title} />
          </div>
          <div className="flex-1 p-5 sm:p-7 min-w-0">
            <button
              onClick={() => setView('batches')}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-purple-700 transition-colors mb-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Batches
            </button>
            <h1 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight leading-tight mb-3">
              {course.title}
            </h1>
            {course.shortDescription && (
              <p className="text-xs sm:text-sm text-stone-600 font-medium mb-4 sb-clamp-2">
                {course.shortDescription}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {course.facultyName && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg">
                  <User className="w-3 h-3 text-purple-600" /> {course.facultyName}
                </span>
              )}
              {course.mainCategory && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg">
                  <Bookmark className="w-3 h-3 text-purple-600" /> {course.mainCategory}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg">
                <Layers className="w-3 h-3" /> {topics.length} Topics · {courseTotals.classes} Classes
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-pink-50 border border-pink-200 text-pink-700 px-3 py-1.5 rounded-lg">
                <FileText className="w-3 h-3" /> {courseTotals.notes} Notes
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg">
                <NotebookPen className="w-3 h-3" /> {courseTotals.dpp} DPP
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg">
                <ClipboardList className="w-3 h-3" /> {courseTotals.tests} Tests
              </span>
              {course.validity && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg">
                  Validity: {course.validity}
                </span>
              )}
            </div>
            {highlights.length > 0 && (
              <ul className="hidden sm:flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                {highlights.map((h, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-stone-600 font-semibold flex items-center gap-1.5"
                  >
                    <span className="text-emerald-600">✓</span> {h.slice(0, 60)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div id="sb-player-anchor">
        <AnimatePresence>
          {activePlayer && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="mb-2"
            >
              <VideoPlayer
                source={activePlayer.source}
                sources={activePlayer.sources}
                onSourceChange={(s) =>
                  setActivePlayer((prev) => (prev ? { ...prev, source: s } : prev))
                }
                title={activePlayer.cls.title}
                subtitle={activePlayer.cls.teacherName || course.title}
                isLive={activePlayer.cls.isLive}
                poster={
                  activePlayer.cls.image ? fileProxyUrl(activePlayer.cls.image) : undefined
                }
                onBack={() => setActivePlayer(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid lg:grid-cols-[330px_1fr] gap-6 items-start">
        <div className="lg:sticky lg:top-20">
          <button
            onClick={() => setMobileTopicsOpen((prev) => !prev)}
            className="lg:hidden w-full liquid-glass rounded-2xl px-5 py-4 flex items-center justify-between text-stone-900 font-bold text-sm mb-3"
          >
            <span className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-purple-600" />
              {topics[activeTopicIdx]?.topicName || 'Course Topics'}
            </span>
            <ChevronRight
              className={cn('w-4 h-4 transition-transform', mobileTopicsOpen && 'rotate-90')}
            />
          </button>

          <div
            className={cn(
              'liquid-glass-deep rounded-3xl p-4 space-y-1.5 max-h-[70vh] overflow-y-auto sb-scroll',
              mobileTopicsOpen ? 'block' : 'hidden lg:block'
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 px-2 pt-1 pb-2">
              Course Topics ({topics.length})
            </p>
            {topics.length === 0 && (
              <p className="text-xs text-stone-500 font-bold px-2 py-6 text-center">
                No topics found for this batch.
              </p>
            )}
            {topics.map((topic, idx) => {
              const active = idx === activeTopicIdx;
              return (
                <button
                  key={topic.topicId}
                  onClick={() => {
                    setActiveTopicIdx(idx);
                    setMobileTopicsOpen(false);
                  }}
                  aria-expanded={active}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-left transition-all group',
                    active
                      ? 'bg-purple-50 border-purple-300 shadow-sm'
                      : 'bg-stone-50/70 border-transparent hover:bg-purple-50/60 hover:border-purple-200'
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110',
                        active
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-white text-purple-600 border-stone-200'
                      )}
                    >
                      <Folder className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-stone-800 sb-clamp-1 group-hover:text-stone-900">
                        {topic.topicName}
                      </span>
                      <span className="block text-[9px] text-stone-500 font-black uppercase tracking-widest mt-0.5">
                        <Layers className="w-3 h-3 inline mr-1 -mt-0.5" />
                        {topic.classes.length} class{topic.classes.length === 1 ? '' : 'es'}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform',
                      active ? 'text-purple-600 rotate-90' : 'text-stone-400'
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2.5 min-w-0">
              <Folder className="w-5 h-5 text-purple-600 shrink-0" />
              <span className="sb-clamp-1">{topics[activeTopicIdx]?.topicName || 'Classes'}</span>
            </h2>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-stone-500">
              {filter === 'all'
                ? `${currentClasses.length} Classes`
                : `${filteredClasses.length}/${currentClasses.length} Matches`}
            </span>
          </div>

          <div
            className="flex gap-2 overflow-x-auto pb-1.5 sb-scroll"
            role="tablist"
            aria-label="Filter content by type"
          >
            {filterTabs.map(([key, label, Icon]) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                    active
                      ? 'bg-purple-600 text-white border-purple-500 glow-purple'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-purple-300 hover:text-stone-900'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-md text-[9px]',
                      active ? 'bg-white/20 text-white' : 'bg-stone-200/80 text-stone-700'
                    )}
                  >
                    {filterCounts[key]}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredClasses.length === 0 ? (
            <EmptyState
              icon={<Info className="w-10 h-10 text-stone-400" />}
              title={
                topics.length === 0
                  ? 'No classes uploaded yet'
                  : filter === 'all'
                  ? 'No content here yet'
                  : 'Nothing matches this filter'
              }
              msg={
                topics.length === 0
                  ? 'This batch currently has no lectures or PDFs on the server. Please go back and choose another batch.'
                  : filter === 'all'
                  ? 'This topic has no classes. Try another topic folder.'
                  : `No ${filter} in this topic. Switch tabs or pick another topic.`
              }
            />
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredClasses.map((cls, idx) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  index={idx}
                  onPlay={() => {
                    if (getPlaybackSources(cls).length > 0) setSettingsCls(cls);
                  }}
                  onOpenPdf={(pdf) =>
                    setActivePdf({
                      name: pdf.name,
                      url: fileProxyUrl(pdf.url),
                      directUrl: pdf.url,
                      kind: getPdfKind(pdf),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {settingsCls && (
          <PlaybackSettingsModal
            cls={settingsCls}
            onClose={() => setSettingsCls(null)}
            onStart={(source, sources) => {
              const target = settingsCls;
              setSettingsCls(null);
              setActivePlayer({ cls: target, source, sources });
              setTimeout(() => {
                document
                  .getElementById('sb-player-anchor')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 120);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePdf && <PdfViewerModal pdf={activePdf} onClose={() => setActivePdf(null)} />}
      </AnimatePresence>
    </div>
  );
}
