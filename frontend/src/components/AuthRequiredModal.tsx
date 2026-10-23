'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ArrowRight, Loader2, UserPlus, LogIn, Sparkles, Check } from 'lucide-react';
import { register, login as apiLogin } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { Link } from '@/i18n/routing';
import { clearStoredUtmAttribution, getStoredUtmAttribution } from '@/lib/utm';
import SocialAuthButtons from '@/components/SocialAuthButtons';

interface AuthRequiredModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

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

export default function AuthRequiredModal({ open, onClose, onSuccess }: AuthRequiredModalProps) {
    const t = useTranslations('Auth');
    const { setSession } = useAuth();

    const [mode, setMode] = useState<'register' | 'login'>('register');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const reset = () => {
        setEmail('');
        setPassword('');
        setError('');
        setIsLoading(false);
        setTermsAccepted(false);
    };

    const switchMode = (m: 'register' | 'login') => {
        setMode(m);
        reset();
    };

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
        if (mode === 'register' && !termsAccepted) return;
        setError('');
        setIsLoading(true);
        try {
            if (mode === 'register') {
                await register(email, password, getStoredUtmAttribution());
                clearStoredUtmAttribution();
            }
            const res = await apiLogin(email, password);
            await setSession(res.access_token);
            onSuccess?.();
            onClose();
        } catch (error: unknown) {
            setError(getErrorMessage(error, t('error')));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 60, scale: 0.97 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative px-6 pt-6 pb-4 text-center border-b border-zinc-800">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-1.5 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 mb-3 shadow-lg shadow-violet-500/25">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-white mb-1">
                                {mode === 'register' ? t('auth_required_title') : t('login_title')}
                            </h2>
                            <p className="text-sm text-zinc-400">
                                {mode === 'register' ? t('auth_required_subtitle') : t('welcome_subtitle')}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex mx-6 mt-4 rounded-xl bg-zinc-800/50 p-1 gap-1">
                            <button
                                onClick={() => switchMode('register')}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'register' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                {t('register_button')}
                            </button>
                            <button
                                onClick={() => switchMode('login')}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'login' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                {t('login_button')}
                            </button>
                        </div>

                        {/* Form */}
                        <div className="px-6 pt-4 pb-6">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="email" required value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder={t('email')}
                                            className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="password" required minLength={8} value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder={t('password')}
                                            className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                                        />
                                    </div>
                                    {mode === 'register' && password && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strengthLevel ? strengthColors[strengthLevel] : 'bg-zinc-800'}`} />
                                                ))}
                                            </div>
                                            <p className={`text-xs mt-1 ${strengthLevel <= 1 ? 'text-red-400' : strengthLevel <= 2 ? 'text-orange-400' : strengthLevel <= 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                                {strengthLabels[strengthLevel]}
                                            </p>
                                        </motion.div>
                                    )}
                                </div>

                                {mode === 'register' && (
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
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || (mode === 'register' && !termsAccepted)}
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-1"
                                >
                                    {isLoading
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <>{mode === 'register' ? t('register_button') : t('login_button')}<ArrowRight className="w-4 h-4" /></>
                                    }
                                </button>
                            </form>

                            <SocialAuthButtons
                                nextPath="/dashboard"
                                mode={mode}
                                disabled={isLoading || (mode === 'register' && !termsAccepted)}
                                className="mt-4"
                            />
                        </div>
                    </motion.div>

                </motion.div>
            )}
        </AnimatePresence>
    );
}
