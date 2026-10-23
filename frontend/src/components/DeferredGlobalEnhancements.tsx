'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';

const AppBackground = dynamic(() => import('@/components/AppBackground'), {
  ssr: false,
});

const GenerationStatusNotifier = dynamic(() => import('@/components/GenerationStatusNotifier'), {
  ssr: false,
});

const ScrollToTopButton = dynamic(() => import('@/components/ScrollToTopButton'), {
  ssr: false,
});

const CookieConsentBanner = dynamic(() => import('@/components/CookieConsentBanner'), {
  ssr: false,
});

const ProfileModerationNotice = dynamic(() => import('@/components/ProfileModerationNotice'), {
  ssr: false,
});

const GlobalGooeyButtons = dynamic(() => import('@/components/GlobalGooeyButtons'), {
  ssr: false,
});

type IdleHandle = number;

export default function DeferredGlobalEnhancements() {
  const { user } = useAuth();
  const [showEnhancements, setShowEnhancements] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      const reveal = () => {
        if (!cancelled) {
          setShowEnhancements(true);
        }
      };

      const requestIdle = (
        window as typeof window & {
          requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => IdleHandle;
        }
      ).requestIdleCallback;

      if (requestIdle) {
        requestIdle(reveal, { timeout: 900 });
        return;
      }

      timeoutId = window.setTimeout(reveal, 180);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!showEnhancements) {
    return null;
  }

  return (
    <>
      {user ? <GenerationStatusNotifier /> : null}
      <AppBackground />
      {user ? <ProfileModerationNotice /> : null}
      <GlobalGooeyButtons />
      <ScrollToTopButton />
      <CookieConsentBanner />
    </>
  );
}
