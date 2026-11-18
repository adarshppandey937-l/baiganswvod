import { BookOpen, Download, ExternalLink, FileText, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { fetchEBooks, fileProxyUrl } from '../lib/api';
import type { EBook } from '../types';
import { EmptyState } from './EmptyState';

export function EBooksView() {
  const [books, setBooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<EBook | null>(null);

  useEffect(() => {
    fetchEBooks()
      .then((data) => {
        setBooks(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't load e-books");
        setLoading(false);
      });
  }, []);

  const openBook = (book: EBook) => {
    setActiveBook({
      ...book,
      pdf: fileProxyUrl(book.pdf),
    });
  };

  return (
    <div className="space-y-8">
      <section className="liquid-glass rounded-[2rem] p-6 sm:p-10 relative overflow-hidden sb-fade-up">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-amber-100/70 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-full mb-5">
            <BookOpen className="w-3.5 h-3.5" /> Free PDF Library
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-[1.08] mb-4">
            Explore <span className="gold-text">E-Books</span>
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-medium leading-relaxed max-w-2xl">
            Selection books, subject boosters and computer guides — read online or download the full
            PDF, completely free.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="sb-skeleton rounded-2xl aspect-[3/4]" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-red-500" />}
          title="Couldn't load e-books"
          msg={error}
        />
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-stone-400" />}
          title="No e-books yet"
          msg="The library is being stocked. Check back soon."
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
          {books.map((book, idx) => (
            <article
              key={book.id}
              onClick={() => openBook(book)}
              className="liquid-glass liquid-glass-hover rounded-2xl overflow-hidden cursor-pointer group sb-fade-up flex flex-col"
              style={{ animationDelay: `${45 * Math.min(idx, 12)}ms` }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openBook(book);
              }}
              aria-label={`Open e-book ${book.title}`}
            >
              <div className="relative w-full aspect-[3/4] bg-stone-100 border-b border-stone-200/80">
                {book.image ? (
                  <img
                    src={fileProxyUrl(book.image)}
                    alt={`${book.title} cover`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:scale-[1.05] group-hover:opacity-100 transition-all duration-500"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                <span className="absolute top-3 left-3 z-20 bg-purple-600/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-purple-300/60">
                  {book.tag || 'Book'}
                </span>
                <span className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-purple-600/90 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </span>
              </div>
              <div className="p-3.5 flex-1">
                <h3 className="text-xs font-bold text-stone-900 sb-clamp-2 leading-snug group-hover:text-purple-700 transition-colors">
                  {book.title}
                </h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mt-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> PDF · Free
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-md"
            onClick={() => setActiveBook(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Viewing ${activeBook.title}`}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="liquid-glass-deep rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-stone-200 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">
                      E-Book · PDF
                    </p>
                    <h3 className="text-sm font-bold text-stone-900 sb-clamp-1">
                      {activeBook.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`${activeBook.pdf}&download=1`}
                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-bold text-stone-700 hover:text-stone-900 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button
                    onClick={() => setActiveBook(null)}
                    className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 flex items-center justify-center transition-colors"
                    aria-label="Close e-book"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <iframe
                src={activeBook.pdf}
                title={activeBook.title}
                className="flex-1 w-full border-0 sb-pdf-frame"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
