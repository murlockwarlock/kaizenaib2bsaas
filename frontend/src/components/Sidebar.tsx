'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthContext';
import { getMyBillingPlan } from '@/lib/api';
import { getUserAvatarUrl, getUserDisplayName, getUserInitials } from '@/lib/user-presenter';
import type { HeaderDropdownCard } from '@/components/sidebar/desktop-top-nav-data';
import {
    ArrowRight,
    Coins,
    Compass,
    FolderOpen,
    Heart,
    Home,
    Image,
    Layers3,
    LogOut,
    Music,
    Shield,
    Video,
} from 'lucide-react';
import type { BillingPlanStatus } from '@/lib/types';
import KaizenMark from '@/components/KaizenMark';

const DesktopTopNav = dynamic(() => import('@/components/sidebar/DesktopTopNav'));
const NotificationBell = dynamic(() => import('@/components/NotificationBell'), { ssr: false });
const VerifyEmailModal = dynamic(() => import('@/components/VerifyEmailModal').then((module) => module.VerifyEmailModal), { ssr: false });

const menuItems = [
    { key: 'home', href: '/', icon: Home },
    { key: 'explore', href: '/explore', icon: Compass },
    { key: 'ai_effects', href: '/catalog', icon: Layers3 },
    { key: 'video', href: '/video', icon: Video },
    { key: 'audio', href: '/audio?model=suno%2FV6', icon: Music },
    { key: 'images', href: '/images', icon: Image },
    { key: 'pricing', href: '/pricing', icon: Coins },
];

const userMenuItems = [
    { key: 'my_creations', href: '/my-creations', icon: FolderOpen },
    { key: 'my_likes', href: '/my-likes', icon: Heart },
];

export default function Sidebar({
    children,
    desktopTopNavData,
}: {
    children: React.ReactNode;
    desktopTopNavData: {
        imageDropdownCards: HeaderDropdownCard[];
        videoDropdownCards: HeaderDropdownCard[];
        audioDropdownCards: HeaderDropdownCard[];
    };
}) {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const { user, logout, refreshUser } = useAuth();
    const [fetchedPlanStatus, setFetchedPlanStatus] = useState<BillingPlanStatus | null>(null);
    const [isDesktopViewport, setIsDesktopViewport] = useState(false);

    const isHomeRoute = pathname === '/' || /^\/[a-z]{2}\/?$/.test(pathname);
    const isAdminRoute = pathname.includes('/admin');

    useEffect(() => {
        const media = window.matchMedia('(min-width: 1280px)');
        const syncViewport = () => setIsDesktopViewport(media.matches);
        syncViewport();
        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', syncViewport);
            return () => media.removeEventListener('change', syncViewport);
        }
        media.addListener(syncViewport);
        return () => media.removeListener(syncViewport);
    }, []);

    useEffect(() => {
        if (isHomeRoute || isAdminRoute) return;
        if (!user) return;

        getMyBillingPlan().then(setFetchedPlanStatus).catch(() => setFetchedPlanStatus(null));
    }, [isAdminRoute, isHomeRoute, user]);

    if (isAdminRoute) {
        return <>{children}</>;
    }

    const isActive = (href: string) => {
        const cleanHref = href.split('?')[0];
        if (cleanHref === '/') return pathname.endsWith('/') || pathname.match(/^\/[a-z]{2}$/);
        return pathname.includes(cleanHref);
    };

    const planStatus = user ? fetchedPlanStatus : null;
    const currentPlan = planStatus?.current_plan ?? null;
    const nextPlan = planStatus?.next_plan ?? null;
    const currentPlanName = currentPlan ? (locale === 'ru' ? currentPlan.name_ru : currentPlan.name_en) : null;
    const nextPlanName = nextPlan ? (locale === 'ru' ? nextPlan.name_ru : nextPlan.name_en) : null;
    const displayName = user ? getUserDisplayName(user) : '';
    const avatarUrl = user ? getUserAvatarUrl(user) : null;
    const initials = user ? getUserInitials(user) : 'G';

    const desktopHeader = () => (
        <header className="panel-surface sticky top-4 z-30 mx-6 mt-4 rounded-[2rem] px-5 py-3">
            <div className="flex min-w-0 items-center justify-between gap-4">
                <Link href="/" className="flex shrink-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] shadow-[0_16px_40px_rgba(255,107,74,0.22)]">
                        <KaizenMark className="h-5 w-5 text-white" />
                    </div>
                    <div className="font-display text-[1.05rem] text-white">KaizenAI</div>
                </Link>

                {isDesktopViewport ? (
                    <DesktopTopNav
                        pathname={pathname}
                        locale={locale}
                        showUserLinks={Boolean(user)}
                        imageDropdownCards={desktopTopNavData.imageDropdownCards}
                        videoDropdownCards={desktopTopNavData.videoDropdownCards}
                        audioDropdownCards={desktopTopNavData.audioDropdownCards}
                    />
                ) : <div className="flex-1" />}

                <div className="flex shrink-0 items-center gap-3">
                    {user ? <NotificationBell mode="desktop" /> : null}

                    <div className="flex items-center overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]">
                        <button
                            onClick={() => router.replace(pathname || '/', { locale: 'en' })}
                            className={`px-2.5 py-1.5 text-[10px] font-bold tracking-[0.2em] transition-colors ${locale === 'en' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            EN
                        </button>
                        <div className="h-3 w-px bg-white/10" />
                        <button
                            onClick={() => router.replace(pathname || '/', { locale: 'ru' })}
                            className={`px-2.5 py-1.5 text-[10px] font-bold tracking-[0.2em] transition-colors ${locale === 'ru' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            RU
                        </button>
                    </div>

                    {user ? (
                        <>
                            <div className="hidden lg:flex items-center rounded-full border border-white/8 bg-white/[0.04] pr-1.5">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-white/[0.03]"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] text-xs font-semibold text-white">
                                        {avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <span className="max-w-[8rem] truncate text-sm font-medium text-white">{displayName}</span>
                                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                                        <Coins className="h-3 w-3 text-[#ffd166]" />
                                        {user.balance ?? 0}
                                    </span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                                    title={t('logout')}
                                    aria-label={t('logout')}
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,74,0.22)] transition-all duration-200 hover:translate-y-[-1px]"
                        >
                            {t('sign_in')}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );

    const mobileHeader = () => (
        <header className="panel-surface sticky top-3 z-30 mx-3 mt-3 rounded-[1.5rem] px-3 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
                <Link href="/" className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] shadow-[0_12px_28px_rgba(255,107,74,0.22)]">
                        <KaizenMark className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="font-display truncate text-[1rem] text-white">KaizenAI</div>
                </Link>

                <div className="flex items-center gap-2">
                    {user && !isDesktopViewport ? <NotificationBell compact mode="mobile" /> : null}

                    <div className="flex items-center overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]">
                        <button
                            onClick={() => router.replace(pathname || '/', { locale: 'en' })}
                            className={`px-2 py-1 text-[10px] font-bold tracking-[0.18em] transition-colors ${locale === 'en' ? 'bg-white/[0.08] text-white' : 'text-zinc-500'}`}
                        >
                            EN
                        </button>
                        <div className="h-3 w-px bg-white/10" />
                        <button
                            onClick={() => router.replace(pathname || '/', { locale: 'ru' })}
                            className={`px-2 py-1 text-[10px] font-bold tracking-[0.18em] transition-colors ${locale === 'ru' ? 'bg-white/[0.08] text-white' : 'text-zinc-500'}`}
                        >
                            RU
                        </button>
                    </div>

                    {user ? (
                        <>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1.5"
                            >
                                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] text-[10px] font-semibold text-white">
                                    {avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                                    <Coins className="h-3 w-3 text-[#ffd166]" />
                                    {user.balance ?? 0}
                                </span>
                            </Link>
                            <button
                                type="button"
                                onClick={logout}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                                title={t('logout')}
                                aria-label={t('logout')}
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-3 py-2 text-xs font-semibold text-white"
                        >
                            {t('sign_in')}
                        </Link>
                    )}
                </div>
            </div>

            <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                                active ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {t(item.key)}
                        </Link>
                    );
                })}
                {userMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                                active ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {t(item.key)}
                        </Link>
                    );
                })}
                {user?.is_superuser ? (
                    <Link
                        href="/admin"
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                            isActive('/admin') ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                        }`}
                    >
                        <Shield className="h-3.5 w-3.5" />
                        {t('admin')}
                    </Link>
                ) : null}
                {user ? (
                    <button
                        onClick={logout}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {t('logout')}
                    </button>
                ) : null}
            </div>

            {user && currentPlan ? (
                <div className="mt-3 flex items-center justify-between rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-3 py-2.5">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{currentPlanName}</div>
                        <div className="truncate text-[11px] text-zinc-500">
                            {currentPlan.currency_symbol}{currentPlan.price} · {currentPlan.credits} {t('credits')}
                        </div>
                    </div>
                    <Link
                        href="/pricing"
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
                    >
                        {nextPlanName ? t('upgrade_to', { plan: nextPlanName }) : t('pricing')}
                    </Link>
                </div>
            ) : null}
        </header>
    );

    return (
        <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-transparent">
            {user && !user.is_verified && (
                <VerifyEmailModal
                    email={user.email}
                    onSuccess={refreshUser}
                />
            )}

            {!isHomeRoute && (
                <>
                    <div className="hidden xl:block">
                        {desktopHeader()}
                    </div>
                    <div className="xl:hidden">
                        {mobileHeader()}
                    </div>
                </>
            )}

            <main className="flex flex-1 flex-col overflow-auto">
                <div className="min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
