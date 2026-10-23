'use client';

import dynamic from 'next/dynamic';
import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Film, Grid3X3, ImageIcon, Loader2, Music, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { apiClient, incrementPublicTaskView } from '@/lib/api';
import type { GenerationTask } from '@/lib/types';
import type { SupportedLocale } from '@/lib/model-presenter';
import PublicTaskCard, { getTaskLikesCount } from '@/components/explore/PublicTaskCard';
import { useAuth } from '@/components/AuthContext';

const TaskDetailDrawer = dynamic(() => import('@/components/explore/TaskDetailDrawer'));

type ExploreTask = GenerationTask & {
  is_hot?: boolean;
  like_count?: number;
};

function getTaskRankDate(task: ExploreTask) {
  const timestamp = Date.parse(task.created_at || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export default function ExplorePage() {
  const t = useTranslations('Explore');
  const locale = useLocale() as SupportedLocale;
  const { user } = useAuth();

  const [tasks, setTasks] = useState<ExploreTask[]>([]);
  const [likes, setLikes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const viewedTaskIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksRes, likesRes] = await Promise.all([
          apiClient.get('/public/tasks'),
          user ? apiClient.get('/ai/likes').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);
        setTasks(tasksRes.data as ExploreTask[]);
        setLikes((likesRes.data as Array<{ id: number }>).map((like) => like.id));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const likesSet = useMemo(() => new Set(likes), [likes]);

  const filterCounts = useMemo(() => ({
    all: tasks.length,
    image: tasks.filter((task) => task.category === 'image' || task.category === 'images').length,
    video: tasks.filter((task) => task.category === 'video').length,
    audio: tasks.filter((task) => task.category === 'audio').length,
  }), [tasks]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => filter === 'all' || task.category === filter || (filter === 'image' && task.category === 'images')),
    [filter, tasks]
  );

  const deferredFilteredTasks = useDeferredValue(filteredTasks);

  const rankedTasks = useMemo(
    () => [...deferredFilteredTasks].sort((a, b) => {
      if (Boolean(b.is_hot) !== Boolean(a.is_hot)) {
        return Number(Boolean(b.is_hot)) - Number(Boolean(a.is_hot));
      }
      if (getTaskLikesCount(b) !== getTaskLikesCount(a)) {
        return getTaskLikesCount(b) - getTaskLikesCount(a);
      }
      if ((b.view_count ?? 0) !== (a.view_count ?? 0)) {
        return (b.view_count ?? 0) - (a.view_count ?? 0);
      }
      if (getTaskRankDate(b) !== getTaskRankDate(a)) {
        return getTaskRankDate(b) - getTaskRankDate(a);
      }
      return b.id - a.id;
    }),
    [deferredFilteredTasks]
  );

  const featuredTask = rankedTasks.find((t) => t.category !== 'audio') ?? rankedTasks[0] ?? null;
  const secondaryTasks = featuredTask ? rankedTasks.filter((task) => task.id !== featuredTask.id) : rankedTasks;
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null;

  const openTask = async (task: ExploreTask) => {
    setSelectedTaskId(task.id);
    if (viewedTaskIdsRef.current.has(task.id)) return;
    viewedTaskIdsRef.current.add(task.id);

    try {
      const response = await incrementPublicTaskView(task.id);
      setTasks((current) => current.map((item) => (
        item.id === task.id
          ? { ...item, view_count: response.view_count ?? ((item.view_count ?? 0) + 1) }
          : item
      )));
    } catch (error) {
      console.error(error);
    }
  };

  const toggleLike = async (taskId: number) => {
    if (!user) {
      toast.error(t('login_to_like'));
      return;
    }

    try {
      const response = await apiClient.post(`/ai/likes/${taskId}`);
      const liked = response.data.status === 'liked';

      setLikes((current) => (
        liked
          ? (current.includes(taskId) ? current : [...current, taskId])
          : current.filter((id) => id !== taskId)
      ));

      setTasks((current) => current.map((task) => {
        if (task.id !== taskId) return task;
        const nextLikes = Math.max(0, getTaskLikesCount(task) + (liked ? 1 : -1));
        return {
          ...task,
          likes_count: nextLikes,
          like_count: nextLikes,
        };
      }));
    } catch (error) {
      console.error(error);
      toast.error(t('failedToUpdateLike'));
    }
  };

  const filterTabs = [
    { id: 'all' as const, icon: Grid3X3, label: t('all') },
    { id: 'image' as const, icon: ImageIcon, label: t('image') },
    { id: 'video' as const, icon: Film, label: t('video') },
    { id: 'audio' as const, icon: Music, label: t('audio') },
  ];

  return (
    <div className="relative isolate mx-auto min-h-screen w-full max-w-7xl overflow-hidden px-4 pb-12 pt-20 md:px-8 md:pb-14 md:pt-10">
      <div className="pointer-events-none absolute inset-x-[-12%] top-8 -z-10 h-[30rem] bg-[radial-gradient(circle_at_18%_20%,rgba(255,107,74,0.1),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(34,199,184,0.12),transparent_28%)] blur-[84px]" />

      <section className="mb-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.94),rgba(8,10,14,0.84))] px-4 py-5 shadow-[0_24px_56px_rgba(0,0,0,0.24)] backdrop-blur-xl md:px-6 md:py-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-200">
              <Sparkles className="h-3.5 w-3.5 text-[#ffd166]" />
              {t('hero_badge')}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{t('title')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">{t('description')}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: t('all'), value: filterCounts.all },
              { label: t('video'), value: filterCounts.video },
              { label: t('image'), value: filterCounts.image },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 px-3 py-3 text-center">
                <div className="text-lg font-semibold text-white">{item.value}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <span className="text-sm text-zinc-500">{t('loading')}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.88),rgba(8,10,14,0.78))] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.18)] md:w-fit">
            {filterTabs.map((button) => (
              <button
                key={button.id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setFilter(button.id);
                    setSelectedTaskId(null);
                  });
                }}
                className={`flex min-w-[calc(50%-0.1875rem)] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:min-w-[unset] sm:flex-none md:px-4 md:py-2 ${filter === button.id ? 'bg-white text-[#06070a] shadow-lg shadow-black/20' : 'text-zinc-300 hover:text-white'}`}
              >
                <button.icon className="h-3.5 w-3.5" />
                {button.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === button.id ? 'bg-black/10 text-[#06070a]' : 'bg-white/8 text-zinc-500'}`}>
                  {filterCounts[button.id]}
                </span>
              </button>
            ))}
          </div>

          {rankedTasks.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/20 py-16 text-center text-zinc-500">
              {t('empty')}
            </div>
          ) : (
            <div className="space-y-5">
              {featuredTask ? (
                <PublicTaskCard
                  task={featuredTask}
                  locale={locale}
                  featured
                  onClick={() => openTask(featuredTask)}
                />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {secondaryTasks.map((task) => (
                  <PublicTaskCard
                    key={task.id}
                    task={task}
                    locale={locale}
                    onClick={() => openTask(task)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedTask ? (
        <TaskDetailDrawer
          task={selectedTask}
          open={true}
          onClose={() => setSelectedTaskId(null)}
          isLiked={likesSet.has(selectedTask.id)}
          onLike={() => toggleLike(selectedTask.id)}
        />
      ) : null}
    </div>
  );
}
