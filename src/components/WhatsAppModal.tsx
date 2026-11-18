import { ExternalLink, MessageCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { HEADER_PHOTO_FALLBACK, HEADER_PHOTO_SRC } from '../lib/api';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDcWLp8PgsHZKtwRd0z';

export function WhatsAppModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/45 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Join PANDEY JI WhatsApp Channel"
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-deep rounded-3xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-900">
              Official WhatsApp Channel
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-600 border border-stone-200 hover:border-red-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden liquid-glass border border-stone-200 shadow-sm">
            <img
              src={HEADER_PHOTO_SRC}
              alt="PANDEY JI"
              onError={(e) => {
                e.currentTarget.src = HEADER_PHOTO_FALLBACK;
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h4 className="text-xl font-black text-stone-900 tracking-tight">
              PANDEY <span className="gold-text">JI</span>
            </h4>
            <p className="text-sm text-stone-600 font-medium mt-1.5 leading-relaxed">
              Join our official WhatsApp channel for latest batch updates, free classes, daily notes
              and PDFs.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(16,185,129,0.28)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              Join WhatsApp Channel
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Continue to Website
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
