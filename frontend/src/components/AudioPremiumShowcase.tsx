'use client';

import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { FeaturedAudioPlayerProvider } from '@/components/FeaturedAudioPlayerContext';
import FeaturedAudioPlayer from '@/components/ui/featured-audio-player';
import AudioShowcaseCard from '@/components/ui/audio-showcase-card';
import type { FeaturedAudio } from '@/lib/types';

type PremiumAudioItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  chips: string[];
  promptPreview: string;
  onClick?: () => void;
};

type AudioPremiumShowcaseProps = {
  badge: string;
  title: string;
  description: string;
  items: PremiumAudioItem[];
  featuredAudio: FeaturedAudio[];
  featuredLabel: string;
  featuredTitle: string;
  featuredDescription: string;
  cardTagLabel: string;
  cardCtaLabel: string;
  usePromptLabel: string;
  playLabel: string;
  pauseLabel: string;
  promptLabel: string;
  className?: string;
};

export default function AudioPremiumShowcase({
  badge,
  title,
  description,
  items,
  featuredAudio,
  featuredLabel,
  featuredTitle,
  featuredDescription,
  cardTagLabel,
  cardCtaLabel,
  usePromptLabel,
  playLabel,
  pauseLabel,
  promptLabel,
  className = '',
}: AudioPremiumShowcaseProps) {
  const demoTracks = featuredAudio.slice(0, 3);

  return (
    <FeaturedAudioPlayerProvider>
      <section className={`home-flat-surface relative overflow-hidden rounded-[1.8rem] p-4 sm:p-5 md:rounded-[2rem] md:p-7 ${className}`.trim()}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_26%)]" />

        <div className="relative grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:items-start">
          <div>
            <div className="accent-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
              <Sparkles className="h-3.5 w-3.5 text-[#ffd166]" />
              {badge}
            </div>
            <h2 className="section-title mt-5 max-w-3xl text-[clamp(2.2rem,5vw,4.6rem)] leading-[0.98] text-white">
              {title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base md:text-lg">
              {description}
            </p>

            <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-2">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/8 text-left shadow-[0_18px_54px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-white/14"
                  >
                    <div className="absolute inset-0">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 1280px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,10,0.08)_0%,rgba(4,6,10,0.44)_38%,rgba(4,6,10,0.96)_100%)]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_28%)]" />
                    </div>
                    <div className="relative grid min-h-[300px] grid-rows-[auto_1fr_auto] p-4 sm:min-h-[332px] sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[rgba(10,12,16,0.88)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ffd166]" />
                          {cardTagLabel}
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/12 bg-[rgba(12,14,18,0.88)] text-white">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col justify-end">
                        <div className="flex min-h-[3rem] flex-wrap content-start gap-2">
                          {item.chips.slice(0, 2).map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full border border-white/12 bg-[rgba(12,14,18,0.88)] px-3 py-1.5 text-[11px] font-medium text-zinc-100"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                        <h3 className="mt-4 max-w-[18ch] text-[1.24rem] font-semibold leading-tight text-white sm:max-w-[16ch] sm:text-[1.42rem]">
                          {item.title}
                        </h3>
                      </div>

                      <div className="mt-5">
                        <p className="max-w-md text-sm leading-relaxed text-zinc-200/88">{item.description}</p>
                        <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-[rgba(255,255,255,0.12)] px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-[rgba(255,255,255,0.18)]">
                          {cardCtaLabel}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 xl:sticky xl:top-8">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 sm:rounded-[1.7rem]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ffd166]">{featuredLabel}</div>
              <h3 className="mt-3 text-xl font-semibold text-white sm:text-2xl">{featuredTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{featuredDescription}</p>
            </div>

            {demoTracks.length > 0 ? (
              demoTracks.map((item) => (
                <FeaturedAudioPlayer
                  key={item.id}
                  item={item}
                  playlist={demoTracks}
                  usePromptLabel={usePromptLabel}
                  playLabel={playLabel}
                  pauseLabel={pauseLabel}
                  promptLabel={promptLabel}
                />
              ))
            ) : (
              items.slice(0, 2).map((item) => (
                <AudioShowcaseCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.chips[0]}
                  prompt={item.promptPreview}
                  showControls={false}
                  className="min-h-[240px]"
                />
              ))
            )}
          </div>
        </div>
      </section>
    </FeaturedAudioPlayerProvider>
  );
}
