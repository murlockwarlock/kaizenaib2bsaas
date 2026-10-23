'use client';

import { ArrowUpRight, Play } from 'lucide-react';
import { Link } from '@/i18n/routing';
import SmartPreviewVideo from '@/components/SmartPreviewVideo';

type VideoShowcaseGridItem = {
  id: string;
  title: string;
  description: string;
  chips: string[];
  videoSrc: string;
  href: string;
};

type VideoShowcaseGridProps = {
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  items: VideoShowcaseGridItem[];
  className?: string;
};

export default function VideoShowcaseGrid({
  badge,
  title,
  description,
  ctaLabel,
  items,
  className = '',
}: VideoShowcaseGridProps) {
  return (
    <section className={`rounded-none border-y border-white/8 bg-white/[0.03] p-4 sm:rounded-[2rem] sm:border sm:border-white/10 sm:p-6 ${className}`.trim()}>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-100">
          <Play className="h-3.5 w-3.5 text-cyan-300" />
          {badge}
        </div>
        <h3 className="mt-4 text-[clamp(1.45rem,2.8vw,2.3rem)] font-semibold leading-tight text-white">
          {title}
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
      </div>

      <div className="grid gap-3 min-[420px]:grid-cols-2 md:gap-4 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex h-full flex-col overflow-hidden rounded-[1.15rem] border border-white/10 bg-black/20 transition hover:-translate-y-1 hover:border-cyan-400/25 sm:rounded-[1.6rem]"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-black sm:aspect-[9/16]">
              <SmartPreviewVideo
                src={item.videoSrc}
                preload="metadata"
                mobileAutoPlay={true}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,10,0.04),rgba(3,6,10,0.2)_40%,rgba(3,6,10,0.88)_100%)]" />
              <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(10,12,16,0.82)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                Demo
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                <div className="flex flex-wrap gap-2">
                  {item.chips.slice(0, 2).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-100 backdrop-blur-md"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <h4 className="mt-3 text-lg font-semibold leading-tight text-white">{item.title}</h4>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-3.5 sm:p-4">
              <p className="text-sm leading-6 text-zinc-400">{item.description}</p>
              <div className="mt-auto pt-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition group-hover:border-cyan-400/30 group-hover:text-white">
                  {ctaLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
