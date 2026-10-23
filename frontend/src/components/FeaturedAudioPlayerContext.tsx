'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { getModelDisplayName } from '@/lib/model-presenter';
import { getAudioCover } from '@/lib/audio-covers';
import type { FeaturedAudio } from '@/lib/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';

type FeaturedAudioPlayerContextValue = {
  currentTrack: FeaturedAudio | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playlist: FeaturedAudio[];
  isCurrentTrack: (trackId: number) => boolean;
  toggleTrack: (track: FeaturedAudio, playlist?: FeaturedAudio[]) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  closePlayer: () => void;
};

const FeaturedAudioPlayerContext = createContext<FeaturedAudioPlayerContextValue | null>(null);

function normalizePlaylist(track: FeaturedAudio, playlist?: FeaturedAudio[]) {
  const input = playlist && playlist.length > 0 ? playlist : [track];
  const seen = new Set<number>();
  const deduped = input.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  if (!deduped.some((item) => item.id === track.id)) {
    deduped.unshift(track);
  }

  return deduped;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

type EqualizerBarStyle = CSSProperties & {
  '--eq-base': string;
  '--eq-peak': string;
  '--eq-duration': string;
  '--eq-delay': string;
};

const EQUALIZER_BARS: EqualizerBarStyle[] = Array.from({ length: 34 }, (_, index) => {
  const base = 16 + ((index * 7) % 18);
  const peak = base + 20 + ((index * 11) % 34);
  const duration = 1.35 + ((index * 5) % 9) / 10;
  const delay = -1 * (((index * 3) % 12) / 10);

  return {
    '--eq-base': `${base}%`,
    '--eq-peak': `${Math.min(peak, 84)}%`,
    '--eq-duration': `${duration}s`,
    '--eq-delay': `${delay}s`,
  };
});

function AudioEqualizerBackdrop({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className={`audio-equalizer-backdrop ${isPlaying ? 'is-playing' : 'is-idle'}`} aria-hidden="true">
      <div className="audio-equalizer-grid">
        {EQUALIZER_BARS.map((style, index) => (
          <span
            key={index}
            className="audio-equalizer-bar"
            style={style}
          />
        ))}
      </div>
    </div>
  );
}

function GlobalAudioMiniPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  hasPrevious,
  hasNext,
  onTogglePlayback,
  onSeek,
  onVolumeChange,
  onPrevious,
  onNext,
  onClose,
}: {
  currentTrack: FeaturedAudio;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onTogglePlayback: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('GlobalAudioPlayer');
  const coverImage = currentTrack.cover_image_url || getAudioCover(currentTrack.id);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] lg:left-[316px] lg:right-6">
      <div className="pointer-events-auto relative isolate overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,16,0.88),rgba(7,9,13,0.86))] shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
        <AudioEqualizerBackdrop isPlaying={isPlaying} />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.1),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.09),transparent_28%)]" />
        <div className="relative z-[2] flex flex-col gap-4 p-4 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-zinc-950">
              <Image
                src={coverImage}
                alt={currentTrack.title}
                fill
                unoptimized
                loader={({ src }) => src}
                sizes="56px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                {t('now_playing')}
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-white md:text-base">{currentTrack.title}</div>
              <div className="mt-0.5 truncate text-xs text-zinc-400">{getModelDisplayName(currentTrack.model)}</div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={t('previous')}
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onTogglePlayback}
                className="inline-flex h-10 min-w-[116px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(255,107,74,0.2)]"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                {isPlaying ? t('pause') : t('play')}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={t('next')}
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {currentTrack.prompt ? (
                <Link
                  href={`/audio?${new URLSearchParams({
                    ...(currentTrack.model ? { model: currentTrack.model } : {}),
                    ...(currentTrack.prompt ? { prompt: currentTrack.prompt } : {}),
                  }).toString()}`}
                  className="ml-auto hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white md:inline-flex"
                >
                  {t('use_prompt')}
                </Link>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                aria-label={t('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-[11px] text-zinc-500">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#ff8d68]"
                aria-label={t('progress')}
              />
              <span className="w-10 shrink-0 text-right text-[11px] text-zinc-500">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:w-[172px] md:justify-end">
            {volume <= 0.01 ? <VolumeX className="h-4 w-4 text-zinc-500" /> : <Volume2 className="h-4 w-4 text-zinc-500" />}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#22c7b8]"
              aria-label={t('volume')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedAudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoplayRef = useRef(false);
  const [playlist, setPlaylist] = useState<FeaturedAudio[]>([]);
  const [currentTrack, setCurrentTrack] = useState<FeaturedAudio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.82);

  const currentIndex = useMemo(
    () => (currentTrack ? playlist.findIndex((track) => track.id === currentTrack.id) : -1),
    [currentTrack, playlist]
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < playlist.length - 1;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < playlist.length) {
        shouldAutoplayRef.current = true;
        setCurrentTrack(playlist[nextIndex]);
        return;
      }

      audio.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    audio.src = currentTrack.audio_url;
    audio.load();

    if (shouldAutoplayRef.current) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    }

    shouldAutoplayRef.current = false;
  }, [currentTrack]);

  const playWithQueue = useCallback((track: FeaturedAudio, nextPlaylist?: FeaturedAudio[]) => {
    shouldAutoplayRef.current = true;
    setCurrentTime(0);
    setDuration(0);
    setPlaylist(normalizePlaylist(track, nextPlaylist));
    setCurrentTrack(track);
  }, []);

  const toggleTrack = useCallback(
    (track: FeaturedAudio, nextPlaylist?: FeaturedAudio[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (currentTrack?.id === track.id) {
        if (audio.paused) {
          void audio.play().catch(() => {
            setIsPlaying(false);
          });
          return;
        }

        audio.pause();
        return;
      }

      playWithQueue(track, nextPlaylist);
    },
    [currentTrack?.id, playWithQueue]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, [currentTrack]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    setVolumeState(nextVolume);
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setPlaylist([]);
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  const nextTrack = useCallback(() => {
    if (!hasNext) return;
    const next = playlist[currentIndex + 1];
    if (!next) return;
    playWithQueue(next, playlist);
  }, [currentIndex, hasNext, playWithQueue, playlist]);

  const previousTrack = useCallback(() => {
    if (!hasPrevious) return;
    const previous = playlist[currentIndex - 1];
    if (!previous) return;
    playWithQueue(previous, playlist);
  }, [currentIndex, hasPrevious, playWithQueue, playlist]);

  const value = useMemo<FeaturedAudioPlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      playlist,
      isCurrentTrack: (trackId: number) => currentTrack?.id === trackId,
      toggleTrack,
      seek,
      setVolume,
      pause,
      resume,
      nextTrack,
      previousTrack,
      closePlayer,
    }),
    [closePlayer, currentTime, currentTrack, duration, isPlaying, nextTrack, pause, playlist, previousTrack, resume, seek, setVolume, toggleTrack, volume]
  );

  return (
    <FeaturedAudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
      {currentTrack ? (
        <GlobalAudioMiniPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onTogglePlayback={() => {
            if (isPlaying) {
              pause();
              return;
            }
            resume();
          }}
          onSeek={seek}
          onVolumeChange={setVolume}
          onPrevious={previousTrack}
          onNext={nextTrack}
          onClose={closePlayer}
        />
      ) : null}
    </FeaturedAudioPlayerContext.Provider>
  );
}

export function useFeaturedAudioPlayer() {
  const context = useContext(FeaturedAudioPlayerContext);
  if (!context) {
    throw new Error('useFeaturedAudioPlayer must be used within FeaturedAudioPlayerProvider');
  }
  return context;
}
