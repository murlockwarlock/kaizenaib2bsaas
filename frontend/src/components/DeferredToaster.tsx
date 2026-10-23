"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const LazyToaster = dynamic(
  () => import('sonner').then((module) => module.Toaster),
  { ssr: false }
);

export default function DeferredToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const enable = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    const idle = window.requestIdleCallback;

    if (typeof idle === 'function') {
      const handle = idle(enable, { timeout: 1500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(handle);
      };
    }

    const timer = window.setTimeout(enable, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <LazyToaster position="top-right" theme="dark" richColors closeButton />;
}
