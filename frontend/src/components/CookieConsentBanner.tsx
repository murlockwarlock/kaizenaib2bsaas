'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

const STORAGE_KEY = 'globus-cookie-consent';
const STORAGE_VALUE = 'accepted-v1';

export default function CookieConsentBanner() {
  const locale = useLocale();
  const t = useTranslations('CookieConsent');
  const [mounted, setMounted] = useState(false);
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    setMounted(true);
    const savedValue = window.localStorage.getItem(STORAGE_KEY);
    setAccepted(savedValue === STORAGE_VALUE);
  }, []);

  const handleAccept = () => {
    window.localStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
    setAccepted(true);
  };

  if (!mounted || accepted) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,24,0.96),rgba(9,12,18,0.96))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('badge')}
          </div>
          <div className="mt-3 text-base font-semibold text-white sm:text-lg">{t('title')}</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{t('description')}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[230px]">
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.22)] transition-all hover:translate-y-[-1px] hover:shadow-[0_24px_50px_rgba(255,107,74,0.28)]"
          >
            {t('accept')}
          </button>
          <Link
            href="/legal/cookies"
            locale={locale}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/16 hover:bg-white/[0.07] hover:text-white"
          >
            {t('learn_more')}
          </Link>
        </div>
      </div>
    </div>
  );
}
