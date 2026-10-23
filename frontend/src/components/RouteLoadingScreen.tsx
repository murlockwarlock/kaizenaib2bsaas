'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RouteLoadingScreen() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,199,184,0.12),transparent_30%),linear-gradient(180deg,#06070a_0%,#090d13_52%,#050608_100%)]" />
      <div className="pointer-events-none absolute left-[-10%] top-[18%] h-64 w-64 rounded-full bg-[#ff6b4a]/12 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-[12%] right-[-8%] h-72 w-72 rounded-full bg-[#22c7b8]/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,14,20,0.94),rgba(7,10,16,0.88))] px-6 py-7 text-center shadow-[0_28px_80px_rgba(3,5,9,0.5)] backdrop-blur-2xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] shadow-[0_16px_40px_rgba(255,107,74,0.22)]">
          <Sparkles className="h-6 w-6 text-white" />
        </div>

        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
          KaizenAI
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Loading</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Preparing the next section...
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin text-[#ffd166]" />
          <span className="text-sm font-medium">Please wait</span>
        </div>
      </motion.div>
    </div>
  );
}
