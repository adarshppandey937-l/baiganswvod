import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  LoaderCircle,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { motion } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

function detectMobilePdfUnsupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  scale,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [renderedKey, setRenderedKey] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1.414);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
        }
      },
      { rootMargin: '600px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    pdfDoc
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const baseVp = page.getViewport({ scale: 1 });
        if (baseVp.width > 0) {
          setAspectRatio(baseVp.height / baseVp.width);
        }
        const containerWidth = Math.max(280, (wrapRef.current?.clientWidth || 720) - 8);
        const fitScale = (containerWidth / baseVp.width) * scale;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale });
        const renderViewport = page.getViewport({ scale: fitScale * dpr });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: renderViewport,
          canvas,
        }) as unknown as { cancel: () => void; promise: Promise<void> };

        return renderTask.promise.then(() => {
          if (!cancelled) {
            setRenderedKey(`${pageNumber}-${scale}`);
          }
        });
      })
      .catch(() => {
        // ignore cancelled render tasks
      });

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, scale, visible]);

  return (
    <div
      ref={wrapRef}
      data-pdf-page={pageNumber}
      className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col items-center relative"
      style={{ minHeight: `${Math.round(320 * aspectRatio)}px` }}
    >
      <canvas ref={canvasRef} className="block max-w-full" />
      {renderedKey !== `${pageNumber}-${scale}` && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 pointer-events-none">
          <span className="text-[11px] font-bold text-stone-500">Loading page {pageNumber}…</span>
        </div>
      )}
      <div className="w-full px-3 py-1.5 bg-stone-50 border-t border-stone-200/70 text-[10px] font-bold text-stone-500 text-center">
        Page {pageNumber}
      </div>
    </div>
  );
}

export function SmartPdfModal({
  title,
  subtitle,
  url,
  directUrl,
  icon,
  iconBadgeClass,
  subtitleClass,
  onClose,
}: {
  title: string;
  subtitle: string;
  url: string;
  directUrl?: string;
  icon: React.ReactNode;
  iconBadgeClass: string;
  subtitleClass?: string;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<'reader' | 'browser'>(() =>
    detectMobilePdfUnsupported() ? 'reader' : 'browser'
  );
  const [checking, setChecking] = useState(true);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerProgress, setReaderProgress] = useState(0);
  const [readerError, setReaderError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setHttpError(null);

    fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok && res.status !== 405) {
          setHttpError(`This PDF returned HTTP ${res.status} from the source server.`);
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (checking || httpError || viewMode !== 'reader') return;

    let cancelled = false;
    let activeTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let loadedDoc: PDFDocumentProxy | null = null;

    setReaderLoading(true);
    setReaderError(null);
    setReaderProgress(0);
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);

    try {
      activeTask = pdfjsLib.getDocument({
        url,
        withCredentials: false,
      });

      activeTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (!cancelled && total > 0) {
          setReaderProgress(Math.min(99, Math.round((loaded / total) * 100)));
        }
      };

      activeTask.promise
        .then((doc) => {
          if (cancelled) {
            doc.cleanup().catch(() => {});
            return;
          }
          loadedDoc = doc;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setReaderLoading(false);
        })
        .catch((err) => {
          if (!cancelled) {
            setReaderError(
              err instanceof Error && err.message
                ? `Could not render preview (${err.message}).`
                : 'Could not render PDF preview in-app.'
            );
            setReaderLoading(false);
          }
        });
    } catch {
      setReaderError('In-app PDF reader could not initialize.');
      setReaderLoading(false);
    }

    return () => {
      cancelled = true;
      if (activeTask) {
        activeTask.destroy().catch(() => {});
      }
      if (loadedDoc) {
        loadedDoc.cleanup().catch(() => {});
      }
    };
  }, [url, viewMode, checking, httpError]);

  const jumpToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(numPages || 1, nextPage));
    setCurrentPage(clamped);
    const el = scrollRef.current?.querySelector(`[data-pdf-page="${clamped}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const downloadHref = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-6 bg-black/50 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${title}`}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-deep rounded-2xl sm:rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border',
                iconBadgeClass
              )}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[9px] font-black uppercase tracking-[0.2em]',
                  subtitleClass || 'text-pink-600'
                )}
              >
                {subtitle}
              </p>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 sb-clamp-1">{title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!httpError && (
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === 'reader' ? 'browser' : 'reader'))}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold text-purple-700 transition-colors"
                title={viewMode === 'reader' ? 'Switch to browser frame' : 'Switch to built-in reader'}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">
                  {viewMode === 'reader' ? 'Browser View' : 'PDF Reader'}
                </span>
              </button>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[11px] font-bold text-stone-700 hover:text-stone-900 transition-colors"
              title="Open PDF in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>
            <a
              href={downloadHref}
              download
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 border border-purple-500 text-[11px] font-bold text-white transition-colors"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 flex items-center justify-center transition-colors"
              aria-label="Close PDF"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {checking ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-stone-50 p-6">
            <LoaderCircle className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-xs font-bold text-stone-600">Opening PDF…</p>
          </div>
        ) : httpError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-stone-50 p-6 text-center">
            <AlertTriangle className="w-11 h-11 text-amber-500" />
            <div>
              <h4 className="text-base font-black text-stone-900">PDF Unavailable on Source</h4>
              <p className="text-xs sm:text-sm text-stone-600 font-medium mt-1 max-w-md">
                {httpError}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              <a
                href={directUrl || url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Source Link
              </a>
              <a
                href={downloadHref}
                download
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" /> Try Download
              </a>
            </div>
          </div>
        ) : viewMode === 'reader' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-stone-100">
            {readerLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                <LoaderCircle className="w-8 h-8 text-purple-600 animate-spin" />
                <p className="text-xs font-bold text-stone-600">
                  Loading PDF{readerProgress > 0 ? ` (${readerProgress}%)` : '…'}
                </p>
              </div>
            ) : readerError || !pdfDoc ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <p className="text-sm font-bold text-stone-700 max-w-md">
                  {readerError || 'Unable to display PDF preview here.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('browser')}
                    className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors"
                  >
                    Try Browser View
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in New Tab
                  </a>
                  <a
                    href={downloadHref}
                    download
                    className="px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto sb-scroll p-2.5 sm:p-4 space-y-3"
                >
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                    <PdfPageCanvas
                      key={`${pageNum}-${scale}`}
                      pdfDoc={pdfDoc}
                      pageNumber={pageNum}
                      scale={scale}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 bg-white border-t border-stone-200 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => jumpToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-stone-700 tabular-nums px-1">
                      Page {currentPage} / {numPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => jumpToPage(currentPage + 1)}
                      disabled={currentPage >= numPages}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.max(0.75, +(s - 0.25).toFixed(2)))}
                      disabled={scale <= 0.75}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700"
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-bold text-stone-700 tabular-nums w-11 text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.min(2.25, +(s + 0.25).toFixed(2)))}
                      disabled={scale >= 2.25}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700"
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <iframe src={url} title={title} className="flex-1 w-full border-0 sb-pdf-frame" />
        )}
      </motion.div>
    </motion.div>
  );
}
