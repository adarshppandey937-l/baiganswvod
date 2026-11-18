import { BookOpen, ExternalLink, FileText } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { fetchEBooks, fileProxyUrl } from '../lib/api';
import type { EBook } from '../types';
import { EmptyState } from './EmptyState';
import { SmartPdfModal } from './PdfViewer';

export function EBooksView() {
  const [books, setBooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<{ book: EBook; proxyUrl: string } | null>(null);

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
      book,
      proxyUrl: fileProxyUrl(book.pdf),
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
          <SmartPdfModal
            title={activeBook.book.title}
            subtitle="E-Book · PDF"
            url={activeBook.proxyUrl}
            directUrl={activeBook.book.pdf}
            icon={<BookOpen className="w-5 h-5" />}
            iconBadgeClass="bg-amber-50 text-amber-600 border-amber-200"
            subtitleClass="text-amber-700"
            onClose={() => setActiveBook(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
