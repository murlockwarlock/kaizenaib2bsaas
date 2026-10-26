'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Compass, Layers3, Music2, Video } from 'lucide-react';

import { Link } from '@/i18n/routing';
import type { Banner, FAQ, SiteSettings } from '@/lib/types';
import { getVideoPoster } from '@/lib/video-posters';

const GooeyFooter = dynamic(() => import('@/components/GooeyFooter'));

const FEATURED_VISIBLE_COUNT = 3;
const NEW_MODELS = new Set([
  'imagen/4-ultra', 'veo/3-fast', 'hailuo/02', 'qwen/2.5-max',
  'seedance/1.5-pro', 'kling/v3.0-video', 'kling-3/motion-control',
]);
const HOT_MODELS = new Set([
  'flux/1.1-ultra', 'kling/v2.6-image-to-video', 'suno/V6',
  'flux/1.1-pro', 'hailuo/02-image-to-video', 'imagen/4-ultra',
]);

type SectionCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image?: string | null;
  imageBefore?: string | null;
  chips: string[];
};

type FeedCardItem = {
  id: string | number;
  title: string;
  description: string;
  href: string;
  preview: string;
  mediaKind: string;
};

type HomeCopy = {
  latest: {
    title: string;
    description: string;
    empty: string;
  };
  trending: {
    title: string;
    description: string;
  };
  sections: {
    images: { title: string; description: string; cta: string };
    video: { title: string; description: string; cta: string };
    audio: { title: string; description: string; cta: string };
    tools: { title: string; description: string; cta: string };
  };
  faqTitle: string;
};

function isVideoSrc(src: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src);
}

function normalizeMediaSrc(src: string) {
  if (!src) return src;
  if (src.startsWith('/uploads/')) return `${process.env.NEXT_PUBLIC_API_URL || ''}${src}`;
  return src;
}

function LazyCardImage({ src, sizes, className }: { src: string; sizes: string; className?: string }) {
  return <Image src={src} alt="" fill unoptimized loading="lazy" decoding="async" sizes={sizes} className={className} />;
}

function LazyVideo({
  src,
  className,
  autoPlayEnabled = true,
  poster,
  ...rest
}: React.ComponentPropsWithoutRef<'video'> & { src: string; autoPlayEnabled?: boolean; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isVisible && autoPlayEnabled) {
      el.play().catch(() => {});
      return;
    }
    el.pause();
    el.currentTime = 0;
  }, [autoPlayEnabled, isVisible]);

  return (
    <video
      ref={ref}
      src={isVisible ? src : undefined}
      poster={poster || getVideoPoster(src)}
      className={className}
      autoPlay={autoPlayEnabled && isVisible}
      muted
      loop
      playsInline
      preload={isVisible ? 'metadata' : 'none'}
      {...rest}
    />
  );
}

function FeedCard({
  title,
  description,
  href,
  preview,
  mediaKind,
  allowVideoPreview = true,
}: {
  title: string;
  description: string;
  href: string;
  preview: string;
  mediaKind: string;
  allowVideoPreview?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[1.55rem] bg-[linear-gradient(180deg,rgba(13,17,23,0.88),rgba(8,11,16,0.8))] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,107,74,0.12)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[rgba(8,10,14,1)]">
        {preview ? (
          mediaKind === 'video' ? (
            <LazyVideo
              src={preview}
              autoPlayEnabled={allowVideoPreview}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <>
              <LazyCardImage src={preview} sizes="(max-width: 1280px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,9,0.14),rgba(3,5,9,0.5))]" />
            </>
          )
        ) : (
          <div className="flex h-full items-end p-5">
            <Layers3 className="h-6 w-6 text-white/76" />
          </div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div className="text-lg font-semibold text-white">{title}</div>
        <p className="line-clamp-3 text-sm leading-6 text-zinc-400">{description}</p>
      </div>
    </Link>
  );
}

function CompactSectionCardView({
  card,
  variant = 'default',
}: {
  card: SectionCard;
  variant?: 'default' | 'tools' | 'audio';
}) {
  const primaryImage = card.image && !isVideoSrc(card.image) ? card.image : null;
  const secondaryImage = card.imageBefore && !isVideoSrc(card.imageBefore) ? card.imageBefore : null;
  const mediaSrc = primaryImage || secondaryImage || '';
  const imagePositionClass = variant === 'audio' || variant === 'tools' ? 'bg-top' : 'bg-center';
  const FallbackIcon = variant === 'audio' ? Music2 : variant === 'tools' ? Layers3 : Video;

  return (
    <Link
      href={card.href}
      className="group flex items-stretch gap-3 overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-3 transition-all duration-300 hover:border-white/12 hover:bg-white/[0.06]"
    >
      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[1rem] bg-[rgba(8,10,14,0.9)]">
        {mediaSrc ? (
          <>
            <LazyCardImage src={mediaSrc} sizes="96px" className={`object-cover ${imagePositionClass}`} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,9,0.16),rgba(3,5,9,0.42))]" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,rgba(255,107,74,0.18),rgba(34,199,184,0.16))]">
            <FallbackIcon className="h-5 w-5 text-white/70" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap gap-2">
          {card.chips.slice(0, 1).map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="mt-2 text-[15px] font-semibold leading-tight text-white">{card.title}</div>
        <p className="mt-2 line-clamp-3 text-sm leading-5 text-zinc-400">{card.description}</p>
      </div>
    </Link>
  );
}

function SectionCardView({
  card,
  allowVideoPreview = true,
  variant = 'default',
}: {
  card: SectionCard;
  allowVideoPreview?: boolean;
  variant?: 'default' | 'tools' | 'audio';
}) {
  const hasBeforeAfter = card.imageBefore && card.image;
  const imgIsVideo = card.image ? isVideoSrc(card.image) : false;
  const isNew = NEW_MODELS.has(card.id);
  const isHot = HOT_MODELS.has(card.id);
  const isTools = variant === 'tools';
  const isAudio = variant === 'audio';
  const mediaHeightClass = isTools || isAudio ? 'h-44 sm:h-56 lg:h-64' : 'h-36 sm:h-40';
  const mediaClassName = isTools
    ? 'h-full w-full object-cover object-[center_18%] transition-transform duration-500 group-hover:scale-[1.03]'
    : isAudio
      ? 'h-full w-full object-cover object-[center_22%] transition-transform duration-500 group-hover:scale-[1.03]'
      : 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]';
  const textLinesClass = isTools || isAudio ? 'line-clamp-2 min-h-[3rem]' : 'min-h-[3.75rem]';
  const visibleChips = isTools || isAudio ? card.chips.slice(0, 2) : card.chips;
  const imagePositionClass = isTools || isAudio ? 'bg-top' : 'bg-center';

  return (
    <Link
      href={card.href}
      className="group overflow-hidden rounded-[1.55rem] bg-white/[0.05] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-white/[0.07] hover:shadow-[0_0_40px_rgba(255,107,74,0.12)]"
    >
      {hasBeforeAfter ? (
        <div className={`relative grid w-full grid-cols-2 overflow-hidden ${mediaHeightClass}`}>
          {(isNew || isHot) && (
            <span className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm ${isNew ? 'bg-emerald-500/80 text-white' : 'bg-orange-500/80 text-white'}`}>
              {isNew ? 'NEW' : 'Hot'}
            </span>
          )}
          <div className="relative h-full overflow-hidden">
            {isVideoSrc(card.imageBefore!) ? (
              <LazyVideo src={card.imageBefore!} autoPlayEnabled={allowVideoPreview} className={mediaClassName} />
            ) : (
              <LazyCardImage src={card.imageBefore!} sizes="(max-width: 1280px) 44vw, 20vw" className={`object-cover ${imagePositionClass}`} />
            )}
            <div className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
              Before
            </div>
          </div>
          <div className="relative h-full overflow-hidden">
            {imgIsVideo ? (
              <LazyVideo src={card.image!} autoPlayEnabled={allowVideoPreview} className={mediaClassName} />
            ) : (
              <LazyCardImage src={card.image!} sizes="(max-width: 1280px) 44vw, 20vw" className={`object-cover ${imagePositionClass}`} />
            )}
            <div className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
              After
            </div>
          </div>
        </div>
      ) : imgIsVideo ? (
        <div className={`relative w-full overflow-hidden ${mediaHeightClass}`}>
          <LazyVideo src={card.image!} autoPlayEnabled={allowVideoPreview} className={mediaClassName} />
          {(isNew || isHot) && (
            <span className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm ${isNew ? 'bg-emerald-500/80 text-white' : 'bg-orange-500/80 text-white'}`}>
              {isNew ? 'NEW' : 'Hot'}
            </span>
          )}
        </div>
      ) : (
        <div
          className={`relative w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_45%),linear-gradient(135deg,rgba(255,107,74,0.22),rgba(34,199,184,0.16),rgba(9,12,18,0.55))] bg-cover ${imagePositionClass} ${mediaHeightClass}`}
        >
          {card.image ? <LazyCardImage src={card.image} sizes="(max-width: 1280px) 44vw, 20vw" className="object-cover" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,9,0.18),rgba(3,5,9,0.5))]" />
          {(isNew || isHot) && (
            <span className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm ${isNew ? 'bg-emerald-500/80 text-white' : 'bg-orange-500/80 text-white'}`}>
              {isNew ? 'NEW' : 'Hot'}
            </span>
          )}
        </div>
      )}
      <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {visibleChips.map((chip, index) => (
            <span
              key={chip}
              className={`rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300 ${index > 0 ? 'hidden sm:inline-flex' : ''}`}
            >
              {chip}
            </span>
          ))}
        </div>
        <div>
          <div className="text-base font-semibold text-white sm:text-lg">{card.title}</div>
          <p className={`mt-2 text-sm leading-5 text-zinc-400 sm:leading-6 ${textLinesClass}`}>{card.description}</p>
        </div>
      </div>
    </Link>
  );
}

function CarouselArrow({
  direction,
  onClick,
  className = '',
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all hover:bg-white/10 ${className}`}
    >
      {direction === 'left' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}

function CircularSectionCarousel({ cards, variant = 'default' }: { cards: SectionCard[]; variant?: 'default' | 'tools' | 'audio' }) {
  const shouldCarousel = cards.length > FEATURED_VISIBLE_COUNT;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: shouldCarousel,
    dragFree: false,
    skipSnaps: false,
    duration: 28,
  });

  if (!shouldCarousel) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.id} className="min-w-0">
            <SectionCardView card={card} variant={variant} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative md:px-8">
      <CarouselArrow
        direction="left"
        onClick={() => {
          if (!emblaApi) return;
          if (emblaApi.canScrollPrev()) {
            emblaApi.scrollPrev();
            return;
          }
          emblaApi.scrollTo(Math.max(emblaApi.scrollSnapList().length - 1, 0));
        }}
        className="-left-1 hidden md:flex"
      />
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-3 flex sm:-ml-4">
          {cards.map((card) => (
            <div key={card.id} className="min-w-0 flex-[0_0_88%] pl-3 sm:flex-[0_0_100%] sm:pl-4 md:flex-[0_0_50%] xl:flex-[0_0_33.3333%]">
              <SectionCardView card={card} variant={variant} />
            </div>
          ))}
        </div>
      </div>
      <CarouselArrow
        direction="right"
        onClick={() => {
          if (!emblaApi) return;
          if (emblaApi.canScrollNext()) {
            emblaApi.scrollNext();
            return;
          }
          emblaApi.scrollTo(0);
        }}
        className="-right-1 hidden md:flex"
      />
    </div>
  );
}

function CircularFeedCarousel({
  cards,
  allowVideoPreview = true,
}: {
  cards: FeedCardItem[];
  allowVideoPreview?: boolean;
}) {
  const shouldCarousel = cards.length > FEATURED_VISIBLE_COUNT;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: shouldCarousel,
    dragFree: false,
    skipSnaps: false,
    duration: 28,
  });

  if (!shouldCarousel) {
    return (
      <div className="grid gap-5 xl:grid-cols-3">
        {cards.map((card) => (
          <FeedCard key={card.id} {...card} allowVideoPreview={allowVideoPreview} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative px-8">
      <CarouselArrow
        direction="left"
        onClick={() => {
          if (!emblaApi) return;
          if (emblaApi.canScrollPrev()) {
            emblaApi.scrollPrev();
            return;
          }
          emblaApi.scrollTo(Math.max(emblaApi.scrollSnapList().length - 1, 0));
        }}
        className="-left-1"
      />
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-5 flex">
          {cards.map((card) => (
            <div key={card.id} className="min-w-0 flex-[0_0_100%] pl-5 xl:flex-[0_0_33.3333%]">
              <FeedCard {...card} allowVideoPreview={allowVideoPreview} />
            </div>
          ))}
        </div>
      </div>
      <CarouselArrow
        direction="right"
        onClick={() => {
          if (!emblaApi) return;
          if (emblaApi.canScrollNext()) {
            emblaApi.scrollNext();
            return;
          }
          emblaApi.scrollTo(0);
        }}
        className="-right-1"
      />
    </div>
  );
}

function SectionBlock({
  id,
  title,
  description,
  ctaHref,
  ctaLabel,
  toneClass,
  cards,
  locale,
  variant = 'default',
}: {
  id: string;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  toneClass: string;
  cards: SectionCard[];
  locale: string;
  variant?: 'default' | 'tools' | 'audio';
}) {
  const useCompactMobileLayout = id === 'images' || id === 'video' || id === 'audio' || id === 'tools';
  const mobileCards = cards.slice(0, 3);

  return (
    <section
      id={id}
      className={`relative overflow-hidden rounded-[1.6rem] border border-white/8 px-4 py-5 sm:rounded-[2rem] sm:px-6 sm:py-6 lg:rounded-[2.25rem] lg:px-8 lg:py-8 ${toneClass}`}
    >
      <div className="section-orb absolute -left-32 -top-20 h-72 w-72 bg-[#ff6b4a]" />
      <div className="section-orb absolute -bottom-24 -right-20 h-64 w-64 bg-[#22c7b8]" />
      <div className="relative grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] xl:gap-8">
        <div className="flex flex-col justify-between gap-4 sm:gap-6">
          <div>
            <h2 className="section-title max-w-sm text-[1.45rem] leading-tight text-white sm:text-[1.75rem] lg:text-[2rem]">{title}</h2>
            <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-zinc-400">
              {cards.length} {locale === 'ru' ? 'моделей' : 'models'}
            </span>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/74 sm:mt-4 sm:leading-7">{description}</p>
          </div>
          <Link
            href={ctaHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1] sm:w-fit"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {useCompactMobileLayout ? (
          <>
            <div className="space-y-3 sm:hidden">
              {mobileCards.map((card) => (
                <CompactSectionCardView key={card.id} card={card} variant={variant} />
              ))}
            </div>
            <div className="hidden sm:block">
              <CircularSectionCarousel cards={cards} variant={variant} />
            </div>
          </>
        ) : (
          <CircularSectionCarousel cards={cards} variant={variant} />
        )}
      </div>
    </section>
  );
}

export default function HomeLowerSections({
  locale,
  copy,
  banners,
  activeBanner,
  currentBannerIndex,
  onPrevBanner,
  onNextBanner,
  onSelectBanner,
  onOpenBannerModal,
  latestCards,
  trendingCards,
  imageCards,
  videoCards,
  audioCards,
  toolCards,
  faqs,
  openFaq,
  onToggleFaq,
  isTouchDevice,
  settings,
}: {
  locale: string;
  copy: HomeCopy;
  banners: Banner[];
  activeBanner: Banner | null;
  currentBannerIndex: number;
  onPrevBanner: () => void;
  onNextBanner: () => void;
  onSelectBanner: (index: number) => void;
  onOpenBannerModal: () => void;
  latestCards: FeedCardItem[];
  trendingCards: FeedCardItem[];
  imageCards: SectionCard[];
  videoCards: SectionCard[];
  audioCards: SectionCard[];
  toolCards: SectionCard[];
  faqs: FAQ[];
  openFaq: number | null;
  onToggleFaq: (index: number) => void;
  isTouchDevice: boolean;
  settings: SiteSettings;
}) {
  return (
    <>
      {banners.length > 0 ? (
        <section className="panel-surface relative rounded-[1.9rem] px-4 py-5 sm:rounded-[2.1rem] sm:px-6 sm:py-6 lg:rounded-[2.25rem] lg:px-8 lg:py-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <p className="max-w-2xl text-sm leading-7 text-zinc-400">
              {locale === 'ru'
                ? 'Здесь появляются полезные новости сервиса, новые возможности и специальные предложения, которые помогут использовать платформу эффективнее.'
                : 'This is where useful product news, new capabilities, and special offers appear to help you get more out of the platform.'}
            </p>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <CarouselArrow direction="left" onClick={onPrevBanner} className="static translate-y-0" />
              <CarouselArrow direction="right" onClick={onNextBanner} className="static translate-y-0" />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
            <button
              type="button"
              onClick={onOpenBannerModal}
              className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,17,24,0.92),rgba(8,10,14,0.84))] shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
            >
              <div className="relative min-h-[260px] overflow-hidden sm:min-h-[340px]">
                {activeBanner?.image_url ? (
                  <Image
                    src={normalizeMediaSrc(activeBanner.image_url)}
                    alt={activeBanner.title}
                    fill
                    unoptimized
                    sizes="(max-width: 1280px) 100vw, 60vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,9,0.08),rgba(3,5,9,0.24)_40%,rgba(3,5,9,0.88)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/88">
                    {activeBanner?.subtitle || 'Promo'}
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">{activeBanner?.title}</h3>
                  {activeBanner?.description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-200/80 sm:text-base">{activeBanner.description}</p>
                  ) : null}
                </div>
              </div>
            </button>

            <div className="grid gap-3">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => {
                    onSelectBanner(index);
                    onOpenBannerModal();
                  }}
                  className={`flex items-center gap-3 overflow-hidden rounded-[1.35rem] border p-3 text-left transition-all ${index === currentBannerIndex
                    ? 'border-white/14 bg-white/[0.05]'
                    : 'border-white/8 bg-black/10 hover:border-white/12 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[1rem] border border-white/8 bg-black/20">
                    {banner.image_url ? (
                      <Image
                        src={normalizeMediaSrc(banner.image_url)}
                        alt={banner.title}
                        fill
                        unoptimized
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      {banner.subtitle || 'Promo'}
                    </div>
                    <div className="truncate text-sm font-semibold text-white">{banner.title}</div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                      {banner.description || (locale === 'ru' ? 'Открыть баннер' : 'Open banner')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel-surface rounded-[1.9rem] px-4 py-5 sm:rounded-[2.1rem] sm:px-6 sm:py-6 lg:rounded-[2.25rem] lg:px-8 lg:py-8">
        <div className="mb-6">
          <h2 className="section-title text-[2rem] text-white">{copy.latest.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{copy.latest.description}</p>
        </div>
        {latestCards.length > 0 ? (
          <CircularFeedCarousel cards={latestCards} allowVideoPreview={!isTouchDevice} />
        ) : (
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-4 text-zinc-400">{copy.latest.empty}</div>
        )}
      </section>

      <section className="panel-surface relative rounded-[1.9rem] px-4 py-5 sm:rounded-[2.1rem] sm:px-6 sm:py-6 lg:rounded-[2.25rem] lg:px-8 lg:py-8">
        <div className="section-orb absolute -right-24 top-1/4 h-56 w-56 bg-[#a855f7]" />
        <div className="mb-6">
          <h2 className="section-title text-[2rem] text-white">{copy.trending.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{copy.trending.description}</p>
        </div>
        {trendingCards.length > 0 ? (
          <CircularFeedCarousel cards={trendingCards} allowVideoPreview={!isTouchDevice} />
        ) : (
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-4 text-zinc-400">
            {locale === 'ru' ? 'Пока нет примеров.' : 'No examples yet.'}
          </div>
        )}
      </section>

      <div className="space-y-6">
        <SectionBlock
          id="images"
          title={copy.sections.images.title}
          description={copy.sections.images.description}
          ctaHref="/images"
          ctaLabel={copy.sections.images.cta}
          toneClass="bg-[linear-gradient(180deg,rgba(67,56,202,0.18),rgba(8,11,16,0.88))]"
          cards={imageCards}
          locale={locale}
        />
        <SectionBlock
          id="video"
          title={copy.sections.video.title}
          description={copy.sections.video.description}
          ctaHref="/video"
          ctaLabel={copy.sections.video.cta}
          toneClass="bg-[linear-gradient(180deg,rgba(29,78,216,0.2),rgba(8,11,16,0.88))]"
          cards={videoCards}
          locale={locale}
        />
        <SectionBlock
          id="audio"
          title={copy.sections.audio.title}
          description={copy.sections.audio.description}
          ctaHref="/audio"
          ctaLabel={copy.sections.audio.cta}
          toneClass="bg-[linear-gradient(180deg,rgba(8,145,178,0.18),rgba(8,11,16,0.88))]"
          cards={audioCards}
          locale={locale}
          variant="audio"
        />
        <SectionBlock
          id="tools"
          title={copy.sections.tools.title}
          description={copy.sections.tools.description}
          ctaHref="/catalog"
          ctaLabel={copy.sections.tools.cta}
          toneClass="bg-[linear-gradient(180deg,rgba(219,39,119,0.16),rgba(8,11,16,0.88))]"
          cards={toolCards}
          locale={locale}
          variant="tools"
        />
      </div>

      <section className="panel-surface mx-auto max-w-4xl rounded-[2.25rem] px-8 py-8">
        <div className="mb-6 text-center">
          <div className="accent-pill inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
            <Compass className="mr-2 h-3.5 w-3.5 text-[#ffd166]" />
            FAQ
          </div>
          <h2 className="section-title mt-4 text-[2rem] text-white">{copy.faqTitle}</h2>
        </div>
        <div className="space-y-3">
          {faqs.length === 0 && (
            <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] px-5 py-4 text-zinc-400">
              {locale === 'ru' ? 'Вопросов пока нет.' : 'No FAQs available yet.'}
            </div>
          )}
          {faqs.map((faq, index) => (
            <div key={faq.id} className="overflow-hidden rounded-[1.45rem] border border-white/8 bg-white/[0.03]">
              <button
                onClick={() => onToggleFaq(index)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-white">{faq.question}</span>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === index ? (
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 text-sm leading-7 text-zinc-400">{faq.answer}</div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <GooeyFooter settings={settings} />
      </div>
    </>
  );
}
