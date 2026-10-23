'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FaApple, FaGoogle, FaVk } from 'react-icons/fa6';
import { getSocialProvidersConfig } from '@/lib/api';
import type { SocialProvidersConfig } from '@/lib/types';

type SocialAuthButtonsProps = {
    nextPath: string;
    mode: 'login' | 'register';
    className?: string;
    disabled?: boolean;
};

const PROVIDERS = [
    { id: 'google', icon: FaGoogle, className: 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]' },
    { id: 'apple', icon: FaApple, className: 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]' },
    { id: 'vk', icon: FaVk, className: 'border-[#2787F5]/35 bg-[#2787F5]/12 text-[#7eb4ff] hover:bg-[#2787F5]/18' },
] as const;

export default function SocialAuthButtons({
    nextPath,
    mode,
    className = '',
    disabled = false,
}: SocialAuthButtonsProps) {
    const locale = useLocale();
    const t = useTranslations('Auth');
    const safeNext = useMemo(() => (nextPath.startsWith('/') ? nextPath : '/dashboard'), [nextPath]);
    const [providersEnabled, setProvidersEnabled] = useState<SocialProvidersConfig | null>(null);

    useEffect(() => {
        let cancelled = false;

        getSocialProvidersConfig()
            .then((data) => {
                if (!cancelled) {
                    setProvidersEnabled(data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setProvidersEnabled({ google: false, apple: false, vk: false });
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const visibleProviders = PROVIDERS.filter((provider) => providersEnabled?.[provider.id] ?? false);

    if (providersEnabled && visibleProviders.length === 0) {
        return null;
    }

    if (!providersEnabled) {
        return null;
    }

    const handleStart = (provider: string) => {
        if (disabled) return;
        const params = new URLSearchParams({
            locale: locale === 'en' ? 'en' : 'ru',
            next: safeNext,
            mode,
        });
        window.location.href = `/api/v1/auth/oauth/${provider}/start?${params.toString()}`;
    };

    return (
        <div className={className}>
            <div className="text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                {t('social_divider')}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {visibleProviders.map((provider) => {
                    const Icon = provider.icon;
                    return (
                        <button
                            key={provider.id}
                            type="button"
                            onClick={() => handleStart(provider.id)}
                            disabled={disabled}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${provider.className} disabled:cursor-not-allowed disabled:opacity-45`}
                        >
                            <Icon className="h-4 w-4" />
                            {t(`social_${provider.id}`)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
