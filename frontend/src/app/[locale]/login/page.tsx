'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Link } from '@/i18n/routing';
import { login as apiLogin } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import SocialAuthButtons from '@/components/SocialAuthButtons';

export default function LoginPage() {
    const t = useTranslations('Auth');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next') || '/dashboard';
    const socialError = searchParams.get('social_error');
    const socialErrorMessage = useMemo(() => {
        if (!socialError) return '';
        const key = `social_error_${socialError}` as const;
        try {
            return t(key);
        } catch {
            return t('error');
        }
    }, [socialError, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await apiLogin(email, password);
            await login(res.access_token, nextPath);
        } catch {
            setError(t('error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated gradient background blobs */}
            <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[120px] animate-[float_8s_ease-in-out_infinite]" />
            <div className="absolute bottom-1/4 -right-20 w-[350px] h-[350px] bg-blue-600/15 rounded-full blur-[120px] animate-[float_10s_ease-in-out_infinite_reverse]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] animate-[pulse-glow_6s_ease-in-out_infinite]" />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Card */}
                <div className="glass-strong rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-8 pb-2 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 mb-5 shadow-lg shadow-violet-500/25">
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1.5">{t('login_title')}</h1>
                        <p className="text-sm text-zinc-400">{t('welcome_subtitle')}</p>
                    </div>

                    {/* Form */}
                    <div className="px-8 pt-6 pb-8">
                        {(error || socialErrorMessage) && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                {error || socialErrorMessage}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">{t('email')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-zinc-500" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">{t('password')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-zinc-500" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                                    />
                                </div>
                                <div className="mt-3 text-right">
                                    <Link href="/reset-password" className="text-sm font-medium text-violet-400 transition-colors hover:text-violet-300">
                                        {t('forgot_password')}
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {t('login_button')}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <SocialAuthButtons
                            nextPath={nextPath}
                            mode="login"
                            disabled={isLoading}
                            className="mt-5"
                        />

                    </div>
                </div>

                {/* Footer link */}
                <p className="text-center text-sm text-zinc-500 mt-6">
                    {t('no_account')}{' '}
                    <Link href={`/register?next=${encodeURIComponent(nextPath)}`} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                        {t('register_button')}
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
