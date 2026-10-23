'use client';

import { useEffect, useRef } from 'react';

import styles from '@/components/GlobalGooeyButtons.module.css';

const COLOR_TOKENS = [
  'var(--accent-primary)',
  'var(--accent-secondary)',
  'var(--accent-tertiary)',
  'rgba(255, 255, 255, 0.95)',
];

const COLOR_INDEXES = [0, 1, 2, 0, 1, 2, 0, 3];

function noise(n = 1) {
  return n / 2 - Math.random() * n;
}

function getXY(distance: number, pointIndex: number, totalPoints: number): [number, number] {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
}

type ParticleConfig = {
  start: [number, number];
  end: [number, number];
  time: number;
  scale: number;
  color: string;
  rotate: number;
};

function createParticle(i: number, total: number, duration: number, distances: [number, number], radius: number): ParticleConfig {
  const rotate = noise(radius / 9);

  return {
    start: getXY(distances[0], total - i, total),
    end: getXY(distances[1] + noise(7), total - i, total),
    time: duration,
    scale: 1 + noise(0.24),
    color: COLOR_TOKENS[COLOR_INDEXES[Math.floor(Math.random() * COLOR_INDEXES.length)]],
    rotate: rotate > 0 ? (rotate + radius / 20) * 10 : (rotate - radius / 20) * 10,
  };
}

export default function GlobalGooeyButtons() {
  const cleanupRef = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const activeBursts = cleanupRef.current;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const hardwareThreads = navigator.hardwareConcurrency ?? 8;
    const saveData = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );
    const lowPowerDevice = deviceMemory <= 6 || hardwareThreads <= 6;
    const mediumPowerDevice = deviceMemory <= 8 || hardwareThreads <= 8;

    if (coarsePointerQuery.matches || saveData || lowPowerDevice) {
      return undefined;
    }

    const removeBurst = (overlay: HTMLElement) => {
      activeBursts.delete(overlay);
      overlay.remove();
    };

    const handleClick = (event: MouseEvent) => {
      if (reducedMotionQuery.matches) {
        return;
      }

      const target = (event.target as Element | null)?.closest('button, [role="button"]');
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.dataset.gooey === 'false' || target.dataset.state === 'open') {
        return;
      }

      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') {
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) {
        return;
      }

      if (activeBursts.size > 0) {
        return;
      }

      const particleCount = mediumPowerDevice ? 8 : 14;
      const animationTime = mediumPowerDevice ? 520 : 620;
      const timeVariance = mediumPowerDevice ? 140 : 220;
      const particleDistances: [number, number] = [
        Math.min(Math.max(rect.width * 0.44, 26), 92),
        Math.min(Math.max(rect.width * 0.12, 8), 22),
      ];
      const particleRadius = Math.min(Math.max(Math.max(rect.width, rect.height), 42), 120);

      const overlay = document.createElement('span');
      overlay.className = styles.burst;
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;

      document.body.appendChild(overlay);
      activeBursts.add(overlay);

      for (let i = 0; i < particleCount; i += 1) {
        const duration = animationTime + noise(timeVariance * 2);
        const particleConfig = createParticle(i, particleCount, duration, particleDistances, particleRadius);

        window.setTimeout(() => {
          if (!overlay.isConnected) {
            return;
          }

          const particle = document.createElement('span');
          const point = document.createElement('span');

          particle.className = styles.particle;
          point.className = styles.point;

          particle.style.setProperty('--start-x', `${particleConfig.start[0]}px`);
          particle.style.setProperty('--start-y', `${particleConfig.start[1]}px`);
          particle.style.setProperty('--end-x', `${particleConfig.end[0]}px`);
          particle.style.setProperty('--end-y', `${particleConfig.end[1]}px`);
          particle.style.setProperty('--time', `${particleConfig.time}ms`);
          particle.style.setProperty('--scale', `${particleConfig.scale}`);
          particle.style.setProperty('--color', particleConfig.color);
          particle.style.setProperty('--rotate', `${particleConfig.rotate}deg`);

          particle.appendChild(point);
          overlay.appendChild(particle);

          window.requestAnimationFrame(() => {
            overlay.classList.add(styles.active);
          });

          window.setTimeout(() => {
            particle.remove();
          }, particleConfig.time + 40);
        }, 18);
      }

      window.setTimeout(() => {
        removeBurst(overlay);
      }, animationTime + timeVariance + 420);
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      activeBursts.forEach((overlay) => removeBurst(overlay));
      activeBursts.clear();
    };
  }, []);

  return null;
}
