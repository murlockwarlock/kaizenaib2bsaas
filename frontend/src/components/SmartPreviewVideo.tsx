'use client';

import { useEffect, useRef, useState } from 'react';
import { getVideoPoster } from '@/lib/video-posters';

type SmartPreviewVideoProps = {
  src: string;
  className?: string;
  preload?: 'none' | 'metadata' | 'auto';
  poster?: string;
  mobileAutoPlay?: boolean;
  loop?: boolean;
  onError?: () => void;
};

export default function SmartPreviewVideo({
  src,
  className = '',
  preload = 'metadata',
  poster,
  mobileAutoPlay = true,
  loop = true,
  onError,
}: SmartPreviewVideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncFlags = () => {
      setIsMobile(mobileQuery.matches);
      setReduceMotion(motionQuery.matches);
      setSaveData(Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData));
    };

    syncFlags();
    mobileQuery.addEventListener('change', syncFlags);
    motionQuery.addEventListener('change', syncFlags);

    return () => {
      mobileQuery.removeEventListener('change', syncFlags);
      motionQuery.removeEventListener('change', syncFlags);
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.pause();
    node.load();
  }, [isInView, src]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const allowPlayback = isInView && !reduceMotion && !saveData && (!isMobile || mobileAutoPlay);
    const playVideo = () => {
      const playPromise = node.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };

    if (allowPlayback) {
      playVideo();
      node.addEventListener('loadeddata', playVideo);
      return () => {
        node.removeEventListener('loadeddata', playVideo);
      };
    }

    node.pause();
  }, [isInView, isMobile, mobileAutoPlay, reduceMotion, saveData, src]);

  return (
    <video
      ref={ref}
      src={isInView ? src : undefined}
      poster={poster || getVideoPoster(src)}
      muted
      loop={loop}
      playsInline
      preload={isInView ? preload : 'none'}
      className={className}
      onError={onError}
    />
  );
}
