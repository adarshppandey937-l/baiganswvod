import { BookOpen, Gift, LayoutGrid, Menu, X } from 'lucide-react';
import { cn, HEADER_PHOTO_FALLBACK, HEADER_PHOTO_SRC } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { ViewMode } from '../types';

const NAV_ITEMS: Array<{
  id: ViewMode;
  label: string;
  icon: typeof LayoutGrid;
  hint: string;
}> = [
  { id: 'batches', label: 'Explore All Batches', icon: LayoutGrid, hint: 'Premium batches' },
  { id: 'free', label: 'Free Batches', icon: Gift, hint: 'Free classes & shorts' },
  { id: 'ebooks', label: 'E-Books', icon: BookOpen, hint: 'PDF library' },
];

export function Sidebar() {
  const { view, setView, sidebarOpen, toggleSidebar } = useAppStore();

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-stone-200/80">
        <div className="w-12 h-12 rounded-2xl overflow-hidden liquid-glass flex items-center justify-center shrink-0 glow-purple">
          <img
            src={HEADER_PHOTO_SRC}
            alt="PANDEY JI logo"
            onError={(e) => {
              e.currentTarget.src = HEADER_PHOTO_FALLBACK;
            }}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-lg font-black tracking-tight text-stone-900 leading-none">
            PANDEY <span className="gold-text">JI</span>
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-500 mt-1">
            Charge Ahead
          </p>
        </div>
        <button
          className="ml-auto w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors"
          onClick={() => toggleSidebar(false)}
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto sb-scroll px-3 py-4 space-y-1.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id || (view === 'batch' && item.id === 'batches');
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-2xl transition-all text-left group relative overflow-hidden',
                active
                  ? 'bg-purple-50 text-stone-900 border border-purple-200 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-transparent'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-gradient-to-b from-purple-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.45)]" />
              )}
              <span
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
                  active
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-stone-100 text-stone-500 border border-stone-200/80'
                )}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{item.label}</span>
                <span className="block text-[9px] font-bold uppercase tracking-widest text-stone-500 mt-0.5">
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] transition-opacity duration-300',
        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={() => toggleSidebar(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] liquid-glass-deep border-r border-stone-200 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navigation"
      >
        {content}
      </aside>
    </div>
  );
}

export function SidebarToggle() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  return (
    <button
      onClick={() => toggleSidebar()}
      className="w-10 h-10 rounded-xl liquid-glass flex items-center justify-center text-stone-800 shrink-0 hover:bg-stone-100 transition-colors"
      aria-label="Open menu"
      aria-expanded={sidebarOpen}
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
