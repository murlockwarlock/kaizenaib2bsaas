import Image from 'next/image';
import { ArrowUpRight, Coins } from 'lucide-react';
import { Link } from '@/i18n/routing';
import SmartPreviewVideo from '@/components/SmartPreviewVideo';
import type { EffectToolDefinition } from '@/lib/effect-tools';

type EffectPremiumItem = Pick<EffectToolDefinition, 'id' | 'href' | 'icon' | 'image' | 'exampleBefore' | 'exampleAfter'> & {
  title: string;
  description: string;
  chips: string[];
  cost: number;
};

type EffectPremiumGridProps = {
  items: EffectPremiumItem[];
  badgeLabel: string;
  ctaLabel: string;
  creditsLabel: string;
  className?: string;
};

export default function EffectPremiumGrid({
  items,
  badgeLabel,
  ctaLabel,
  creditsLabel,
  className = '',
}: EffectPremiumGridProps) {
  const getMediaKind = (src?: string) => {
    const normalized = (src || '').toLowerCase();
    if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(normalized)) return 'video';
    return 'image';
  };

  return (
    <div className={`grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`.trim()}>
      {items.map((item) => {
        const Icon = item.icon;
        const beforeKind = getMediaKind(item.exampleBefore);
        const afterKind = getMediaKind(item.exampleAfter);
        const chips = item.chips.slice(0, 2);

        return (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex h-full overflow-hidden rounded-[1.75rem] border border-white/8 text-left shadow-[0_18px_54px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-white/14"
          >
            <div className="absolute inset-0">
              {item.exampleBefore && item.exampleAfter ? (
                <div className="relative h-full w-full">
                  <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                    {beforeKind === 'video' ? (
                      <SmartPreviewVideo
                        src={item.exampleBefore}
                        preload="metadata"
                        mobileAutoPlay={true}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={item.exampleBefore}
                        alt={`${item.title} before`}
                        fill
                        sizes="(max-width: 1280px) 100vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
                    {afterKind === 'video' ? (
                      <SmartPreviewVideo
                        src={item.exampleAfter}
                        preload="metadata"
                        mobileAutoPlay={true}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={item.exampleAfter}
                        alt={`${item.title} after`}
                        fill
                        sizes="(max-width: 1280px) 100vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/45 shadow-[0_0_0_1px_rgba(0,0,0,0.28)]" />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-[rgba(8,10,14,0.82)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-100">
                    Before
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-[rgba(8,10,14,0.82)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-100">
                    After
                  </div>
                </div>
              ) : (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 1280px) 100vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,10,0.08)_0%,rgba(4,6,10,0.44)_38%,rgba(4,6,10,0.96)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_28%)]" />
            </div>

            <div className="relative flex h-full min-h-[320px] w-full flex-col p-4 sm:min-h-[344px] lg:min-h-[364px] sm:p-5">
              <div className="flex items-start justify-end">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/18 bg-[rgba(24,18,12,0.9)] px-3 py-1.5 text-sm font-semibold text-amber-300">
                  <Coins className="h-3.5 w-3.5" />
                  {item.cost}
                  <span className="text-[11px] text-amber-200/70">{creditsLabel}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap content-start gap-2">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/12 bg-[rgba(12,14,18,0.88)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-100"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/12 bg-[rgba(12,14,18,0.82)] text-white/88">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>

                <h3 className="mt-4 break-words text-[1.16rem] font-semibold leading-tight text-white sm:text-[1.3rem]">
                  {item.title}
                </h3>
                <p className="mt-2.5 line-clamp-2 max-w-md text-sm leading-[1.55] text-zinc-200/82">
                  {item.description}
                </p>
              </div>

              <div className="mt-auto pt-5">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-[rgba(255,255,255,0.12)] px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-[rgba(255,255,255,0.18)]">
                  {ctaLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
