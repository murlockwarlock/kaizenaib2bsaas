'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useVisualEffects } from '@/components/VisualEffectsContext';

type BackgroundPerformanceMode = 'full' | 'lite' | 'static';

const LiquidChrome = dynamic(() => import('@/components/ui/liquid-chrome'), {
  ssr: false,
});

export default function AppBackground() {
  const { liquidChromeEnabled } = useVisualEffects();
  const [mode, setMode] = useState<BackgroundPerformanceMode>('static');
  const [webglFailed, setWebglFailed] = useState(false);
  const [disableOnMobile, setDisableOnMobile] = useState(false);
  const [disableEffects, setDisableEffects] = useState(false);

  useEffect(() => {
    const tabletQuery = window.matchMedia('(max-width: 1180px)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resolveMode = () => {
      const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      const hardwareThreads = navigator.hardwareConcurrency ?? 8;
      const saveData = Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
      );
      const tabletLike = tabletQuery.matches || coarsePointerQuery.matches;
      const lowPowerDevice = deviceMemory <= 6 || hardwareThreads <= 6;
      const veryLowPowerDevice = deviceMemory <= 4 || hardwareThreads <= 4;

      setDisableOnMobile(tabletLike);
      setDisableEffects(saveData || reducedMotionQuery.matches || veryLowPowerDevice);

      if (saveData || reducedMotionQuery.matches || veryLowPowerDevice || (tabletLike && lowPowerDevice)) {
        setMode('static');
        return;
      }

      if (tabletLike || lowPowerDevice) {
        setMode('lite');
        return;
      }

      setMode('full');
    };

    resolveMode();

    tabletQuery.addEventListener('change', resolveMode);
    coarsePointerQuery.addEventListener('change', resolveMode);
    reducedMotionQuery.addEventListener('change', resolveMode);
    window.addEventListener('resize', resolveMode);

    return () => {
      tabletQuery.removeEventListener('change', resolveMode);
      coarsePointerQuery.removeEventListener('change', resolveMode);
      reducedMotionQuery.removeEventListener('change', resolveMode);
      window.removeEventListener('resize', resolveMode);
    };
  }, []);

  if (!liquidChromeEnabled || disableOnMobile || disableEffects) {
    return null;
  }

  const showAnimatedChrome = mode !== 'static' && !webglFailed;
  const isLiteMode = mode === 'lite';

  return (
    <div className={`pointer-events-none fixed inset-[-1px] z-[-13] overflow-hidden ${isLiteMode ? 'opacity-70' : 'opacity-85'}`}>
      {showAnimatedChrome ? (
        <div className="app-liquid-chrome-shell">
          <LiquidChrome
            className="absolute inset-0 h-full w-full"
            baseColor={[0.025, 0.04, 0.065]}
            accentColor={[1.0, 0.42, 0.29]}
            sheenColor={[0.13, 0.78, 0.72]}
            speed={isLiteMode ? 0.2 : 0.28}
            amplitude={isLiteMode ? 0.16 : 0.22}
            frequencyX={isLiteMode ? 2.25 : 3.0}
            frequencyY={isLiteMode ? 1.48 : 1.92}
            interactive={!isLiteMode}
            antialias={!isLiteMode}
            dprCap={1}
            renderScale={isLiteMode ? 0.74 : 0.92}
            targetFps={isLiteMode ? 24 : 40}
            pauseWhenHidden={true}
            onError={() => {
              setWebglFailed(true);
              setMode('static');
            }}
          />
        </div>
      ) : null}
      <div className={`absolute inset-[-8%] ${isLiteMode
        ? 'bg-[radial-gradient(circle_at_18%_18%,rgba(255,107,74,0.06),transparent_22%),radial-gradient(circle_at_78%_16%,rgba(34,199,184,0.06),transparent_24%),linear-gradient(180deg,rgba(6,7,10,0.06),rgba(6,7,10,0.18))]'
        : 'bg-[radial-gradient(circle_at_14%_20%,rgba(255,107,74,0.08),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(34,199,184,0.08),transparent_28%),linear-gradient(180deg,rgba(6,7,10,0.08),rgba(6,7,10,0.2))]'
      }`} />
      <div className={`absolute inset-0 ${isLiteMode
        ? 'bg-[linear-gradient(180deg,rgba(6,7,10,0.1),rgba(6,7,10,0.18))]'
        : 'bg-[radial-gradient(circle_at_center,transparent_48%,rgba(6,7,10,0.12)_100%)]'
      }`} />
    </div>
  );
}
