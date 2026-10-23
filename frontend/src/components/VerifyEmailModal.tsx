'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { verifyEmail, resendVerification } from '@/lib/api';

interface VerifyEmailModalProps {
    email: string;
    onSuccess: () => void;
}

export function VerifyEmailModal({ email, onSuccess }: VerifyEmailModalProps) {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(60);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...code];
        next[index] = value.slice(-1);
        setCode(next);
        setError('');
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async () => {
        const fullCode = code.join('');
        if (fullCode.length < 6) { setError('Enter all 6 digits'); return; }
        setIsLoading(true);
        setError('');
        try {
            await verifyEmail(email, fullCode);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid code, try again');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await resendVerification(email);
            setResendCooldown(60);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to resend');
        } finally {
            setResending(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/60"
                >
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                        <Mail className="w-7 h-7 text-violet-400" />
                    </div>

                    <h3 className="text-xl font-bold text-white text-center mb-1">Check your email</h3>
                    <p className="text-sm text-zinc-400 text-center mb-6">
                        We sent a 6-digit code to <span className="text-zinc-200 font-medium">{email}</span>
                    </p>

                    {/* 6-digit input */}
                    <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
                        {code.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleInput(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                className={`w-11 h-12 text-center text-lg font-bold rounded-xl border bg-zinc-800/80 text-white transition-all duration-150 focus:outline-none
                                    ${error ? 'border-red-500/60' : digit ? 'border-violet-500/60' : 'border-zinc-700 focus:border-violet-500/50'}`}
                            />
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-xs text-center mb-4"
                        >
                            {error}
                        </motion.p>
                    )}

                    {/* Verify button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || code.join('').length < 6}
                        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify email</>}
                    </button>

                    {/* Resend */}
                    <div className="mt-4 text-center">
                        {resendCooldown > 0 ? (
                            <p className="text-xs text-zinc-500">Resend code in {resendCooldown}s</p>
                        ) : (
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 mx-auto"
                            >
                                {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Resend code
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
