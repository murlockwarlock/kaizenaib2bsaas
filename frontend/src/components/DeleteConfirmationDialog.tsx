'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DeleteConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
}

export function DeleteConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description
}: DeleteConfirmationDialogProps) {
    const t = useTranslations('Common');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">
                            {title || t('delete_confirm_title')}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                            {description || t('delete_confirm_desc')}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition-colors shadow-lg shadow-red-900/20"
                            >
                                {t('confirm_delete')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
