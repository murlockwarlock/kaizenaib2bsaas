'use client';

import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import KaizenMark from '@/components/KaizenMark';

type PremiumVisualItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  chips: string[];
  onClick?: () => void;
};

type VisualQuickAction = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  chips?: string[];
  onClick?: () => void;
};

type VisualPremiumShowcaseProps = {
  badge: string;
  title: string;
  description: string;
  items: PremiumVisualItem[];
  quickBadge?: string;
  quickTitle?: string;
  quickDescription?: string;
  quickActions?: VisualQuickAction[];
  cardTagLabel: string;
  cardCtaLabel: string;
  quickCtaLabel?: string;
  splitAt?: 'xl' | '2xl';
  className?: string;
};

export default function VisualPremiumShowcase({
  badge,
  title,
  description,
  items,
  quickBadge,
  quickTitle,
  quickDescription,
  quickActions = [],
  cardTagLabel,
  cardCtaLabel,
  quickCtaLabel,
  splitAt = 'xl',
  className = '',
}: VisualPremiumShowcaseProps) {
  const desktopLayoutClass =
    splitAt === '2xl'
      ? '2xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] 2xl:items-start'
      : 'xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:items-start';
  const stickyClass = splitAt === '2xl' ? '2xl:sticky 2xl:top-8' : 'xl:sticky xl:top-8';

  return (
    <section
      className={`home-flat-surface relative overflow-hidden rounded-[1.8rem] p-4 sm:p-5 md:rounded-[2rem] md:p-7 ${className}`.trim()}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.14),transparent_28%)]" />

      <div className={`relative grid gap-5 md:gap-6 ${desktopLayoutClass}`.trim()}>
        <div>
          <div className="accent-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
            <KaizenMark className="h-3.5 w-3.5 text-cyan-300" />
            {badge}
          </div>
          <h2 className="section-title mt-4 max-w-2xl text-[clamp(1.75rem,3.6vw,3.15rem)] leading-[1.02] text-white">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-[15px]">
            {description}
          </p>

          <div className="mt-5 grid auto-rows-fr gap-3 sm:gap-4 lg:grid-cols-2">
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
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.15),transparent_28%)]" />
                  </div>

                  <div className="relative flex h-full min-h-[280px] flex-col p-4 sm:min-h-[300px] lg:min-h-[320px] sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[rgba(10,12,16,0.88)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                        {cardTagLabel}
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/12 bg-[rgba(12,14,18,0.88)] text-white">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-1 flex-col">
                      <h3 className="break-words text-[1.22rem] font-semibold leading-tight text-white sm:text-[1.4rem]">
                        {item.title}
                      </h3>
                      <p className="mt-3 max-w-lg text-sm leading-[1.65] text-zinc-200/88">
                        {item.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-white/12 bg-[rgba(12,14,18,0.88)] px-3 py-1.5 text-[11px] font-medium text-zinc-100"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-[rgba(255,255,255,0.12)] px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-[rgba(255,255,255,0.18)]">
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

        {quickActions.length > 0 ? (
          <div className={`grid gap-4 ${stickyClass}`.trim()}>
            {quickBadge && quickTitle && quickDescription ? (
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 sm:rounded-[1.7rem]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
                  {quickBadge}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white sm:text-[1.35rem]">{quickTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{quickDescription}</p>
              </div>
            ) : null}

            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="group rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/24 hover:bg-white/[0.05]"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/85">
                  {action.eyebrow}
                </div>
                <div className="mt-3 text-lg font-semibold text-white">{action.title}</div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{action.description}</p>
                {action.chips?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {action.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-zinc-200"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
                {quickCtaLabel ? (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-cyan-400/12">
                    {quickCtaLabel}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
