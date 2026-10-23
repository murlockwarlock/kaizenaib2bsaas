'use client';

import { RefreshCcw, ShieldAlert } from 'lucide-react';

const COPY = {
  ru: {
    code: 'Критическая ошибка',
    title: 'Приложение временно недоступно',
    description: 'Произошёл серьёзный сбой интерфейса. Попробуйте перезагрузить страницу.',
    retry: 'Перезагрузить',
  },
  en: {
    code: 'Critical error',
    title: 'The application is temporarily unavailable',
    description: 'A critical UI failure occurred. Try reloading the page.',
    retry: 'Reload',
  },
} as const;

function detectLocale() {
  if (typeof window === 'undefined') return 'en';
  return window.location.pathname.startsWith('/ru') ? 'ru' : 'en';
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);
  const locale = detectLocale() as 'ru' | 'en';
  const copy = COPY[locale] ?? COPY.en;

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-[#06070a] text-zinc-100">
        <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.12),transparent_32%),linear-gradient(180deg,#06070a_0%,#090d13_52%,#050608_100%)]" />
          <section className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,14,20,0.96),rgba(7,10,16,0.88))] px-6 py-8 text-center shadow-[0_28px_80px_rgba(3,5,9,0.55)] sm:px-8 sm:py-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] shadow-[0_20px_48px_rgba(255,107,74,0.22)]">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{copy.code}</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">{copy.description}</p>

            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.22)] transition-all duration-200 hover:translate-y-[-1px]"
              >
                <RefreshCcw className="h-4 w-4" />
                {copy.retry}
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
