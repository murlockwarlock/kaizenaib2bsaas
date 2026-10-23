'use client';

import { AlertTriangle, ArrowLeft, Compass } from 'lucide-react';
import { useLocale } from 'next-intl';

import { Link } from '@/i18n/routing';

const COPY = {
  ru: {
    code: 'Ошибка 404',
    title: 'Страница не найдена',
    description: 'Возможно, ссылка устарела, страница была удалена или адрес введён с ошибкой.',
    primary: 'На главную',
    secondary: 'Открыть каталог',
  },
  en: {
    code: 'Error 404',
    title: 'Page not found',
    description: 'The link may be outdated, the page may have been removed, or the address was entered incorrectly.',
    primary: 'Go home',
    secondary: 'Open catalog',
  },
} as const;

export default function LocaleNotFound() {
  const locale = (useLocale() as 'ru' | 'en') || 'en';
  const copy = COPY[locale] ?? COPY.en;

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_32%),linear-gradient(180deg,#06070a_0%,#090d13_52%,#050608_100%)]" />
      <div className="pointer-events-none absolute left-[-8%] top-[14%] h-72 w-72 rounded-full bg-[#ff6b4a]/10 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-[-8%] h-80 w-80 rounded-full bg-[#22c7b8]/10 blur-[120px]" />

      <section className="glass-strong relative z-10 w-full max-w-2xl rounded-[2rem] px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(145deg,#ff6b4a,#ffd166)] shadow-[0_20px_48px_rgba(255,107,74,0.22)]">
          <AlertTriangle className="h-7 w-7 text-white" />
        </div>
        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{copy.code}</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">{copy.description}</p>

        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.22)] transition-all duration-200 hover:translate-y-[-1px]"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.primary}
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
          >
            <Compass className="h-4 w-4" />
            {copy.secondary}
          </Link>
        </div>
      </section>
    </main>
  );
}
