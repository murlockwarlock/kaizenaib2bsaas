'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { Pause, Play, ArrowUpRight, Music2 } from 'lucide-react';
import { getModelDisplayName } from '@/lib/model-presenter';
import { getAudioCover } from '@/lib/audio-covers';
import { Link } from '@/i18n/routing';
import type { FeaturedAudio } from '@/lib/types';
import { useFeaturedAudioPlayer } from '@/components/FeaturedAudioPlayerContext';

type FeaturedAudioPlayerProps = {
  item: FeaturedAudio;
  playlist: FeaturedAudio[];
  usePromptLabel: string;
  playLabel: string;
  pauseLabel: string;
  promptLabel: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function FeaturedAudioPlayer({
  item,
  playlist,
  usePromptLabel,
  playLabel,
  pauseLabel,
  promptLabel,
}: FeaturedAudioPlayerProps) {
  const { isPlaying, currentTime, duration, toggleTrack, seek, isCurrentTrack } = useFeaturedAudioPlayer();
  const isActive = isCurrentTrack(item.id);
  const playlistIndex = playlist.findIndex((track) => track.id === item.id);
  const coverImage = item.cover_image_url || getAudioCover(playlistIndex >= 0 ? playlistIndex : item.id);
  const displayCurrentTime = isActive ? currentTime : 0;
  const displayDuration = isActive ? duration : 0;

  const usePromptHref = useMemo(() => {
    const params = new URLSearchParams();
    if (item.model) params.set('model', item.model);
    if (item.prompt) params.set('prompt', item.prompt);
    return `/audio?${params.toString()}`;
  }, [item.model, item.prompt]);

  const togglePlayback = () => {
    toggleTrack(item, playlist);
  };

  const handleSeek = (value: string) => {
    const nextTime = Number(value);
    if (!isActive) return;
    seek(nextTime);
  };

  return (
    <div className={`group relative overflow-hidden rounded-[1.8rem] border bg-[linear-gradient(180deg,rgba(16,18,24,0.94),rgba(8,10,14,0.92))] p-4 transition-colors ${isActive ? 'border-[#ff8d68]/30 shadow-[0_24px_56px_rgba(255,107,74,0.12)]' : 'border-white/10'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.12),transparent_30%)] opacity-90" />
      <div className="relative flex flex-col gap-4 sm:flex-row">
        <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-[1.25rem] border border-white/8 bg-zinc-950 sm:h-28 sm:w-28 sm:rounded-[1.35rem]">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={item.title}
              fill
              unoptimized
              loader={({ src }) => src}
              sizes="(max-width: 640px) 100vw, 112px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,107,74,0.22),rgba(34,199,184,0.22))]">
              <Music2 className="h-9 w-9 text-white/80" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                {getModelDisplayName(item.model)}
              </div>
              <h3 className="mt-2 truncate text-lg font-semibold text-white">{item.title}</h3>
              {item.subtitle ? <p className="mt-1 truncate text-sm text-[#ffd166]">{item.subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white transition-all hover:border-white/20 hover:bg-white/[0.09]"
              aria-label={isActive && isPlaying ? pauseLabel : playLabel}
            >
              {isActive && isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="ml-0.5 h-4.5 w-4.5" />}
            </button>
          </div>

          {item.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
          ) : null}

          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={displayDuration || 0}
              step={0.1}
              value={Math.min(displayCurrentTime, displayDuration || 0)}
              onChange={(e) => handleSeek(e.target.value)}
              disabled={!isActive || displayDuration <= 0}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#ff8d68] disabled:cursor-default disabled:opacity-60"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{formatTime(displayCurrentTime)}</span>
              <span>{formatTime(displayDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {item.prompt ? (
        <div className="relative mt-4 rounded-[1.25rem] border border-white/8 bg-black/20 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{promptLabel}</div>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-300">{item.prompt}</p>
        </div>
      ) : null}

      <div className="relative mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
        >
          {isActive && isPlaying ? pauseLabel : playLabel}
        </button>
        <Link
          href={usePromptHref}
          className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.18)]"
        >
          {usePromptLabel}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
