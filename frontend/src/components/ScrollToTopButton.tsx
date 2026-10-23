'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ScrollToTopButton() {
  const t = useTranslations('Common');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    visible ? (
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-5 right-4 z-[70] inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,107,74,0.9),rgba(34,199,184,0.86))] text-white shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-transform hover:scale-[1.03] md:bottom-6 md:right-6"
        aria-label={t('scroll_to_top')}
        title={t('scroll_to_top')}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    ) : null
  );
}
