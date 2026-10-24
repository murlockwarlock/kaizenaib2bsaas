'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { use } from 'react';
import { uploadImage, startGeneration, checkStatus } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, RefreshCw, Sparkles, Download, Loader2, ArrowRight, Globe, Box } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';
import { trackGeneration } from '@/lib/generation-tracker';
import { getGenerationFailureDescription } from '@/lib/generation-alerts';
import { getPromptSafetyIssue } from '@/lib/prompt-safety';

export default function ToolPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const t = useTranslations('ToolUI');
    const tCatalog = useTranslations('Catalog');
    const alertsT = useTranslations('GenerationAlerts');
    const locale = useLocale() as 'ru' | 'en';

    const toolId = id as string;
    const isText3D = toolId === 'text_to_3d';
    const title = tCatalog(`tools.${toolId}.title`) || 'Tool';
    const description = tCatalog(`tools.${toolId}.description`) || '';

    const { user } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [textPrompt, setTextPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(true);

    const handleDownload = async () => {
        if (!resultUrl) return;

        try {
            const response = await fetch(resultUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${toolId}-result.${extension}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Download failed', error);
            toast.error(t('generation_error'));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            try {
                const res = await uploadImage(file);
                setUploadedUrl(res.url);
            } catch (err) {
                console.error("Upload failed", err);
                toast.error(t('upload_failed'));
            }
        }
    };

    const handleGenerate = async () => {
        if (!isText3D && !uploadedUrl) return;
        if (isText3D && !textPrompt.trim()) return;

        if (!user) {
            setShowAuthModal(true);
            return;
        }

        setIsProcessing(true);
        try {
            if (isText3D) {
                const promptIssue = getPromptSafetyIssue(textPrompt.trim(), locale);
                if (promptIssue) {
                    throw new Error(`${promptIssue.message} ${promptIssue.suggestion}`.trim());
                }
            }
            const inputData = isText3D ? textPrompt : uploadedUrl!;
            const res = await startGeneration(toolId, inputData, isPublic);
            const taskId = res.task_id;
            trackGeneration({ taskId, category: isText3D ? 'image' : 'image', startedAt: Date.now() });
            toast.success(alertsT('queued_title'), { description: alertsT('queued_desc') });
            const interval = setInterval(async () => {
                const statusRes = await checkStatus(taskId);
                if (statusRes.status === 'success') {
                    setResultUrl(statusRes.result_url);
                    setIsProcessing(false);
                    clearInterval(interval);
                } else if (statusRes.status === 'failed' || statusRes.status === 'submission_unknown') {
                    setIsProcessing(false);
                    clearInterval(interval);
                    toast.error(alertsT('failed_title'), {
                        description: getGenerationFailureDescription(
                            statusRes.error_message,
                            alertsT,
                            statusRes.credits_refunded !== false && statusRes.status !== 'submission_unknown',
                        ),
                    });
                }
            }, 3000);
        } catch (err) {
            setIsProcessing(false);
            toast.error(t('generation_error'));
        }
    };

    const reset = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadedUrl(null);
        setResultUrl(null);
        setTextPrompt('');
    };

    const canGenerate = isText3D ? textPrompt.trim().length > 0 : !!uploadedUrl;

    return (
        <div className="min-h-screen p-6 md:p-10 pt-14 md:pt-10 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
                    {isText3D ? <Box className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {t('badge')}
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
                <p className="text-sm text-zinc-500">{description}</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 md:p-8"
            >
                <AnimatePresence mode="wait">
                    {resultUrl ? (
                        /* Result */
                        <motion.div
                            key="result"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            {isText3D ? (
                                <div className="w-full max-w-2xl mb-6">
                                    <p className="text-xs font-medium text-emerald-400 mb-2 uppercase tracking-wider">{t('result')}</p>
                                    <img src={resultUrl} className="w-full rounded-xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]" alt="Result" />
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row w-full gap-4 mb-6">
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">{t('original')}</p>
                                        <img src={previewUrl!} className="w-full rounded-xl border border-zinc-800" alt="Original" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-emerald-400 mb-2 uppercase tracking-wider">{t('result')}</p>
                                        <img src={resultUrl} className="w-full rounded-xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]" alt="Result" />
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-3 justify-center">
                                <button
                                    onClick={reset}
                                    className="px-5 py-2.5 rounded-xl border border-zinc-800 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border-zinc-700 transition-all flex items-center gap-2"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {t('try_another')}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    {t('download')}
                                </button>
                            </div>
                        </motion.div>
                    ) : isText3D ? (
                        /* Text to 3D: text prompt input */
                        <motion.div
                            key="text-input"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center max-w-2xl mx-auto w-full"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-600 to-zinc-400 flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <Box className="w-8 h-8 text-white" />
                            </div>

                            <div className="w-full mb-6">
                                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                                    {t('text_prompt_label')}
                                </label>
                                <textarea
                                    value={textPrompt}
                                    onChange={(e) => setTextPrompt(e.target.value)}
                                    placeholder={t('text_prompt_placeholder')}
                                    rows={4}
                                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200 resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between w-full mb-6">
                                <TooltipProvider delayDuration={150}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                                                <div
                                                    className={`relative w-9 h-5 rounded-full transition-colors ${isPublic ? 'bg-violet-500' : 'bg-zinc-700'}`}
                                                    onClick={(e) => { e.preventDefault(); setIsPublic(!isPublic); }}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                </div>
                                                <div className="flex items-center gap-1.5" onClick={() => setIsPublic(!isPublic)}>
                                                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                                                    <span className="text-xs text-zinc-400">{t('make_public')}</span>
                                                </div>
                                            </label>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                            <p className="text-xs">{t('make_public_tooltip')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isProcessing || !textPrompt.trim()}
                                className="px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('processing')}
                                    </>
                                ) : (
                                    <>
                                        {t('generate_button')}
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    ) : !previewUrl ? (
                        /* Image upload zone */
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center hover:border-violet-500/30 hover:bg-violet-500/[0.02] transition-all duration-300 cursor-pointer relative"
                        >
                            <input
                                type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept="image/*" onChange={handleFileChange}
                            />
                            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-7 h-7 text-zinc-500" />
                            </div>
                            <p className="text-sm font-medium text-zinc-300 mb-1">{t('upload_placeholder')}</p>
                            <p className="text-xs text-zinc-600">{t('file_hint')}</p>
                        </motion.div>
                    ) : (
                        /* Image preview + generate */
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden bg-zinc-950 mb-6 border border-zinc-800">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                            </div>

                            <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
                                <div className="flex items-center justify-between w-full px-2">
                                    <TooltipProvider delayDuration={150}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                                                    <div
                                                        className={`relative w-9 h-5 rounded-full transition-colors ${isPublic ? 'bg-violet-500' : 'bg-zinc-700'}`}
                                                        onClick={(e) => { e.preventDefault(); setIsPublic(!isPublic); }}
                                                    >
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                    </div>
                                                    <div className="flex items-center gap-1.5" onClick={() => setIsPublic(!isPublic)}>
                                                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                                                        <span className="text-xs text-zinc-400">{t('make_public')}</span>
                                                    </div>
                                                </label>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                                <p className="text-xs">{t('make_public_tooltip')}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="flex flex-wrap gap-3 justify-center">
                                    <button
                                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); setUploadedUrl(null); }}
                                        className="px-5 py-2.5 rounded-xl border border-zinc-800 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border-zinc-700 transition-all flex items-center gap-2"
                                        disabled={isProcessing}
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        {t('try_again')}
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isProcessing || !uploadedUrl}
                                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {t('processing')}
                                            </>
                                        ) : (
                                            <>
                                                {t('generate_button')}
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <AuthRequiredModal
                open={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}
