'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Link } from '@/i18n/routing';
import { register, login as apiLogin } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { clearStoredUtmAttribution, getStoredUtmAttribution } from '@/lib/utm';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, UserPlus, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import SocialAuthButtons from '@/components/SocialAuthButtons';

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

export default function RegisterPage() {
    const t = useTranslations('Auth');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
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

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return 0;
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return Math.min(score, 4);
    };

    const strengthLevel = getPasswordStrength(password);
    const strengthColors = ['bg-zinc-700', 'bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-emerald-400'];
    const strengthLabels = ['', t('strength_weak'), t('strength_fair'), t('strength_good'), t('strength_strong')];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) return;
        setError('');
        setIsLoading(true);
        try {
            await register(email, password, getStoredUtmAttribution());
            clearStoredUtmAttribution();
            const res = await apiLogin(email, password);
            await login(res.access_token, nextPath);
        } catch (error: unknown) {
            setError(getErrorMessage(error, t('error')));
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[120px] animate-[float_9s_ease-in-out_infinite]" />
            <div className="absolute bottom-1/3 -left-20 w-[350px] h-[350px] bg-blue-600/15 rounded-full blur-[120px] animate-[float_11s_ease-in-out_infinite_reverse]" />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="w-full max-w-[420px] relative z-10"
            >
                <div className="glass-strong rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                    <div className="px-8 pt-8 pb-2 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 mb-5 shadow-lg shadow-violet-500/25">
                            <UserPlus className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1.5">{t('register_title')}</h1>
                        <p className="text-sm text-zinc-400">{t('register_subtitle')}</p>
                    </div>

                    <div className="px-8 pt-6 pb-8">
                        {(error || socialErrorMessage) && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
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
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">{t('password')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-zinc-500" />
                                    <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200" />
                                </div>
                                {password && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2.5">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strengthLevel ? strengthColors[strengthLevel] : 'bg-zinc-800'}`} />
                                            ))}
                                        </div>
                                        <p className={`text-xs mt-1.5 ${strengthLevel <= 1 ? 'text-red-400' : strengthLevel <= 2 ? 'text-orange-400' : strengthLevel <= 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                            {strengthLabels[strengthLevel]}
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Terms checkbox */}
                            <div className="flex items-start gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setTermsAccepted(!termsAccepted)}
                                    className={`mt-0.5 w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-all ${termsAccepted ? 'bg-violet-600 border-violet-600' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'}`}
                                >
                                    {termsAccepted && <Check className="w-3 h-3 text-white" />}
                                </button>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    {t('terms_accept')}{' '}
                                    <Link href="/legal/terms" target="_blank" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                                        {t('terms_link')}
                                    </Link>
                                    {' '}{t('terms_and')}{' '}
                                    <Link href="/legal/privacy" target="_blank" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                                        {t('privacy_link')}
                                    </Link>
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !termsAccepted}
                                className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('register_button')}<ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>

                        <SocialAuthButtons
                            nextPath={nextPath}
                            mode="register"
                            disabled={isLoading || !termsAccepted}
                            className="mt-5"
                        />

                    </div>
                </div>

                <p className="text-center text-sm text-zinc-500 mt-6">
                    {t('has_account')}{' '}
                    <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                        {t('login_button')}
                    </Link>
                </p>
            </motion.div>

        </div>
    );
}
