'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Film, Grid3X3, Heart, ImageIcon, Loader2, Music, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { apiClient, getPublicProfile, incrementPublicTaskView } from '@/lib/api';
import type { GenerationTask, PublicProfileResponse } from '@/lib/types';
import type { SupportedLocale } from '@/lib/model-presenter';
import PublicTaskCard, { getTaskLikesCount } from '@/components/explore/PublicTaskCard';
import TaskDetailDrawer from '@/components/explore/TaskDetailDrawer';
import { getUserAvatarUrl, getUserDisplayName, getUserInitials } from '@/lib/user-presenter';
import { useAuth } from '@/components/AuthContext';

type ExploreTask = GenerationTask & {
  is_hot?: boolean;
  like_count?: number;
};

type ProfileCategory = 'all' | 'image' | 'video' | 'audio';

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = Number(params?.id);
  const t = useTranslations('PublicProfile');
  const exploreT = useTranslations('Explore');
  const locale = useLocale() as SupportedLocale;
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState<ProfileCategory>('all');
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [likes, setLikes] = useState<number[]>([]);
  const viewedTaskIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(profileId)) return;
      setLoading(true);
      try {
        const [profile, likesRes] = await Promise.all([
          getPublicProfile(profileId, activeCategory),
          user ? apiClient.get('/ai/likes').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);
        setData(profile);
        setLikes((likesRes.data as Array<{ id: number }>).map((like) => like.id));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeCategory, profileId, user]);

  const likesSet = useMemo(() => new Set(likes), [likes]);
  const selectedTask = selectedTaskId ? data?.tasks.find((task) => task.id === selectedTaskId) ?? null : null;

  const openTask = async (task: ExploreTask) => {
    setSelectedTaskId(task.id);
    if (viewedTaskIdsRef.current.has(task.id)) return;
    viewedTaskIdsRef.current.add(task.id);

    try {
      const response = await incrementPublicTaskView(task.id);
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          stats: {
            ...current.stats,
            views: current.stats.views + 1,
          },
          tasks: current.tasks.map((item) => (
            item.id === task.id
              ? { ...item, view_count: response.view_count ?? ((item.view_count ?? 0) + 1) }
              : item
          )),
          top_tasks: current.top_tasks.map((item) => (
            item.id === task.id
              ? { ...item, view_count: response.view_count ?? ((item.view_count ?? 0) + 1) }
              : item
          )),
        };
      });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleLike = async (taskId: number) => {
    if (!user) {
      toast.error(exploreT('login_to_like'));
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

      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          stats: {
            ...current.stats,
            likes: Math.max(0, current.stats.likes + (liked ? 1 : -1)),
          },
          tasks: current.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const nextLikes = Math.max(0, getTaskLikesCount(task) + (liked ? 1 : -1));
            return {
              ...task,
              likes_count: nextLikes,
              like_count: nextLikes,
            };
          }),
          top_tasks: current.top_tasks.map((task) => {
            if (task.id !== taskId) return task;
            const nextLikes = Math.max(0, getTaskLikesCount(task) + (liked ? 1 : -1));
            return {
              ...task,
              likes_count: nextLikes,
              like_count: nextLikes,
            };
          }),
        };
      });
    } catch (error) {
      console.error(error);
      toast.error(exploreT('failedToUpdateLike'));
    }
  };

  const tabButtons = [
    { id: 'all' as const, icon: Grid3X3, label: exploreT('all'), count: data?.stats.counts.all ?? 0 },
    { id: 'image' as const, icon: ImageIcon, label: exploreT('image'), count: data?.stats.counts.image ?? 0 },
    { id: 'video' as const, icon: Film, label: exploreT('video'), count: data?.stats.counts.video ?? 0 },
    { id: 'audio' as const, icon: Music, label: exploreT('audio'), count: data?.stats.counts.audio ?? 0 },
  ];

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 pb-12 pt-20 md:px-8 md:pt-10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          <span className="text-sm text-zinc-500">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 pb-12 pt-20 md:px-8 md:pt-10">
        <div className="rounded-[1.8rem] border border-dashed border-white/10 bg-black/20 px-8 py-12 text-center text-zinc-500">
          {t('not_found')}
        </div>
      </div>
    );
  }

  const displayName = getUserDisplayName(data.profile);
  const avatarUrl = getUserAvatarUrl(data.profile);
  const initials = getUserInitials(data.profile);

  return (
    <div className="relative isolate mx-auto min-h-screen w-full max-w-7xl overflow-hidden px-4 pb-12 pt-20 md:px-8 md:pb-14 md:pt-10">
      <div className="pointer-events-none absolute inset-x-[-12%] top-8 -z-10 h-[30rem] bg-[radial-gradient(circle_at_18%_20%,rgba(255,107,74,0.1),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(34,199,184,0.12),transparent_28%)] blur-[84px]" />

      <section className="mb-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.94),rgba(8,10,14,0.84))] px-5 py-6 shadow-[0_24px_56px_rgba(0,0,0,0.24)] md:px-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.7rem] bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] text-xl font-bold text-white shadow-[0_24px_56px_rgba(0,0,0,0.24)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-200">
                <Sparkles className="h-3.5 w-3.5 text-[#ffd166]" />
                {t('badge')}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{displayName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">{t('description')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-xl font-semibold text-white">{data.stats.posts}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{t('posts')}</div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-xl font-semibold text-white">{data.stats.likes}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{t('likes')}</div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-xl font-semibold text-white">{data.stats.views}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{t('views')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.88),rgba(8,10,14,0.78))] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.18)] md:w-fit">
          {tabButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => {
                setSelectedTaskId(null);
                setActiveCategory(button.id);
              }}
              className={`flex min-w-[calc(50%-0.1875rem)] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:min-w-[unset] sm:flex-none md:px-4 md:py-2 ${activeCategory === button.id ? 'bg-white text-[#06070a] shadow-lg shadow-black/20' : 'text-zinc-300 hover:text-white'}`}
            >
              <button.icon className="h-3.5 w-3.5" />
              {button.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeCategory === button.id ? 'bg-black/10 text-[#06070a]' : 'bg-white/8 text-zinc-500'}`}>
                {button.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">{t('top_posts')}</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{t('top_posts_desc')}</p>
          </div>
        </div>

        {data.tasks.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/20 py-16 text-center text-zinc-500">
            {t('empty')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.tasks.map((task) => (
              <PublicTaskCard
                key={task.id}
                task={task}
                locale={locale}
                showAuthor={false}
                onClick={() => openTask(task)}
              />
            ))}
          </div>
        )}
      </section>

      <TaskDetailDrawer
        task={selectedTask}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        isLiked={selectedTask ? likesSet.has(selectedTask.id) : false}
        onLike={selectedTask ? () => toggleLike(selectedTask.id) : undefined}
      />
    </div>
  );
}
