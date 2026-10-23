'use client';

import { Check, Clapperboard } from 'lucide-react';
import { Link } from '@/i18n/routing';
import SmartPreviewVideo from '@/components/SmartPreviewVideo';

type MotionControlSpotlightProps = {
  badge: string;
  title: string;
  description: string;
  beforeLabel: string;
  afterLabel: string;
  chips: string[];
  tipsTitle: string;
  tips: string[];
  ctaLabel: string;
  href: string;
  className?: string;
};

const BEFORE_SRC = '/examples/kling-3motion-control/before.mp4';
const AFTER_SRC = '/examples/kling-3motion-control/after.mp4';

export default function MotionControlSpotlight({
  badge,
  title,
  description,
  beforeLabel,
  afterLabel,
  chips,
  tipsTitle,
  tips,
  ctaLabel,
  href,
  className = '',
}: MotionControlSpotlightProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-none border-y border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_30%),rgba(7,10,16,0.92)] p-4 sm:rounded-[2rem] sm:border sm:border-white/10 sm:p-6 ${className}`.trim()}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,rgba(0,0,0,0.14))]" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
          <Clapperboard className="h-3.5 w-3.5" />
          {badge}
        </div>
        <h2 className="mt-4 max-w-2xl text-[clamp(1.5rem,3vw,2.35rem)] font-semibold leading-tight text-white">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">{description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-zinc-100"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { id: 'before', label: beforeLabel, src: BEFORE_SRC, accent: 'bg-amber-300' },
              { id: 'after', label: afterLabel, src: AFTER_SRC, accent: 'bg-emerald-300' },
            ].map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:rounded-[1.6rem]"
              >
                <div className="relative aspect-[9/16] bg-black">
                  <SmartPreviewVideo
                    src={item.src}
                    preload="metadata"
                    mobileAutoPlay={true}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-start p-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(10,12,16,0.86)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                      <span className={`h-2 w-2 rounded-full ${item.accent}`} />
                      {item.label}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex h-full flex-col justify-between rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4 sm:rounded-[1.6rem] sm:p-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                {tipsTitle}
              </div>
              <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                {tips.map((tip) => (
                  <div
                    key={tip}
                    className="flex items-start gap-3 rounded-[1rem] border border-white/8 bg-black/20 px-3.5 py-3 sm:rounded-[1.2rem] sm:px-4"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/12 text-cyan-200">
                      <Check className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-zinc-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={href}
              className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
            >
              <Clapperboard className="h-4 w-4" />
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
