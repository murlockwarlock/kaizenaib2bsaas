'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

type LegalDocumentModalProps = {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
  acceptLabel?: string;
  onAccept?: () => void;
};

export default function LegalDocumentModal({
  open,
  title,
  content,
  onClose,
  acceptLabel,
  onAccept,
}: LegalDocumentModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="flex max-h-[88vh] w-full flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:max-w-lg sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-5">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{content}</p>
            </div>

            {onAccept && acceptLabel ? (
              <div className="shrink-0 border-t border-zinc-800 px-6 py-4">
                <button
                  type="button"
                  onClick={onAccept}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-blue-500"
                >
                  <Check className="h-4 w-4" />
                  {acceptLabel}
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
