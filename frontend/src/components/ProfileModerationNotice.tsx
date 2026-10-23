'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';

export default function ProfileModerationNotice() {
    const { user } = useAuth();
    const pathname = usePathname();
    const notice = user?.moderation_notice || null;

    const shouldShow = useMemo(() => {
        if (!user?.moderation_required || !notice) return false;
        return !pathname.includes('/login') && !pathname.includes('/register');
    }, [notice, pathname, user]);

    if (!shouldShow) return null;

    return (
        <div className="fixed left-1/2 top-4 z-[70] w-[min(92vw,720px)] -translate-x-1/2">
            <div className="rounded-2xl border border-red-500/20 bg-[linear-gradient(135deg,rgba(60,10,10,0.96),rgba(24,12,12,0.94))] p-4 shadow-2xl shadow-black/40">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/14 text-red-300">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white">Нужно обновить профиль</div>
                        <p className="mt-1 text-sm leading-6 text-zinc-300">{notice}</p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.08]"
                    >
                        Открыть профиль
                    </Link>
                </div>
            </div>
        </div>
    );
}
