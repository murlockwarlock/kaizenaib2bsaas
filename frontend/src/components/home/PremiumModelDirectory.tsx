'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Sparkles } from 'lucide-react';

import { Link } from '@/i18n/routing';

type DirectoryCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
  chips: string[];
};

type DirectoryGroup = {
  id: string;
  title: string;
  description: string;
  cards: DirectoryCard[];
};

type PremiumModelDirectoryProps = {
  badge: string;
  title: string;
  description: string;
  groups: DirectoryGroup[];
  ctaLabel: string;
};

function DirectoryPreview({ image, title }: { image: string; title: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,122,64,0.34),rgba(20,24,34,0.86)_42%,rgba(22,163,148,0.3))]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.16),transparent_22%)]" />
        <div className="absolute inset-x-5 bottom-5 rounded-[1.25rem] border border-white/12 bg-black/35 px-4 py-3 backdrop-blur-md">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/65">Preview</div>
          <div className="mt-1 text-base font-semibold text-white">{title}</div>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={image}
      alt={title}
      fill
      unoptimized
      sizes="(max-width: 1024px) 100vw, 33vw"
      className="object-cover transition-transform duration-700 group-hover:scale-105"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function PremiumModelDirectory({
  badge,
  title,
  description,
  groups,
  ctaLabel,
}: PremiumModelDirectoryProps) {
  return (
    <section className="home-flat-surface rounded-[2rem] px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="accent-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
            <Sparkles className="h-3.5 w-3.5 text-[#ffd166]" />
            {badge}
          </div>
          <h2 className="section-title mt-4 text-3xl text-white md:text-4xl">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base">{description}</p>
        </div>
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.id} className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{group.title}</div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{group.description}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.cards.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className="group relative overflow-hidden rounded-[1.55rem] border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,25,0.94),rgba(8,10,14,0.9))] transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_22px_48px_rgba(0,0,0,0.28)]"
                >
                  <div className="relative aspect-[16/11] overflow-hidden">
                    <DirectoryPreview image={card.image} title={card.title} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.08),rgba(5,7,11,0.34)_42%,rgba(5,7,11,0.96)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_28%)]" />
                  </div>

                  <div className="relative -mt-16 p-4 sm:p-5">
                    <div className="rounded-[1.35rem] border border-white/8 bg-[rgba(10,12,16,0.82)] p-4 backdrop-blur-xl">
                      <div className="flex flex-wrap gap-2">
                        {card.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-200"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">{card.description}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">
                        {ctaLabel}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
