'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown } from 'lucide-react';

import { apiClient } from '@/lib/api';
import type { FeaturedAudio } from '@/lib/types';
import type { HeaderDropdownCard } from '@/components/sidebar/desktop-top-nav-data';

function DesktopHeaderDropdown({
  label,
  title,
  description,
  href,
  cards,
  ctaLabel,
  onOpen,
}: {
  label: string;
  title: string;
  description: string;
  href: string;
  cards: HeaderDropdownCard[];
  ctaLabel: string;
  onOpen?: () => void;
}) {
  return (
    <div className="group relative" onMouseEnter={onOpen} onFocusCapture={onOpen}>
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:rotate-180" />
      </Link>
      <div className="pointer-events-none absolute left-1/2 top-full z-40 w-[52rem] -translate-x-1/2 px-3 pt-4 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="panel-surface-strong overflow-hidden rounded-[2rem]">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)]">
            <div>
              <div className="accent-pill inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/88">
                {label}
              </div>
              <div className="mt-4 text-2xl font-semibold text-white">{title}</div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
              <Link
                href={href}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="max-h-[24rem] overflow-y-auto scrollbar-hide">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                  <Link
                    key={card.id}
                    href={card.href}
                    className="overflow-hidden rounded-[1.35rem] bg-white/[0.03] transition-all hover:-translate-y-0.5 hover:bg-white/[0.05]"
                  >
                    <div
                      className="h-24 w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_45%),linear-gradient(135deg,rgba(255,107,74,0.24),rgba(34,199,184,0.16),rgba(9,12,18,0.55))] bg-cover bg-center"
                      style={card.image ? { backgroundImage: `linear-gradient(180deg, rgba(3,5,9,0.12), rgba(3,5,9,0.44)), url("${card.image}")` } : undefined}
                    />
                    <div className="p-4">
                      <div className="text-sm font-semibold text-white">{card.title}</div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{card.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesktopTopNav({
  pathname,
  locale,
  showUserLinks,
  imageDropdownCards,
  videoDropdownCards,
  audioDropdownCards,
}: {
  pathname: string;
  locale: string;
  showUserLinks: boolean;
  imageDropdownCards: HeaderDropdownCard[];
  videoDropdownCards: HeaderDropdownCard[];
  audioDropdownCards: HeaderDropdownCard[];
}) {
  const t = useTranslations('Navigation');
  const [featuredAudio, setFeaturedAudio] = useState<FeaturedAudio[]>([]);
  const [shouldLoadAudioCards, setShouldLoadAudioCards] = useState(false);
  const supportedLocale = locale === 'ru' ? 'ru' : 'en';

  useEffect(() => {
    if (!shouldLoadAudioCards || featuredAudio.length > 0) return;
    apiClient.get<FeaturedAudio[]>('/public/featured-audio').then((response) => setFeaturedAudio(response.data)).catch(() => {});
  }, [featuredAudio.length, shouldLoadAudioCards]);

  const isActive = (href: string) => {
    const cleanHref = href.split('?')[0];
    if (cleanHref === '/') return pathname.endsWith('/') || pathname.match(/^\/[a-z]{2}$/);
    return pathname.includes(cleanHref);
  };

  const hydratedAudioDropdownCards = useMemo(
    () =>
      supportedLocale === 'ru'
        ? [
            { ...audioDropdownCards[0], image: featuredAudio[0]?.cover_image_url || audioDropdownCards[0]?.image || null },
            { ...audioDropdownCards[1], image: featuredAudio[1]?.cover_image_url || featuredAudio[0]?.cover_image_url || audioDropdownCards[1]?.image || null },
            { ...audioDropdownCards[2], image: featuredAudio[2]?.cover_image_url || featuredAudio[0]?.cover_image_url || audioDropdownCards[2]?.image || null },
            { ...audioDropdownCards[3], image: featuredAudio[3]?.cover_image_url || featuredAudio[1]?.cover_image_url || audioDropdownCards[3]?.image || null },
          ]
        : [
            { ...audioDropdownCards[0], image: featuredAudio[0]?.cover_image_url || audioDropdownCards[0]?.image || null },
            { ...audioDropdownCards[1], image: featuredAudio[1]?.cover_image_url || featuredAudio[0]?.cover_image_url || audioDropdownCards[1]?.image || null },
            { ...audioDropdownCards[2], image: featuredAudio[2]?.cover_image_url || featuredAudio[0]?.cover_image_url || audioDropdownCards[2]?.image || null },
            { ...audioDropdownCards[3], image: featuredAudio[3]?.cover_image_url || featuredAudio[1]?.cover_image_url || audioDropdownCards[3]?.image || null },
          ],
    [audioDropdownCards, featuredAudio, supportedLocale],
  );

  return (
    <nav className="flex items-center gap-0.5">
      <Link
        href="/"
        className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive('/') ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}
      >
        {t('home')}
      </Link>
      <Link
        href="/explore"
        className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive('/explore') ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}
      >
        {t('explore')}
      </Link>
      <DesktopHeaderDropdown
        label={t('images')}
        title={supportedLocale === 'ru' ? 'Картинки и дизайн' : 'Images & Design'}
        description={supportedLocale === 'ru' ? 'Популярные модели для генерации, редактирования и визуального продакшна.' : 'Popular models for generation, editing and polished visual work.'}
        href="/images"
        cards={imageDropdownCards}
        ctaLabel={supportedLocale === 'ru' ? 'Открыть раздел' : 'Open section'}
      />
      <DesktopHeaderDropdown
        label={t('video')}
        title={supportedLocale === 'ru' ? 'Видео и анимация' : 'Video & Animation'}
        description={supportedLocale === 'ru' ? 'Подборка моделей для роликов, оживления кадров и рекламных сцен.' : 'A selection of models for clips, image animation and ad-style scenes.'}
        href="/video"
        cards={videoDropdownCards}
        ctaLabel={supportedLocale === 'ru' ? 'Открыть раздел' : 'Open section'}
      />
      <DesktopHeaderDropdown
        label={t('audio')}
        title={supportedLocale === 'ru' ? 'Музыка и голос' : 'Music & Voice'}
        description={supportedLocale === 'ru' ? 'Треки, озвучка и диалоги в одном разделе.' : 'Tracks, voice-over and dialogues in one section.'}
        href="/audio?model=suno%2FV6"
        cards={hydratedAudioDropdownCards}
        ctaLabel={supportedLocale === 'ru' ? 'Открыть раздел' : 'Open section'}
        onOpen={() => setShouldLoadAudioCards(true)}
      />
      <Link
        href="/catalog"
        className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive('/catalog') ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}
      >
        {t('ai_effects')}
      </Link>
      <Link
        href="/pricing"
        className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive('/pricing') ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}
      >
        {t('pricing')}
      </Link>
      {showUserLinks && (
        <>
          <Link
            href="/my-creations"
            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive('/my-creations') ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}
          >
            {t('my_creations')}
          </Link>
          <Link
            href="/my-likes"
            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive('/my-likes') ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}
          >
            {t('my_likes')}
          </Link>
        </>
      )}
    </nav>
  );
}
