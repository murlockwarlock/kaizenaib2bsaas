'use client';

import React from 'react';
import { AudioWaveform, Disc3 } from 'lucide-react';

type AudioShowcaseCardProps = {
  title: string;
  subtitle?: string;
  prompt?: string | null;
  audioUrl?: string | null;
  compact?: boolean;
  showControls?: boolean;
  autoPlay?: boolean;
  className?: string;
};

function joinClassNames(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ');
}

const BAR_HEIGHTS = [28, 44, 24, 56, 34, 62, 40, 52, 26, 48, 30, 60];

export default function AudioShowcaseCard({
  title,
  subtitle,
  prompt,
  audioUrl,
  compact = false,
  showControls = true,
  autoPlay = false,
  className,
}: AudioShowcaseCardProps) {
  return (
    <div
      className={joinClassNames(
        'relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,25,0.96),rgba(8,11,16,0.92))] shadow-[0_24px_50px_rgba(0,0,0,0.24)]',
        compact ? 'min-h-[170px]' : 'min-h-[220px]',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.16),transparent_30%)]" />

      <div className={joinClassNames('relative flex h-full flex-col', compact ? 'p-4' : 'p-5')}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              <AudioWaveform className="h-3.5 w-3.5 text-[#22c7b8]" />
              Audio
            </div>
            <h3 className={joinClassNames('mt-2 truncate font-semibold text-white', compact ? 'text-base' : 'text-lg')}>
              {title}
            </h3>
            {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
          </div>

          <div className={joinClassNames('flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-[#ffd166]', compact ? 'h-10 w-10' : 'h-11 w-11')}>
            <Disc3 className={joinClassNames(compact ? 'h-4.5 w-4.5' : 'h-5 w-5')} />
          </div>
        </div>

        <div className={joinClassNames('flex items-end gap-1.5 rounded-[1.35rem] border border-white/8 bg-black/15', compact ? 'h-[76px] px-3 py-3' : 'h-[92px] px-4 py-3')}>
          {BAR_HEIGHTS.map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-full bg-[linear-gradient(180deg,rgba(255,107,74,0.92),rgba(34,199,184,0.7))] opacity-90"
              style={{ height: compact ? Math.max(16, Math.round(height * 0.72)) : height }}
            />
          ))}
        </div>

        {prompt ? (
          <p className={joinClassNames('mt-4 line-clamp-3 leading-relaxed text-zinc-300', compact ? 'text-xs' : 'text-sm')}>
            {prompt}
          </p>
        ) : null}

        {showControls && audioUrl ? (
          <div className="mt-4">
            <audio src={audioUrl} controls autoPlay={autoPlay} className="w-full" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
