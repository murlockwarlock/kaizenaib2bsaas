'use client';

import { ArrowRight, ArrowUpRight, AudioWaveform, Music } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { FeaturedAudioPlayerProvider } from '@/components/FeaturedAudioPlayerContext';
import FeaturedAudioPlayer from '@/components/ui/featured-audio-player';
import type { FeaturedAudio } from '@/lib/types';

export const SUNO_PRESET_CONFIG = [
  { promptKey: 'suno_preset_anthem', titleKey: 'suno_preset_anthem_title', model: 'suno/V5' },
  { promptKey: 'suno_preset_nightdrive', titleKey: 'suno_preset_nightdrive_title', model: 'suno/V4_5PLUS' },
  { promptKey: 'suno_preset_intro', titleKey: 'suno_preset_intro_title', model: 'suno/V4_5' },
] as const;

export const SUNO_BENEFIT_CONFIG = [
  { titleKey: 'suno_benefit_quality_title', descKey: 'suno_benefit_quality_desc', label: 'Suno V5' },
  { titleKey: 'suno_benefit_length_title', descKey: 'suno_benefit_length_desc', label: 'Suno V4.5+' },
  { titleKey: 'suno_benefit_workflow_title', descKey: 'suno_benefit_workflow_desc', label: 'Prompt to Track' },
] as const;

type SunoPreset = {
  title: string;
  prompt: string;
  model: string;
};

type SunoBenefit = {
  label: string;
  title: string;
  description: string;
};

type SunoSpotlightCopy = {
  badge: string;
  title: string;
  description: string;
  ctaCreate: string;
  ctaPrompt: string;
  featuredLabel: string;
  featuredTitle: string;
  featuredCountLabel: string;
  featuredFallbackLabel: string;
  usePromptLabel: string;
  playLabel: string;
  pauseLabel: string;
  promptLabel: string;
  tryNowLabel: string;
};

type SunoSpotlightProps = {
  featuredAudio: FeaturedAudio[];
  presets: SunoPreset[];
  benefits: SunoBenefit[];
  copy: SunoSpotlightCopy;
  createHref: string;
  promptHref: string;
  className?: string;
};

function formatModel(model: string) {
  return model.replace('suno/', 'Suno ').replace('V4_5PLUS', 'V4.5+').replace('V4_5', 'V4.5');
}

export default function SunoSpotlight({
  featuredAudio,
  presets,
  benefits,
  copy,
  createHref,
  promptHref,
  className = '',
}: SunoSpotlightProps) {
  const showcase = featuredAudio.slice(0, 3);

  return (
    <FeaturedAudioPlayerProvider>
      <section
        className={`panel-surface relative overflow-hidden rounded-[2rem] border border-white/10 px-4 py-5 sm:px-5 sm:py-6 md:rounded-[2.35rem] md:px-6 md:py-7 xl:px-7 ${className}`.trim()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_28%)]" />
        <div className="absolute inset-y-0 right-0 w-[44%] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] opacity-70 blur-3xl" />

        <div className="relative grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] xl:items-start">
          <div>
            <div className="accent-pill inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88">
              <Music className="h-3.5 w-3.5 text-[#ffd166]" />
              {copy.badge}
            </div>

            <h2 className="section-title mt-5 max-w-3xl text-[clamp(2.2rem,5vw,4.4rem)] leading-[0.98] text-white">
              {copy.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base md:text-lg">
              {copy.description}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={createHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(255,107,74,0.22)] sm:w-auto"
              >
                {copy.ctaCreate}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={promptHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white sm:w-auto"
              >
                {copy.ctaPrompt}
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {benefits.map((benefit) => (
                <div
                  key={benefit.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300"
                >
                  <AudioWaveform className="h-3.5 w-3.5 text-[#22c7b8]" />
                  {benefit.label}
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="mesh-card rounded-[1.35rem] border border-white/8 p-4">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{benefit.label}</div>
                  <div className="mt-3 text-base font-semibold text-white">{benefit.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  {copy.featuredLabel}
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">{copy.featuredTitle}</h3>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffd166]" />
                {featuredAudio.length > 0 ? `${featuredAudio.length} ${copy.featuredCountLabel}` : copy.featuredFallbackLabel}
              </div>
            </div>

            {showcase.length > 0 ? (
              showcase.map((item) => (
                <FeaturedAudioPlayer
                  key={item.id}
                  item={item}
                  playlist={showcase}
                  usePromptLabel={copy.usePromptLabel}
                  playLabel={copy.playLabel}
                  pauseLabel={copy.pauseLabel}
                  promptLabel={copy.promptLabel}
                />
              ))
            ) : (
              presets.map((preset, index) => (
                <Link
                  key={preset.title}
                  href={`/audio?model=${encodeURIComponent(preset.model)}&prompt=${encodeURIComponent(preset.prompt)}`}
                  className="group relative overflow-hidden rounded-[1.55rem] border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,25,0.94),rgba(8,10,14,0.9))] p-4 transition-all hover:border-white/14 hover:bg-white/[0.04]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.1),transparent_30%)] opacity-80" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                        {formatModel(preset.model)}
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-[#ffd166]">
                        <Music className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">{preset.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">{preset.prompt}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white">
                      {index === 0 ? copy.tryNowLabel : copy.usePromptLabel}
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </FeaturedAudioPlayerProvider>
  );
}
