'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Heart, Music, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import type { GenerationTask } from '@/lib/types';
import {
  getCategoryTitle,
  getModelDisplayName,
  getModelFamilyLabel,
  getModelWorkflowLabel,
  getTaskPrompt,
  type SupportedLocale,
} from '@/lib/model-presenter';
import { getUserAvatarUrl, getUserDisplayName, getUserInitials } from '@/lib/user-presenter';
import AudioShowcaseCard from '@/components/ui/audio-showcase-card';

type ExploreTask = GenerationTask & {
  is_hot?: boolean;
  like_count?: number;
};

export function normalizePublicMediaSrc(src: string) {
  return src.replace(/^https?:\/\/127\.0\.0\.1:8000/, '');
}

export function shouldBypassImageOptimization(src: string) {
  return src.startsWith('/uploads/')
    || /^https?:\/\/127\.0\.0\.1:8000/.test(src)
    || (/^https?:\/\//.test(src) && !src.includes('images.unsplash.com'));
}

function getReadableModelName(model: string | null | undefined, category: string | null | undefined, locale: SupportedLocale) {
  if (!model || model.startsWith('/uploads/') || model.startsWith('http') || model.startsWith('data:')) {
    return getCategoryTitle(category, locale);
  }

  const label = getModelDisplayName(model);
  if (!label || label.startsWith('/uploads/') || label.startsWith('http')) {
    return getCategoryTitle(category, locale);
  }

  return label;
}

export function getTaskLikesCount(task: ExploreTask) {
  return task.likes_count ?? task.like_count ?? 0;
}

export function getPublicTaskMediaType(task: ExploreTask) {
  if (task.category === 'video' || task.category === 'audio' || task.category === 'image' || task.category === 'images') {
    return task.category === 'images' ? 'image' : task.category;
  }

  const url = (task.output_url || '').toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(url)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/.test(url)) return 'audio';
  return 'image';
}

export function getPublicTaskHeadline(task: ExploreTask, locale: SupportedLocale) {
  const readable = getReadableModelName(task.model, task.category, locale);
  const family = getModelFamilyLabel(task.model, task.category, locale);
  const workflow = getModelWorkflowLabel(task.model, task.category, locale);
  const lowerReadable = readable.trim().toLowerCase();
  const lowerWorkflow = workflow.trim().toLowerCase();

  if (
    lowerReadable === lowerWorkflow
    || lowerReadable === 'video'
    || lowerReadable === 'image'
    || lowerReadable === 'audio'
    || lowerReadable === 'text to video'
    || lowerReadable === 'image to video'
    || lowerReadable === 'text to image'
    || lowerReadable === 'image to image'
  ) {
    return family && family !== getCategoryTitle(task.category, locale) ? `${family} ${workflow}` : workflow;
  }

  return readable;
}

export function getPublicTaskPromptExcerpt(task: ExploreTask) {
  const prompt = getTaskPrompt(task);
  if (!prompt) return null;
  return prompt.length > 140 ? `${prompt.slice(0, 140).trim()}...` : prompt;
}

function getTaskAuthor(task: ExploreTask) {
  return {
    name: getUserDisplayName(task),
    avatarUrl: getUserAvatarUrl(task),
    initials: getUserInitials(task),
  };
}

function AuthorChip({
  task,
  compact = false,
}: {
  task: ExploreTask;
  compact?: boolean;
}) {
  const t = useTranslations('Explore');
  const author = getTaskAuthor(task);

  if (!task.author_id) return null;

  return (
    <Link
      href={`/profile/${task.author_id}`}
      onClick={(event) => event.stopPropagation()}
      className="group/author pointer-events-auto relative inline-flex items-center gap-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
    >
      <div className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-md ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
        <div className={`flex items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] font-semibold text-white ${compact ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'}`}>
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatarUrl} alt={author.name} className="h-full w-full object-cover" />
          ) : (
            author.initials
          )}
        </div>
        <span className={`max-w-[130px] truncate font-medium text-white ${compact ? 'text-xs' : 'text-sm'}`}>{author.name}</span>
      </div>

      <div className="pointer-events-none absolute left-0 top-[calc(100%+0.7rem)] z-20 w-[220px] translate-y-2 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,24,0.97),rgba(8,10,14,0.95))] p-4 opacity-0 shadow-[0_20px_48px_rgba(0,0,0,0.32)] transition-all duration-200 group-hover/author:translate-y-0 group-hover/author:opacity-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] text-sm font-bold text-white">
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatarUrl} alt={author.name} className="h-full w-full object-cover" />
            ) : (
              author.initials
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{author.name}</div>
            <div className="truncate text-xs text-zinc-500">{t('creator_label')}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ExploreAudioPreview({
  compact = false,
}: {
  compact?: boolean;
}) {
  const bars = compact ? [14, 26, 18, 30, 22, 16, 28, 20, 24] : [18, 36, 24, 44, 30, 20, 40, 26, 34];

  return (
    <div className={`relative flex h-full w-full overflow-hidden ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.08),transparent_16%),radial-gradient(circle_at_78%_22%,rgba(34,199,184,0.16),transparent_24%),radial-gradient(circle_at_32%_82%,rgba(255,107,74,0.16),transparent_22%),linear-gradient(145deg,rgba(11,14,20,0.99),rgba(5,7,10,0.98))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%,rgba(0,0,0,0.34))]" />
      <div className="absolute left-[-10%] top-[-22%] h-44 w-44 rounded-full bg-[#ff6b4a]/10 blur-3xl" />
      <div className="absolute right-[-10%] top-[2%] h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex h-full w-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-200 backdrop-blur-md">
            <Music className="h-3.5 w-3.5 text-cyan-200" />
            Audio
          </div>
          <div className={`relative shrink-0 ${compact ? 'h-24 w-24' : 'h-28 w-28'}`}>
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.1),rgba(255,255,255,0.02)_34%,rgba(0,0,0,0.24)_70%,rgba(0,0,0,0.82)_100%)] shadow-[0_24px_48px_rgba(0,0,0,0.34)]" />
            <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle_at_30%_28%,rgba(34,199,184,0.12),rgba(255,255,255,0.02)_42%,rgba(0,0,0,0.52)_100%)]" />
            <div className="absolute inset-[45%] rounded-full bg-white/80" />
          </div>
        </div>

        <div className={`rounded-[1.25rem] border border-white/8 bg-black/25 backdrop-blur-md ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}>
          <div className="flex h-[72px] items-end gap-1.5">
            {bars.map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="flex-1 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(34,199,184,0.55))]"
                style={{ height }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicTaskMedia({
  task,
  locale,
  fill,
  prioritizeAudioControls = false,
  autoPlayVideo = false,
}: {
  task: ExploreTask;
  locale: SupportedLocale;
  fill?: boolean;
  prioritizeAudioControls?: boolean;
  autoPlayVideo?: boolean;
}) {
  const mediaType = getPublicTaskMediaType(task);
  const modelName = getReadableModelName(task.model, task.category, locale);
  const categoryTitle = getCategoryTitle(task.category, locale);

  if (!task.output_url) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-700">No media</div>;
  }

  if (mediaType === 'video') {
    return <PublicTaskVideoPreview src={task.output_url} fill={fill} autoPlay={autoPlayVideo} />;
  }

  if (mediaType === 'audio') {
    if (prioritizeAudioControls) {
      return (
        <div className="h-full w-full p-5">
          <AudioShowcaseCard
            title={modelName}
            subtitle={categoryTitle}
            prompt={getTaskPrompt(task)}
            audioUrl={normalizePublicMediaSrc(task.output_url)}
            autoPlay
            className="h-full min-h-0"
          />
        </div>
      );
    }

    return (
      <ExploreAudioPreview
        compact={!fill}
      />
    );
  }

  return (
    <Image
      src={normalizePublicMediaSrc(task.output_url)}
      alt={getPublicTaskHeadline(task, locale)}
      fill
      unoptimized={shouldBypassImageOptimization(task.output_url)}
      sizes={fill ? '100vw' : '(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw'}
      className={fill ? 'object-contain bg-black' : 'object-cover'}
    />
  );
}

function PublicTaskVideoPreview({
  src,
  fill = false,
  autoPlay = false,
}: {
  src: string;
  fill?: boolean;
  autoPlay?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return undefined;
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { rootMargin: '0px 0px 0px 0px', threshold: [0.15, 0.35, 0.6] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [autoPlay]);

  useEffect(() => {
    if (typeof window === 'undefined' || !autoPlay) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateFlags = () => {
      const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
      setCanAutoplay(!reducedMotionQuery.matches && !saveData);
    };

    updateFlags();
    reducedMotionQuery.addEventListener('change', updateFlags);
    return () => reducedMotionQuery.removeEventListener('change', updateFlags);
  }, [autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;

    if (isVisible && canAutoplay) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
      return;
    }

    video.pause();
  }, [autoPlay, canAutoplay, isVisible]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,107,74,0.2),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(34,199,184,0.22),transparent_26%),linear-gradient(180deg,rgba(18,22,30,0.95),rgba(7,9,13,0.98))]" />
      <video
        ref={videoRef}
        src={normalizePublicMediaSrc(src)}
        className={`relative h-full w-full ${fill ? 'object-contain bg-black' : 'object-cover'}`}
        muted
        loop
        playsInline
        preload="metadata"
        autoPlay={false}
      />
    </div>
  );
}

export default function PublicTaskCard({
  task,
  locale,
  featured = false,
  showAuthor = true,
  onClick,
}: {
  task: ExploreTask;
  locale: SupportedLocale;
  featured?: boolean;
  showAuthor?: boolean;
  onClick: () => void;
}) {
  const t = useTranslations('Explore');
  const mediaType = getPublicTaskMediaType(task);
  const family = getModelFamilyLabel(task.model, task.category, locale);
  const workflow = getModelWorkflowLabel(task.model, task.category, locale);
  const categoryTitle = getCategoryTitle(task.category, locale);
  const likes = getTaskLikesCount(task);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`group relative cursor-pointer overflow-hidden border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,24,0.96),rgba(7,9,13,0.92))] text-left shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition-all duration-300 hover:border-white/16 hover:shadow-[0_28px_64px_rgba(0,0,0,0.32)] ${featured ? 'rounded-[2rem]' : 'rounded-[1.7rem]'}`}
    >
      <div className={`relative overflow-hidden bg-zinc-950 ${featured ? 'aspect-[16/9] min-h-[340px]' : 'aspect-[4/5] min-h-[300px]'}`}>
        <PublicTaskMedia task={task} locale={locale} autoPlayVideo />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.14)_45%,rgba(0,0,0,0.74)_100%)]" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          {task.is_hot ? (
            <div className="rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ffd166)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#06070a] shadow-lg shadow-orange-500/30">
              {t('hot_badge')}
            </div>
          ) : null}
          {featured ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Play className="h-3 w-3 text-[#ffd166]" />
              {t('featured_case')}
            </div>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            <Heart className="h-3.5 w-3.5 fill-current text-pink-300" />
            {likes}
          </div>
        </div>

        {showAuthor ? (
          <div className="absolute bottom-3 left-3 z-20">
            <AuthorChip task={task} compact={!featured} />
          </div>
        ) : null}

        {mediaType === 'audio' ? (
          <div className="absolute bottom-3 right-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <Play className="h-3.5 w-3.5 fill-current" />
              {t('listen')}
            </div>
          </div>
        ) : null}

        <div className={`absolute inset-x-0 bottom-0 ${showAuthor ? 'pb-14 sm:pb-16' : ''} p-4 sm:p-5`}>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200 backdrop-blur-md">
              {family}
            </span>
            <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-md">
              {mediaType === 'audio' ? categoryTitle : workflow}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
