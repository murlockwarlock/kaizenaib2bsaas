'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiClient } from '@/lib/api';
import { Heart, Loader2, ArrowRight, ExternalLink, Download, Wand2, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import AudioShowcaseCard from '@/components/ui/audio-showcase-card';
import type { GenerationTask } from '@/lib/types';
import { getCategoryTitle, getEditorCategory, getModelDisplayName, getTaskPrompt, type SupportedLocale } from '@/lib/model-presenter';

function normalizeMediaSrc(src: string) {
    return src.replace(/^https?:\/\/127\.0\.0\.1:8000/, '');
}

function shouldBypassImageOptimization(src: string) {
    return src.startsWith('/uploads/')
        || /^https?:\/\/127\.0\.0\.1:8000/.test(src)
        || (/^https?:\/\//.test(src) && !src.includes('images.unsplash.com'));
}

export default function MyLikesPage() {
    const [tasks, setTasks] = useState<GenerationTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<GenerationTask | null>(null);
    const t = useTranslations('MyLikes');
    const locale = useLocale() as SupportedLocale;
    const router = useRouter();

    useEffect(() => {
        apiClient.get('/ai/likes')
            .then(res => setTasks(res.data))
            .catch(err => console.error("Failed to load likes", err))
            .finally(() => setLoading(false));
    }, []);

    const toggleLike = async (taskId: number) => {
        try {
            await apiClient.post(`/ai/likes/${taskId}`);
            setTasks(tasks.filter((task) => task.id !== taskId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    };

    const continueWithPrompt = (task: GenerationTask) => {
        const prompt = getTaskPrompt(task);
        if (!prompt) return;
        const category = getEditorCategory(task.category);
        const model = encodeURIComponent(task.model || '');
        router.push(`/${category}?prompt=${encodeURIComponent(prompt)}&model=${model}`);
    };

    return (
        <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-20 sm:px-5 md:p-10 md:pt-10">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-5 h-5 text-pink-400" />
                    <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                </div>
                <p className="text-sm text-zinc-500 mb-8">{t('description')}</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                        <span className="text-sm text-zinc-500">{t('loading')}</span>
                    </div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-zinc-800/60 bg-zinc-900/30">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-7 h-7 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 mb-3">{t('empty')}</p>
                    <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 font-medium transition-colors">
                        {t('explore')}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tasks.map((task, i: number) => (
                        <div
                            key={task.id}
                            className="group rounded-2xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 transition-all"
                        >
                            <div
                                className="h-44 bg-zinc-950 relative flex items-center justify-center cursor-pointer"
                                onClick={() => task.output_url && setSelectedTask({ ...task, output_url: normalizeMediaSrc(task.output_url) })}
                            >
                                {task.output_url ? (
                                    task.category === 'video' ? (
                                        <VideoPreviewCard src={task.output_url} />
                                    ) : task.category === 'audio' ? (
                                        <div className="h-full w-full p-3">
                                            <AudioShowcaseCard
                                                title={getModelDisplayName(task.model)}
                                                subtitle={getCategoryTitle(task.category, locale)}
                                                prompt={getTaskPrompt(task)}
                                                audioUrl={normalizeMediaSrc(task.output_url)}
                                                compact
                                                showControls={false}
                                                className="h-full min-h-0"
                                            />
                                        </div>
                                    ) : (
                                        <Image
                                            src={normalizeMediaSrc(task.output_url)}
                                            alt={task.model}
                                            fill
                                            unoptimized={shouldBypassImageOptimization(task.output_url)}
                                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                            className="object-cover"
                                        />
                                    )
                                ) : (
                                    <div className="text-zinc-600 text-xs">{t('processing')}</div>
                                )}
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        toggleLike(task.id);
                                    }}
                                    className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-red-500/90 text-white shadow-lg hover:bg-red-600 transition-colors backdrop-blur-sm"
                                    title={t('unlike')}
                                >
                                    <Heart className="w-4 h-4 fill-current" />
                                </button>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-sm text-zinc-200 mb-1">{getCategoryTitle(task.category, locale)}</h3>
                                <p className="text-xs text-zinc-500 mb-3">{t('model')}: {getModelDisplayName(task.model)}</p>
                                {getTaskPrompt(task) && (
                                    <button
                                        onClick={() => continueWithPrompt(task)}
                                        className="mb-3 w-full py-2 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.04] hover:border-zinc-700 transition-all"
                                    >
                                        <Wand2 className="w-3 h-3" />
                                        {t('continue_prompt')}
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setSelectedTask(task)}
                                        className="w-full py-2 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border-zinc-700 transition-all"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        {t('view_details')}
                                    </button>
                                    {task.output_url && (
                                        <button
                                            onClick={() => handleDownload(normalizeMediaSrc(task.output_url || ''), `liked-${task.category}-${task.id}`)}
                                            className="w-full py-2 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border-zinc-700 transition-all"
                                        >
                                            <Download className="w-3 h-3" />
                                            {t('download')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedTask && selectedTask.output_url ? (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
                        onClick={() => setSelectedTask(null)}
                    >
                        <button
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
                            onClick={() => setSelectedTask(null)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div
                            className="relative w-full max-w-5xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.96),rgba(8,10,14,0.94))] p-5 md:p-6"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_360px]">
                                <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/8 bg-black/20">
                                    {selectedTask.category === 'video' ? (
                                        <video src={selectedTask.output_url} className="max-h-[72vh] w-full object-contain" controls autoPlay />
                                    ) : selectedTask.category === 'audio' ? (
                                        <AudioShowcaseCard
                                            title={getModelDisplayName(selectedTask.model)}
                                            subtitle={getCategoryTitle(selectedTask.category, locale)}
                                            prompt={getTaskPrompt(selectedTask)}
                                            audioUrl={selectedTask.output_url}
                                            autoPlay
                                            className="w-full max-w-md"
                                        />
                                    ) : (
                                        <div className="relative h-[72vh] w-full">
                                            <Image
                                                src={selectedTask.output_url}
                                                alt={getModelDisplayName(selectedTask.model)}
                                                fill
                                                unoptimized={shouldBypassImageOptimization(selectedTask.output_url)}
                                                sizes="100vw"
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{getCategoryTitle(selectedTask.category, locale)}</div>
                                    <h3 className="mt-3 text-xl font-semibold text-white">{getModelDisplayName(selectedTask.model)}</h3>
                                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                        {new Date(selectedTask.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>

                                    <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/15 p-4">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('prompt')}</div>
                                        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                                            {getTaskPrompt(selectedTask) || t('no_prompt')}
                                        </p>
                                    </div>

                                    <div className="mt-5 space-y-2">
                                        {getTaskPrompt(selectedTask) && (
                                            <button
                                                onClick={() => continueWithPrompt(selectedTask)}
                                                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff6b4a,#22c7b8)] text-sm font-semibold text-white"
                                            >
                                                <Wand2 className="w-4 h-4" />
                                                {t('continue_prompt')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDownload(normalizeMediaSrc(selectedTask.output_url || ''), `liked-${selectedTask.category}-${selectedTask.id}`)}
                                            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-zinc-200"
                                        >
                                            <Download className="w-4 h-4" />
                                            {t('download')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
        </div>
    );
}

function VideoPreviewCard({ src }: { src: string }) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [canAutoplay, setCanAutoplay] = useState(false);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { rootMargin: '240px 0px', threshold: 0.12 }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => {
            setCanAutoplay(!coarsePointerQuery.matches && !reducedMotionQuery.matches);
        };

        updatePreference();
        coarsePointerQuery.addEventListener('change', updatePreference);
        reducedMotionQuery.addEventListener('change', updatePreference);

        return () => {
            coarsePointerQuery.removeEventListener('change', updatePreference);
            reducedMotionQuery.removeEventListener('change', updatePreference);
        };
    }, []);

    const normalizedSrc = normalizeMediaSrc(src);

    return (
        <div ref={containerRef} className="relative h-full w-full">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,107,74,0.18),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(34,199,184,0.18),transparent_28%),linear-gradient(180deg,rgba(17,20,27,0.96),rgba(8,10,14,0.98))]" />
            <video
                src={normalizedSrc}
                className="relative h-full w-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
                autoPlay={isVisible && canAutoplay}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.12))]" />
        </div>
    );
}
