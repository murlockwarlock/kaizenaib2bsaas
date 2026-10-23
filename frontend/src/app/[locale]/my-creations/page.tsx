'use client';

import React, { startTransition, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiClient } from '@/lib/api';
import { Trash2, ArrowRight, Sparkles, Loader2, ChevronDown, ChevronUp, Copy, Download, Zap, X, Eye, Wand2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import AudioShowcaseCard from '@/components/ui/audio-showcase-card';
import type { GenerationTask } from '@/lib/types';
import { getCategoryTitle, getEditorCategory, getModelDisplayName, getModelFamilyLabel, getModelWorkflowLabel, getTaskPrompt, type SupportedLocale } from '@/lib/model-presenter';

function normalizeMediaSrc(src: string) {
    return src.replace(/^https?:\/\/127\.0\.0\.1:8000/, '');
}

function shouldBypassImageOptimization(src: string) {
    return src.startsWith('/uploads/')
        || /^https?:\/\/127\.0\.0\.1:8000/.test(src)
        || (/^https?:\/\//.test(src) && !src.includes('images.unsplash.com'));
}

export default function MyCreationsPage() {
    const [tasks, setTasks] = useState<GenerationTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: string, alt: string } | null>(null);
    const t = useTranslations('MyCreations');
    const locale = useLocale() as SupportedLocale;
    const router = useRouter();
    const tasksRef = useRef<GenerationTask[]>([]);

    const loadTasks = async (pageNum = 1, append = false) => {
        try {
            if (append) setLoadingMore(true);
            const res = await apiClient.get(`/ai/my-creations?page=${pageNum}&per_page=30`);
            const data = res.data;
            const items: GenerationTask[] = Array.isArray(data) ? data : data.items ?? [];
            setTotalPages(data.pages ?? 1);
            setPage(pageNum);
            setTasks(prev => append ? [...prev, ...items] : items);
        } catch (err) {
            console.error("Failed to load creations", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadTasks();
    }, []);

    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    useEffect(() => {
        let cancelled = false;

        const pollPendingTasks = async () => {
            const pendingTaskIds = tasksRef.current
                .filter((task) => task.status === 'processing' || task.status === 'pending')
                .map((task) => task.id);

            if (!pendingTaskIds.length) {
                return;
            }

            const results = await Promise.all(
                pendingTaskIds.map(async (taskId) => {
                    try {
                        const res = await apiClient.get(`/ai/status/${taskId}`);
                        return {
                            id: taskId,
                            status: res.data.status as GenerationTask['status'],
                            output_url: (res.data.result_url ?? null) as string | null,
                        };
                    } catch (e) {
                        console.error("Poll error for task", taskId, e);
                        return null;
                    }
                })
            );

            if (cancelled) {
                return;
            }

            const updates = new Map(
                results
                    .filter((item): item is NonNullable<typeof item> => item !== null)
                    .map((item) => [item.id, item])
            );

            if (!updates.size) {
                return;
            }

            startTransition(() => {
                setTasks((currentTasks) => currentTasks.map((task) => {
                    const next = updates.get(task.id);
                    if (!next) {
                        return task;
                    }

                    if (next.status === task.status && next.output_url === task.output_url) {
                        return task;
                    }

                    return {
                        ...task,
                        status: next.status,
                        output_url: next.output_url,
                    };
                }));
            });
        };

        pollPendingTasks();
        const interval = window.setInterval(pollPendingTasks, 5000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, []);

    const handleDownload = async (url: string, filename: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || 'ai-creation';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started");
        } catch (err) {
            console.error("Download failed", err);
            toast.error("Download failed. Please try opening in a new tab.");
        }
    };

    const handleDelete = async (taskId: number) => {
        setDeleteId(taskId);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await apiClient.delete(`/ai/tasks/${deleteId}`);
            setTasks(prev => prev.filter(t => t.id !== deleteId));
            toast.success(t('delete_success'));
        } catch {
            toast.error(t('delete_failed'));
        } finally {
            setDeleteId(null);
        }
    };

    const copyPrompt = (prompt: string) => {
        navigator.clipboard.writeText(prompt);
        toast.success(t('prompt_copied'));
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
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                </div>
                <p className="text-sm text-zinc-500 mb-8">{t('description')}</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                        <span className="text-sm text-zinc-500">{t('loading')}</span>
                    </div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-zinc-800/60 bg-zinc-900/30">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-7 h-7 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 mb-3">{t('empty')}</p>
                    <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors">
                        {t('start')}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            ) : (<>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                    {tasks.map((task, i) => (
                        <div
                            key={task.id}
                            className="group rounded-3xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 hover:shadow-2xl hover:shadow-violet-500/5 transition-all duration-300"
                        >
                            <div
                                className="aspect-video bg-zinc-950 relative flex items-center justify-center overflow-hidden cursor-pointer group/media"
                                onClick={() => {
                                    if (task.output_url) {
                                        setSelectedMedia({
                                            url: normalizeMediaSrc(task.output_url),
                                            type: task.category,
                                            alt: task.model
                                        });
                                    }
                                }}
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
                                        <>
                                            <Image
                                                src={normalizeMediaSrc(task.output_url)}
                                                alt={task.model}
                                                fill
                                                unoptimized={shouldBypassImageOptimization(task.output_url)}
                                                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-700 group-hover/media:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                <div className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white">
                                                    <Eye className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                                            <div className="absolute inset-0 blur-lg bg-violet-500/30 animate-pulse" />
                                        </div>
                                        <span className="text-xs font-medium text-zinc-500 animate-pulse">{t('processing')}</span>
                                    </div>
                                )}

                                <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                    task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                        'bg-violet-500/20 text-violet-400'
                                    }`}>
                                    {task.status}
                                </div>

                                {/* Hover actions */}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                        className="p-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md transition-all hover:scale-110"
                                        title={t('delete')}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                                                {getModelFamilyLabel(task.model, task.category, locale)}
                                            </span>
                                            <span className="text-[10px] font-medium text-zinc-500">
                                                {getModelWorkflowLabel(task.model, task.category, locale)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Zap className="w-3.5 h-3.5 text-violet-400" />
                                            <h3 className="font-bold text-sm text-zinc-100">
                                                {getModelDisplayName(task.model)}
                                            </h3>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 font-medium">{new Date(task.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {task.output_url && (
                                            <button
                                                onClick={() => handleDownload(normalizeMediaSrc(task.output_url || ''), `ai-${task.category}-${task.id}`)}
                                                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all ring-1 ring-white/5"
                                                title={t('download')}
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-zinc-500">{t('model')}</span>
                                        <span className="text-right text-zinc-300 font-semibold">{task.model || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-zinc-500">{locale === 'ru' ? 'Тип' : 'Workflow'}</span>
                                        <span className="text-zinc-300 font-semibold">{getCategoryTitle(task.category, locale)}</span>
                                    </div>
                                    {task.resolution && (
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-zinc-500">{t('resolution')}</span>
                                            <span className="text-zinc-300 font-semibold">{task.resolution}</span>
                                        </div>
                                    )}
                                    {task.duration && (
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-zinc-500">{locale === 'ru' ? 'Длительность' : 'Duration'}</span>
                                            <span className="text-zinc-300 font-semibold">{task.duration}s</span>
                                        </div>
                                    )}
                                </div>

                                {/* Expandable Prompt */}
                                <div className="mt-5 pt-4 border-t border-zinc-800/60">
                                    <button
                                        onClick={() => setExpandedPrompt(expandedPrompt === task.id ? null : task.id)}
                                        className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-white transition-colors group/btn"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                                            {t('view_prompt')}
                                        </span>
                                        {expandedPrompt === task.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 group-hover/btn:translate-y-0.5 transition-transform" />}
                                    </button>

                                    {expandedPrompt === task.id ? (
                                            <div className="overflow-hidden">
                                                <div className="mt-3 relative">
                                                    <div className="absolute -inset-2 bg-violet-500/5 rounded-2xl blur-lg" />
                                                    <div className="relative p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50 text-[11px] text-zinc-400 leading-relaxed italic">
                                                        {getTaskPrompt(task) || t('no_prompt')}
                                                        <button
                                                            onClick={() => copyPrompt(getTaskPrompt(task) || '')}
                                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-colors"
                                                            title={t('copy_prompt')}
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                        {getTaskPrompt(task) && (
                                                            <button
                                                                onClick={() => continueWithPrompt(task)}
                                                                className="absolute top-2 right-10 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-colors"
                                                                title={t('continue_prompt')}
                                                            >
                                                                <Wand2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {page < totalPages && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => loadTasks(page + 1, true)}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-300 hover:text-white transition-all ring-1 ring-white/5 disabled:opacity-50"
                        >
                            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {loadingMore ? t('loading') : t('load_more')}
                        </button>
                    </div>
                )}
            </>
            )}

            <DeleteConfirmationDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
            />

            {selectedMedia ? (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
                        onClick={() => setSelectedMedia(null)}
                    >
                        <button
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
                            onClick={() => setSelectedMedia(null)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div
                            className="relative max-w-6xl w-full max-h-[90vh] flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {selectedMedia.type === 'video' ? (
                                <video src={selectedMedia.url} className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" controls autoPlay />
                            ) : selectedMedia.type === 'audio' ? (
                                <AudioShowcaseCard
                                    title={getCategoryTitle('audio', locale)}
                                    subtitle={getModelDisplayName(selectedMedia.alt)}
                                    audioUrl={selectedMedia.url}
                                    autoPlay
                                    className="w-full max-w-md"
                                />
                            ) : (
                                <div className="relative h-[90vh] w-full">
                                    <Image
                                        src={selectedMedia.url}
                                        alt={selectedMedia.alt}
                                        fill
                                        unoptimized={shouldBypassImageOptimization(selectedMedia.url)}
                                        sizes="100vw"
                                        className="rounded-2xl object-contain shadow-2xl"
                                    />
                                </div>
                            )}
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
                className="relative h-full w-full object-cover transition-transform duration-700 group-hover/media:scale-105"
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
