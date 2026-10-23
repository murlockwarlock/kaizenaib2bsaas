'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Mail, KeyRound, Lock, ArrowRight, Loader2 } from 'lucide-react';
import KaizenMark from '@/components/KaizenMark';
import { requestPasswordReset, resetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
    const t = useTranslations('Auth');

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setNotice('');
        setRequestLoading(true);

        try {
            await requestPasswordReset(email);
            setNotice(t('reset_sent'));
        } catch {
            setError(t('reset_error'));
        } finally {
            setRequestLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setNotice('');
        setConfirmLoading(true);

        try {
            await resetPassword(email, code, newPassword);
            setNotice(t('reset_success'));
            setCode('');
            setNewPassword('');
        } catch {
            setError(t('reset_error'));
        } finally {
            setConfirmLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
            <div className="absolute top-1/4 -left-20 h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-[120px]" />
            <div className="absolute bottom-1/4 -right-20 h-[350px] w-[350px] rounded-full bg-blue-600/15 blur-[120px]" />
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[140px]" />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 w-full max-w-[460px]"
            >
                <div className="glass-strong overflow-hidden rounded-2xl shadow-2xl shadow-black/40">
                    <div className="px-8 pb-2 pt-8 text-center">
                        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/25">
                            <KaizenMark className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="mb-1.5 text-2xl font-bold text-white">{t('reset_title')}</h1>
                        <p className="text-sm text-zinc-400">{t('reset_subtitle')}</p>
                    </div>

                    <div className="space-y-6 px-8 pb-8 pt-6">
                        {error ? (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        ) : null}
                        {notice ? (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                {notice}
                            </div>
                        ) : null}

                        <form onSubmit={handleRequestCode} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">{t('email')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={requestLoading || !email}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {requestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                {t('reset_request_button')}
                            </button>
                        </form>

                        <form onSubmit={handleResetPassword} className="space-y-4 border-t border-white/8 pt-6">
                            <div>
                                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">{t('reset_code')}</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder={t('reset_code_placeholder')}
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">{t('new_password')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder={t('new_password_placeholder')}
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={confirmLoading || !email || !code || !newPassword}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {confirmLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        {t('reset_confirm_button')}
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="mt-6 text-center text-sm text-zinc-500">
                    <Link href="/login" className="font-medium text-violet-400 transition-colors hover:text-violet-300">
                        {t('back_to_login')}
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
