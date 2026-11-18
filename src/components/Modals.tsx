import {
  ClipboardList,
  FileText,
  NotebookPen,
  Play,
  X,
  Youtube,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useMemo, useState } from 'react';
import { cn, getPlaybackSources } from '../lib/api';
import type { BatchClass, PdfKind, PlaybackSource } from '../types';
import { SmartPdfModal } from './PdfViewer';

export const PDF_STYLES: Record<
  PdfKind,
  {
    icon: typeof FileText;
    box: string;
    badgeWrap: string;
    badge: string;
  }
> = {
  notes: {
    icon: FileText,
    box: 'bg-pink-50 text-pink-600 group-hover/pdf:bg-pink-600 group-hover/pdf:text-white',
    badgeWrap: 'bg-pink-50 text-pink-700 border-pink-200',
    badge: 'Notes',
  },
  dpp: {
    icon: NotebookPen,
    box: 'bg-amber-50 text-amber-600 group-hover/pdf:bg-amber-600 group-hover/pdf:text-white',
    badgeWrap: 'bg-amber-50 text-amber-700 border-amber-200',
    badge: 'DPP',
  },
  test: {
    icon: ClipboardList,
    box: 'bg-emerald-50 text-emerald-600 group-hover/pdf:bg-emerald-600 group-hover/pdf:text-white',
    badgeWrap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badge: 'Test',
  },
};

export function ModalFrame({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/45 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-deep rounded-3xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h3 className="text-sm font-black uppercase tracking-widest text-stone-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function PlaybackSettingsModal({
  cls,
  onClose,
  onStart,
}: {
  cls: BatchClass;
  onClose: () => void;
  onStart: (source: PlaybackSource, sources: PlaybackSource[]) => void;
}) {
  const sources = useMemo(() => getPlaybackSources(cls), [cls]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (sources.length === 0) {
    return (
      <ModalFrame onClose={onClose} title="Playback Settings">
        <p className="text-sm text-stone-600 font-medium py-8 text-center">
          No playable source found for this class.
        </p>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame onClose={onClose} title="Playback Settings">
      <div className="p-5 sm:p-6 space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-1">
            Selected Class
          </p>
          <h4 className="text-base font-bold text-stone-900 sb-clamp-2 leading-snug">{cls.title}</h4>
          {cls.teacherName && (
            <p className="text-xs text-stone-500 font-semibold mt-1">{cls.teacherName}</p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2.5">
            Choose Quality
          </p>
          <div className="flex flex-wrap gap-2">
            {sources.map((src, idx) => (
              <button
                key={`${src.url}-${idx}`}
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2',
                  selectedIndex === idx
                    ? 'bg-purple-600 text-white border-purple-500 glow-purple'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-purple-400 hover:text-stone-900'
                )}
              >
                {src.kind === 'youtube' && <Youtube className="w-3.5 h-3.5 text-red-500" />}
                {src.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-black uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart(sources[selectedIndex], sources)}
            className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white text-xs font-black uppercase tracking-widest glow-purple transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" /> Play Now
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

export function PdfViewerModal({
  pdf,
  onClose,
}: {
  pdf: { name: string; url: string; directUrl?: string; kind: PdfKind };
  onClose: () => void;
}) {
  const style = PDF_STYLES[pdf.kind] || PDF_STYLES.notes;
  const Icon = style.icon;
  const subtitle =
    pdf.kind === 'dpp'
      ? 'DPP · Practice Sheet · PDF'
      : pdf.kind === 'test'
      ? 'Test Paper · PDF'
      : 'Class Notes · PDF';

  return (
    <SmartPdfModal
      title={pdf.name}
      subtitle={subtitle}
      url={pdf.url}
      directUrl={pdf.directUrl}
      icon={<Icon className="w-5 h-5" />}
      iconBadgeClass={style.badgeWrap}
      subtitleClass={
        pdf.kind === 'dpp'
          ? 'text-amber-700'
          : pdf.kind === 'test'
          ? 'text-emerald-700'
          : 'text-pink-600'
      }
      onClose={onClose}
    />
  );
}
