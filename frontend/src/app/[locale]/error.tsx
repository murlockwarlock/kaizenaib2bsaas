'use client';

import { RefreshCcw, ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useLocale } from 'next-intl';

import { Link } from '@/i18n/routing';

const COPY = {
  ru: {
    code: 'Ошибка сервиса',
    title: 'Что-то пошло не так',
    description: 'Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться позже.',
    retry: 'Попробовать снова',
    home: 'На главную',
  },
  en: {
    code: 'Service error',
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Try refreshing the page or come back a bit later.',
    retry: 'Try again',
    home: 'Go home',
  },
} as const;

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = (useLocale() as 'ru' | 'en') || 'en';
  const copy = COPY[locale] ?? COPY.en;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.12),transparent_32%),linear-gradient(180deg,#06070a_0%,#090d13_52%,#050608_100%)]" />
      <section className="glass-strong relative z-10 w-full max-w-2xl rounded-[2rem] px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] shadow-[0_20px_48px_rgba(255,107,74,0.22)]">
          <ShieldAlert className="h-7 w-7 text-white" />
        </div>
        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{copy.code}</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">{copy.description}</p>

        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.22)] transition-all duration-200 hover:translate-y-[-1px]"
          >
            <RefreshCcw className="h-4 w-4" />
            {copy.retry}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
          >
            {copy.home}
          </Link>
        </div>
      </section>
    </main>
  );
}
