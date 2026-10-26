'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  FolderOpen,
  Home,
  Image as ImageIcon,
  Layers3,
  LogOut,
  Music,
  Video,
  X,
} from 'lucide-react';
import { FaDiscord, FaInstagram, FaTelegram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

import RotatingText from '@/components/ui/RotatingText';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import type { HomeSocialLink, NavCard, SectionCard, FeedCardItem, SupportedLocale } from '@/components/home/home-presenter';
import type { Banner, FAQ, SiteSettings } from '@/lib/types';
import { getUserAvatarUrl, getUserDisplayName, getUserInitials } from '@/lib/user-presenter';
import { getVideoPoster } from '@/lib/video-posters';
import KaizenMark from '@/components/KaizenMark';

const HomeLowerSections = dynamic(() => import('@/components/home/HomeLowerSections'));
const NotificationBell = dynamic(() => import('@/components/NotificationBell'), { ssr: false });

function HomeSectionsShell() {
  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="panel-surface rounded-[1.8rem] p-5 sm:rounded-[2rem] sm:p-6">
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-3 h-9 w-64 rounded-2xl bg-white/10" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="h-44 rounded-[1.4rem] bg-white/[0.05]" />
          <div className="h-44 rounded-[1.4rem] bg-white/[0.05]" />
          <div className="h-44 rounded-[1.4rem] bg-white/[0.05]" />
        </div>
      </div>
      <div className="panel-surface rounded-[1.8rem] p-5 sm:rounded-[2rem] sm:p-6">
        <div className="h-4 w-28 rounded-full bg-white/10" />
        <div className="mt-3 h-9 w-56 rounded-2xl bg-white/10" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="h-36 rounded-[1.3rem] bg-white/[0.05]" />
          <div className="h-36 rounded-[1.3rem] bg-white/[0.05]" />
          <div className="h-36 rounded-[1.3rem] bg-white/[0.05]" />
          <div className="h-36 rounded-[1.3rem] bg-white/[0.05]" />
        </div>
      </div>
    </div>
  );
}

type DesktopHomeLandingProps = {
  locale: SupportedLocale;
  banners: Banner[];
  faqs: FAQ[];
  settings: SiteSettings;
  latestCards: FeedCardItem[];
  trendingCards: FeedCardItem[];
  imageCards: SectionCard[];
  videoCards: SectionCard[];
  audioCards: SectionCard[];
  toolCards: SectionCard[];
  dropdownImages: NavCard[];
  dropdownVideo: NavCard[];
  dropdownAudio: NavCard[];
  socials: HomeSocialLink[];
};

/** Plays video only when visible in viewport — saves GPU/CPU on weaker machines. */
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

function normalizeBannerSrc(src: string) {
  if (!src) return src;
  return src.replace(/^https?:\/\/127\.0\.0\.1:8000/, '');
}

const COPY = {
  ru: {
    nav: {
      home: 'Главная',
      images: 'Картинки',
      video: 'Видео',
      audio: 'Музыка',
      explore: 'Обзор',
      tools: 'Эффекты',
      pricing: 'Тарифы',
      start: 'начать',
      login: 'Войти',
      dashboard: 'кабинет',
      openAll: 'Открыть раздел',
    },
    hero: {
      eyebrow: 'KaizenAI',
      titlePrefix: 'Создавай',
      titleSuffix: 'с ИИ',
      rotatingTexts: ['визуал', 'музыку', 'голос', 'видео', 'картинки'],
      description: 'Более 50 моделей для изображений, видео и звука. Выберите режим, задайте параметры и получите результат в одном рабочем месте.',
      primary: 'Начать бесплатно',
      secondary: 'Смотреть тарифы',
      stats: [
        { label: 'Видео', value: 'Kling, Veo, Hailuo' },
        { label: 'Аудио', value: 'Suno, ElevenLabs' },
        { label: 'Изображения', value: 'Flux, Seedream, Imagen' },
      ],
    },
    latest: {
      title: 'Свежие генерации',
      description: 'Последние удачные примеры, которые можно открыть и повторить внутри сервиса.',
      empty: 'Пока нет свежих генераций.',
    },
    trending: {
      title: 'Популярные примеры',
      description: 'Подборка примеров, которые чаще всего открывают и используют как ориентир.',
    },
    sections: {
      images: {
        title: 'Картинки и дизайн',
        description: 'Иллюстрации, рекламные материалы, портреты и изображения для конкретных задач.',
        cta: 'Все модели для изображений',
      },
      video: {
        title: 'Видео и анимация',
        description: 'Ролики из текста, анимация изображений и готовые сцены для соцсетей и рекламы.',
        cta: 'Все модели для видео',
      },
      audio: {
        title: 'Музыка и голос',
        description: 'Делайте треки, озвучку и голоса для видео, подкастов, презентаций и коротких форматов.',
        cta: 'Открыть аудио',
      },
      tools: {
        title: 'Быстрые инструменты',
        description: 'Улучшение качества, удаление фона, ретушь и другие отдельные операции.',
        cta: 'Открыть каталог',
      },
    },
    faqTitle: 'Часто задаваемые вопросы',
  },
  en: {
    nav: {
      home: 'Home',
      images: 'Images',
      video: 'Video',
      audio: 'Audio',
      explore: 'Explore',
      tools: 'Effects',
      pricing: 'Plans',
      start: 'start',
      login: 'Login',
      dashboard: 'dashboard',
      openAll: 'Open section',
    },
    hero: {
      eyebrow: 'KaizenAI',
      titlePrefix: 'Create',
      titleSuffix: 'with AI',
      rotatingTexts: ['visuals', 'music', 'voice', 'video', 'images'],
      description: '50+ models for images, video and audio. Choose a mode, set the parameters and get the result in one workspace.',
      primary: 'Start free',
      secondary: 'View pricing',
      stats: [
        { label: 'Video', value: 'Kling, Veo, Hailuo' },
        { label: 'Audio', value: 'Suno, ElevenLabs' },
        { label: 'Images', value: 'Flux, Seedream, Imagen' },
      ],
    },
    latest: {
      title: 'Fresh generations',
      description: 'Recent successful examples you can open and recreate inside the product.',
      empty: 'No fresh generations yet.',
    },
    trending: {
      title: 'Popular examples',
      description: 'A selection of examples users open most often as a creative starting point.',
    },
    sections: {
      images: {
        title: 'Images & Design',
        description: 'Illustrations, ad assets, portraits and images for specific tasks.',
        cta: 'All image models',
      },
      video: {
        title: 'Video & Animation',
        description: 'Clips from text, image animation and ready-made scenes for social content and ads.',
        cta: 'All video models',
      },
      audio: {
        title: 'Music & Voice',
        description: 'Create tracks, voiceovers and AI voices for videos, podcasts, presentations and short-form content.',
        cta: 'Open audio',
      },
      tools: {
        title: 'Quick Tools',
        description: 'Upscaling, background removal, retouching and other focused operations.',
        cta: 'Open catalog',
      },
    },
    faqTitle: 'Frequently asked questions',
  },
} as const;

function HeaderDropdown({
  label,
  title,
  description,
  cards,
  sectionId,
  sectionHref,
  ctaLabel,
}: {
  label: string;
  title: string;
  description: string;
  cards: NavCard[];
  sectionId: string;
  sectionHref: string;
  ctaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocusCapture={() => setIsOpen(true)}
    >
      <a
        href={`#${sectionId}`}
        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:rotate-180" />
      </a>
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
                href={sectionHref}
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
                    <div className="relative h-24 w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_45%),linear-gradient(135deg,rgba(255,107,74,0.24),rgba(34,199,184,0.16),rgba(9,12,18,0.55))]">
                      {isOpen && card.image ? <Image src={card.image} alt="" fill unoptimized loading="lazy" sizes="160px" className="object-cover" /> : null}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,9,0.12),rgba(3,5,9,0.44))]" />
                    </div>
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

export default function DesktopHomeLanding({
  locale,
  banners,
  faqs,
  settings,
  latestCards,
  trendingCards,
  imageCards,
  videoCards,
  audioCards,
  toolCards,
  dropdownImages,
  dropdownVideo,
  dropdownAudio,
  socials,
}: DesktopHomeLandingProps) {
  const copy = COPY[locale];
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [shouldRenderLowerSections, setShouldRenderLowerSections] = useState(false);
  const activeBanner = banners[currentBannerIndex] ?? null;

  useEffect(() => {
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    const syncFlags = () => {
      setIsTouchDevice(pointerQuery.matches);
    };

    syncFlags();
    pointerQuery.addEventListener('change', syncFlags);

    return () => {
      pointerQuery.removeEventListener('change', syncFlags);
    };
  }, []);

  useEffect(() => {
    if (shouldRenderLowerSections) return;

    const activate = () => setShouldRenderLowerSections(true);
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(activate, { timeout: 900 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(activate, 250);
    return () => globalThis.clearTimeout(timeoutId);
  }, [shouldRenderLowerSections]);

  const displayName = user ? getUserDisplayName(user) : '';
  const avatarUrl = user ? getUserAvatarUrl(user) : null;
  const initials = user ? getUserInitials(user) : 'G';
  const renderedSocials = useMemo(() => socials.map((item) => ({
    ...item,
    icon:
      item.iconKey === 'telegram' ? <FaTelegram className="h-3.5 w-3.5" />
      : item.iconKey === 'instagram' ? <FaInstagram className="h-3.5 w-3.5" />
      : item.iconKey === 'twitter' ? <FaXTwitter className="h-3.5 w-3.5" />
      : <FaDiscord className="h-3.5 w-3.5" />,
  })), [socials]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="aurora-container">
        <div className="aurora-blur" />
      </div>

      <main className="relative flex w-full flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-4 sm:py-5 md:gap-6 md:px-6 md:py-6">
        {showBannerModal && banners.length > 0 ? (
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              onClick={() => setShowBannerModal(false)}
            >
              <div
                className="panel-surface-strong relative w-full max-w-2xl overflow-hidden rounded-[1.8rem] sm:rounded-[2rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() => setShowBannerModal(false)}
                  className="absolute right-4 top-4 z-50 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                  <div key={currentBannerIndex}>
                    <div className="relative aspect-[16/9] overflow-hidden">
                      {activeBanner?.image_url ? (
                        <Image
                          src={normalizeBannerSrc(activeBanner.image_url)}
                          alt={activeBanner.title}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, 768px"
                          className="object-cover"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    <div className="px-6 py-5">
                      <span className="accent-pill mb-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/90 backdrop-blur-md">
                        {activeBanner?.subtitle || 'Promo'}
                      </span>
                      <h2 className="mb-1.5 text-xl font-black leading-tight text-white md:text-2xl">
                        {activeBanner?.title}
                      </h2>
                      {activeBanner?.description ? (
                        <p className="line-clamp-2 text-sm text-zinc-400">{activeBanner.description}</p>
                      ) : null}
                      {activeBanner?.link ? (
                        <a
                          href={activeBanner.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.09]"
                        >
                          {locale === 'ru' ? 'Открыть' : 'Open'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                {banners.length > 1 ? (
                  <div className="flex items-center justify-between px-6 pb-5">
                    <div className="flex gap-1.5">
                      {banners.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentBannerIndex(index)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${index === currentBannerIndex ? 'w-5 bg-[#ff6b4a]' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                        className="rounded-lg bg-white/[0.06] p-1.5 text-white transition-all hover:bg-white/[0.12]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
                        className="rounded-lg bg-white/[0.06] p-1.5 text-white transition-all hover:bg-white/[0.12]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

        <header className="panel-surface sticky top-3 z-30 rounded-[1.6rem] px-3 py-3 sm:top-4 sm:rounded-[2rem] sm:px-5">
          <div className="hidden items-center justify-between gap-3 lg:flex">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] shadow-[0_16px_40px_rgba(255,107,74,0.22)]">
                <KaizenMark className="h-5 w-5 text-white" />
              </div>
              <div className="font-display text-[1.05rem] text-white">KaizenAI</div>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5">
              <a href="#top" className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white">
                {copy.nav.home}
              </a>
              <Link
                href="/explore"
                className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {copy.nav.explore}
              </Link>
              <HeaderDropdown
                label={copy.nav.images}
                title={copy.sections.images.title}
                description={copy.sections.images.description}
                cards={dropdownImages}
                sectionId="images"
                sectionHref="/images"
                ctaLabel={copy.nav.openAll}
              />
              <HeaderDropdown
                label={copy.nav.video}
                title={copy.sections.video.title}
                description={copy.sections.video.description}
                cards={dropdownVideo}
                sectionId="video"
                sectionHref="/video"
                ctaLabel={copy.nav.openAll}
              />
              <HeaderDropdown
                label={copy.nav.audio}
                title={copy.sections.audio.title}
                description={copy.sections.audio.description}
                cards={dropdownAudio}
                sectionId="audio"
                sectionHref="/audio?model=suno%2FV6"
                ctaLabel={copy.nav.openAll}
              />
              <Link
                href="/catalog"
                className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {copy.nav.tools}
              </Link>
              <Link
                href="/pricing"
                className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {copy.nav.pricing}
              </Link>
              {user && (
                <>
                  <Link
                    href="/my-creations"
                    className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    {locale === 'ru' ? 'Мои проекты' : 'My Creations'}
                  </Link>
                  <Link
                    href="/my-likes"
                    className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    {locale === 'ru' ? 'Мои лайки' : 'My Likes'}
                  </Link>
                </>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {renderedSocials.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5">
                  {renderedSocials.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-zinc-300 transition-colors hover:border-white/14 hover:bg-white/[0.05] hover:text-white"
                      title={item.label}
                    >
                      {item.icon}
                    </a>
                  ))}
                </div>
              )}

              {user ? <NotificationBell mode="desktop" /> : null}

              <div className="flex items-center overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]">
                <button
                  onClick={() => router.replace(pathname || '/', { locale: 'en' })}
                  className={`px-2.5 py-1.5 text-[10px] font-bold tracking-[0.2em] transition-colors ${locale === 'en' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  EN
                </button>
                <div className="h-3 w-px bg-white/10" />
                <button
                  onClick={() => router.replace(pathname || '/', { locale: 'ru' })}
                  className={`px-2.5 py-1.5 text-[10px] font-bold tracking-[0.2em] transition-colors ${locale === 'ru' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  RU
                </button>
              </div>

              {user ? (
                <>
                  <div className="hidden lg:flex items-center rounded-full border border-white/8 bg-white/[0.04] pr-1.5">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] text-xs font-semibold text-white">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className="max-w-[8rem] truncate text-sm font-medium text-white">{displayName}</span>
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Coins className="h-3 w-3 text-[#ffd166]" />
                        {user.balance ?? 0}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                      title={locale === 'ru' ? 'Выйти' : 'Logout'}
                      aria-label={locale === 'ru' ? 'Выйти' : 'Logout'}
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.22)] transition-all duration-200 hover:translate-y-[-1px]"
                >
                  {copy.nav.login}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] shadow-[0_12px_28px_rgba(255,107,74,0.22)]">
                  <KaizenMark className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="font-display truncate text-[1rem] text-white">KaizenAI</div>
              </Link>

              <div className="flex items-center gap-2">
                {user ? <NotificationBell compact mode="mobile" /> : null}

                <div className="flex items-center overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]">
                  <button
                    onClick={() => router.replace(pathname || '/', { locale: 'en' })}
                    className={`px-2 py-1 text-[10px] font-bold tracking-[0.18em] transition-colors ${locale === 'en' ? 'bg-white/[0.08] text-white' : 'text-zinc-500'}`}
                  >
                    EN
                  </button>
                  <div className="h-3 w-px bg-white/10" />
                  <button
                    onClick={() => router.replace(pathname || '/', { locale: 'ru' })}
                    className={`px-2 py-1 text-[10px] font-bold tracking-[0.18em] transition-colors ${locale === 'ru' ? 'bg-white/[0.08] text-white' : 'text-zinc-500'}`}
                  >
                    RU
                  </button>
                </div>

                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] text-[10px] font-semibold text-white">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                        <Coins className="h-3 w-3 text-[#ffd166]" />
                        {user.balance ?? 0}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                      title={locale === 'ru' ? 'Выйти' : 'Logout'}
                      aria-label={locale === 'ru' ? 'Выйти' : 'Logout'}
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    {copy.nav.login}
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { href: '/', label: copy.nav.home, icon: Home, active: true },
                { href: '/explore', label: copy.nav.explore, icon: Compass },
                { href: '/images', label: copy.nav.images, icon: ImageIcon },
                { href: '/video', label: copy.nav.video, icon: Video },
                { href: '/audio?model=suno%2FV6', label: copy.nav.audio, icon: Music },
                { href: '/catalog', label: copy.nav.tools, icon: Layers3 },
                { href: '/pricing', label: copy.nav.pricing, icon: Coins },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                      item.active ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
              {user ? (
                <>
                  <Link
                    href="/my-creations"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    {locale === 'ru' ? 'Мои проекты' : 'My Creations'}
                  </Link>
                  <Link
                    href="/my-likes"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    {locale === 'ru' ? 'Мои лайки' : 'My Likes'}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <section id="top" className="relative min-h-[460px] overflow-hidden rounded-[1.9rem] sm:min-h-[520px] sm:rounded-[2.2rem] lg:min-h-[42vw] lg:rounded-[2.5rem]">
          <LazyVideo
            src="/examples/glavnuibanner/example.mp4"
            className="absolute inset-0 h-full w-full object-cover"
            autoPlayEnabled={!isTouchDevice}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="relative z-10 px-5 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-10 lg:py-16">
            <div className="max-w-2xl">
              <div className="accent-pill inline-flex rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/88">
                <KaizenMark className="mr-2 h-3.5 w-3.5 text-[#ffd166]" />
                {copy.hero.eyebrow}
              </div>
              <h1 className="section-title mt-6 text-[2.45rem] leading-[0.96] text-white sm:text-[3rem] md:text-[3.5rem] lg:mt-7 lg:text-[4.2rem]">
                <span className="block">{copy.hero.titlePrefix}</span>
                <span className="mt-2 block leading-[0.98]">
                  <span className="relative -mb-[0.2em] inline-flex min-h-[1.18em] overflow-hidden align-baseline pb-[0.2em]">
                    <RotatingText
                      texts={[...copy.hero.rotatingTexts]}
                      mainClassName="inline-flex min-h-[1.18em] items-end text-[#ffd166] drop-shadow-[0_0_22px_rgba(255,209,102,0.28)]"
                      splitBy="words"
                      staggerFrom="last"
                      initial={{ y: '110%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: '-110%', opacity: 0 }}
                      staggerDuration={0}
                      elementLevelClassName="whitespace-nowrap leading-[1.02]"
                      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                      rotationInterval={2400}
                    />
                  </span>
                  {' '}{copy.hero.titleSuffix}
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8 lg:mt-6">
                {copy.hero.description}
              </p>
              <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4 lg:mt-8">
                <Link
                  href={user ? '/images' : '/register'}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.22)] transition-all duration-200 hover:translate-y-[-1px]"
                >
                  {copy.hero.primary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/[0.15]"
                >
                  <Coins className="h-4 w-4 text-[#ffd166]" />
                  {copy.hero.secondary}
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 z-10 hidden items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-2 backdrop-blur-md sm:flex">
            <Video className="h-4 w-4 text-[#ffd166]" />
            <span className="text-xs font-semibold text-white/90">
              {locale === 'ru' ? 'Сделано с Kling AI' : 'Made with Kling AI'}
            </span>
          </div>
        </section>

        {shouldRenderLowerSections ? (
          <HomeLowerSections
            locale={locale}
            copy={copy}
            banners={banners}
            activeBanner={activeBanner}
            currentBannerIndex={currentBannerIndex}
            onPrevBanner={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            onNextBanner={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
            onSelectBanner={setCurrentBannerIndex}
            onOpenBannerModal={() => setShowBannerModal(true)}
            latestCards={latestCards}
            trendingCards={trendingCards}
            imageCards={imageCards}
            videoCards={videoCards}
            audioCards={audioCards}
            toolCards={toolCards}
            faqs={faqs}
            openFaq={openFaq}
            onToggleFaq={(index) => setOpenFaq(openFaq === index ? null : index)}
            isTouchDevice={isTouchDevice}
            settings={settings}
          />
        ) : (
          <HomeSectionsShell />
        )}
      </main>

    </div>
  );
}
