'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { claimPlanInvite, resolvePlanInvite } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react';

type ResolveState = {
    email: string;
    pricing_plan_id: number;
    plan_name_ru: string;
    plan_name_en: string;
    expires_at: string | null;
    status: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'detail' in error.response.data &&
        typeof error.response.data.detail === 'string'
    ) {
        return error.response.data.detail;
    }

    return fallback;
};

export default function ClaimInvitePage() {
    const t = useTranslations('Auth');
    const locale = useLocale();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const { user, isLoading: authLoading, refreshUser } = useAuth();

    const [invite, setInvite] = useState<ResolveState | null>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState('');
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        if (!token) {
            setError(t('claim_missing_token'));
            setLoading(false);
            return;
        }

        let cancelled = false;
        resolvePlanInvite(token)
            .then((data) => {
                if (!cancelled) {
                    setInvite(data);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(getErrorMessage(err, t('claim_invalid')));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token, t]);

    const nextPath = useMemo(() => `/claim?token=${encodeURIComponent(token)}`, [token]);
    const invitedPlanName = invite ? (locale === 'ru' ? invite.plan_name_ru : invite.plan_name_en) : '';
    const emailMatches = user && invite ? user.email.trim().toLowerCase() === invite.email.trim().toLowerCase() : false;

    const handleClaim = async () => {
        if (!token) return;
        setClaiming(true);
        setError('');
        try {
            await claimPlanInvite(token);
            await refreshUser();
            setClaimed(true);
        } catch (err) {
            setError(getErrorMessage(err, t('claim_error')));
        } finally {
            setClaiming(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/4 -left-20 h-[340px] w-[340px] rounded-full bg-violet-600/15 blur-[120px]" />
            <div className="absolute bottom-1/4 -right-20 h-[340px] w-[340px] rounded-full bg-cyan-600/15 blur-[120px]" />

            <div className="w-full max-w-[560px] relative z-10 rounded-[2rem] border border-white/10 bg-zinc-950/75 p-8 shadow-2xl shadow-black/40">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/20">
                    <Sparkles className="h-7 w-7 text-white" />
                </div>

                <h1 className="mt-6 text-3xl font-semibold text-white">{t('claim_title')}</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{t('claim_subtitle')}</p>

                {loading || authLoading ? (
                    <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-zinc-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('claim_loading')}
                    </div>
                ) : error ? (
                    <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-300">
                        {error}
                    </div>
                ) : invite ? (
                    <>
                        <div className="mt-8 rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{t('claim_invite_label')}</div>
                            <div className="mt-3 text-xl font-semibold text-white">{invitedPlanName}</div>
                            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                                <Mail className="h-4 w-4 text-violet-300" />
                                {invite.email}
                            </div>
                            {invite.expires_at ? (
                                <div className="mt-3 text-xs text-zinc-500">
                                    {t('claim_expires_at', { date: new Date(invite.expires_at).toLocaleString() })}
                                </div>
                            ) : null}
                        </div>

                        {claimed ? (
                            <div className="mt-6 rounded-[1.6rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                                    <div>
                                        <div className="text-base font-semibold text-white">{t('claim_success_title')}</div>
                                        <p className="mt-2 text-sm leading-6 text-emerald-100/85">{t('claim_success_desc')}</p>
                                        <Link href="/dashboard" className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09]">
                                            {t('claim_go_dashboard')}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : !user ? (
                            <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                                <div className="text-base font-semibold text-white">{t('claim_sign_in_title')}</div>
                                <p className="mt-2 text-sm leading-6 text-zinc-400">{t('claim_sign_in_desc')}</p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="inline-flex rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400">
                                        {t('login_button')}
                                    </Link>
                                    <Link href={`/register?next=${encodeURIComponent(nextPath)}`} className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]">
                                        {t('register_button')}
                                    </Link>
                                </div>
                            </div>
                        ) : emailMatches ? (
                            <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                                <div className="text-base font-semibold text-white">{t('claim_ready_title')}</div>
                                <p className="mt-2 text-sm leading-6 text-zinc-400">{t('claim_ready_desc')}</p>
                                <button
                                    type="button"
                                    onClick={handleClaim}
                                    disabled={claiming}
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:opacity-60"
                                >
                                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {t('claim_activate')}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-6 rounded-[1.6rem] border border-amber-500/20 bg-amber-500/10 p-5">
                                <div className="text-base font-semibold text-white">{t('claim_wrong_email_title')}</div>
                                <p className="mt-2 text-sm leading-6 text-amber-100/80">
                                    {t('claim_wrong_email_desc', { email: invite.email, currentEmail: user.email })}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]">
                                        {t('claim_switch_account')}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}
