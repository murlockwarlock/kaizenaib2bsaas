'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { getMe, apiClient, getMyBillingPlan, updateMyProfile, uploadImage } from '@/lib/api';
import { Coins, Sparkles, ArrowRight, Clock, TrendingUp, Zap, Image, Video, Music, Upload } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { BillingPlanStatus } from '@/lib/types';
import { getUserAvatarUrl, getUserDisplayName, getUserInitials } from '@/lib/user-presenter';

interface UserData {
    id: number;
    email: string;
    display_name?: string | null;
    avatar_url?: string | null;
    balance: number;
}

interface Task {
    id: number;
    category: string;
    status: string;
    output_url: string | null;
    model: string;
    created_at: string;
}

export default function DashboardPage() {
    const t = useTranslations('Navigation');
    const td = useTranslations('Dashboard');
    const locale = useLocale();
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [planStatus, setPlanStatus] = useState<BillingPlanStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userData, tasksRes, billingPlan] = await Promise.all([
                    getMe(),
                    apiClient.get('/ai/my-creations?per_page=6').catch(() => ({ data: { items: [] } })),
                    getMyBillingPlan().catch(() => null),
                ]);
                setUser(userData);
                setDisplayName(userData.display_name || '');
                setAvatarUrl(userData.avatar_url || '');
                const raw = tasksRes.data;
                setTasks(Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []);
                setPlanStatus(billingPlan);
            } catch {
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-500">{td('loading')}</span>
                </div>
            </div>
        );
    }

    if (!user) return null;
    const presentedName = getUserDisplayName(user);
    const presentedAvatar = getUserAvatarUrl({ avatar_url: avatarUrl || user.avatar_url });
    const presentedInitials = getUserInitials({ display_name: displayName || user.display_name, email: user.email });

    const now = new Date();
    const thisMonthCount = tasks.filter(task => {
        const d = new Date(task.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    const recentTasks = tasks
        .filter(task => task.status === 'success' && task.output_url)
        .slice(0, 4);
    const currentPlan = planStatus?.current_plan ?? null;
    const nextPlan = planStatus?.next_plan ?? null;
    const currentPlanName = currentPlan ? (locale === 'ru' ? currentPlan.name_ru : currentPlan.name_en) : td('free_plan');
    const nextPlanName = nextPlan ? (locale === 'ru' ? nextPlan.name_ru : nextPlan.name_en) : null;

    const stats = [
        { label: td('credits_balance'), value: user.balance, icon: Coins, color: 'from-amber-500 to-orange-400' },
        { label: td('generations'), value: tasks.length, icon: Sparkles, color: 'from-violet-500 to-purple-400' },
        { label: td('this_month'), value: thisMonthCount, icon: TrendingUp, color: 'from-blue-500 to-cyan-400' },
    ];

    const getCategoryIcon = (category: string) => {
        if (category === 'video') return Video;
        if (category === 'audio') return Music;
        return Image;
    };

    const getCategoryLabel = (category: string) => {
        if (category === 'video') return td('video_generation');
        if (category === 'audio') return td('audio_generation');
        if (category === 'image' || category === 'images') return td('image_generation');
        return td('generation');
    };

    return (
        <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-20 sm:px-5 md:p-10 md:pt-10">
            {/* Welcome header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">{t('dashboard')}</h1>
                <p className="text-sm text-zinc-500">{td('welcome_back')}, {presentedName}</p>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 hover:border-zinc-700 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                                    <Icon className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white">{stat.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Profile + History */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Profile Card */}
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-violet-500/20">
                            {presentedAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={presentedAvatar} alt={presentedName} className="h-full w-full object-cover" />
                            ) : (
                                presentedInitials
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm truncate max-w-[180px]">{presentedName}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[180px]">{user.email}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{currentPlanName}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-t border-zinc-800/60">
                            <span className="text-sm text-zinc-500">{td('credits_balance')}</span>
                            <div className="flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-sm font-semibold text-amber-400">{user.balance}</span>
                            </div>
                        </div>
                        {currentPlan ? (
                            <div className="flex justify-between items-center py-2 border-t border-zinc-800/60">
                                <span className="text-sm text-zinc-500">{td('current_plan')}</span>
                                <span className="text-sm font-semibold text-white">{currentPlanName}</span>
                            </div>
                        ) : null}
                        {nextPlanName ? (
                            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{td('next_plan')}</div>
                                <div className="mt-1 text-sm font-semibold text-white">{nextPlanName}</div>
                            </div>
                        ) : null}
                        <Link
                            href="/pricing"
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/20 transition-all"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            {nextPlanName ? td('upgrade_to', { plan: nextPlanName }) : td('upgrade_plan')}
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                    <div className="mb-5">
                        <h2 className="font-semibold text-white">{td('profile_title')}</h2>
                        <p className="mt-1 text-sm text-zinc-500">{td('profile_desc')}</p>
                    </div>

                    <div className="mb-5 flex items-center gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-lg font-bold text-white">
                            {presentedAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={presentedAvatar} alt={presentedName} className="h-full w-full object-cover" />
                            ) : (
                                presentedInitials
                            )}
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]">
                            <Upload className="h-4 w-4" />
                            {isUploadingAvatar ? td('profile_uploading') : td('profile_upload')}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const input = e.currentTarget;
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIsUploadingAvatar(true);
                                    try {
                                        const uploaded = await uploadImage(file);
                                        setAvatarUrl(uploaded.url);
                                    } finally {
                                        setIsUploadingAvatar(false);
                                        input.value = '';
                                    }
                                }}
                            />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <label className="block">
                            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">{td('profile_nickname')}</span>
                            <input
                                type="text"
                                maxLength={40}
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={td('profile_nickname_placeholder')}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-violet-500/40"
                            />
                        </label>
                        <button
                            type="button"
                            disabled={isSavingProfile}
                            onClick={async () => {
                                setIsSavingProfile(true);
                                try {
                                    const updated = await updateMyProfile({
                                        display_name: displayName.trim() || null,
                                        avatar_url: avatarUrl || null,
                                    });
                                    setUser(updated);
                                    setDisplayName(updated.display_name || '');
                                    setAvatarUrl(updated.avatar_url || '');
                                    window.dispatchEvent(new Event('globus:user-refresh'));
                                } finally {
                                    setIsSavingProfile(false);
                                }
                            }}
                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:from-violet-500 hover:to-blue-500 disabled:opacity-60"
                        >
                            {isSavingProfile ? td('profile_saving') : td('profile_save')}
                        </button>
                    </div>
                </div>

                {/* Recent Generations */}
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-500" />
                            {td('recent_generations')}
                        </h2>
                        {recentTasks.length > 0 && (
                            <Link
                                href="/my-creations"
                                className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors flex items-center gap-1"
                            >
                                {td('view_all')}
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>

                    {recentTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-800 rounded-xl">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                                <Sparkles className="w-6 h-6 text-zinc-600" />
                            </div>
                            <p className="text-sm text-zinc-500 mb-3">{td('no_generations')}</p>
                            <Link
                                href="/catalog"
                                className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
                            >
                                {td('start_creating')}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {recentTasks.map((task) => {
                                const CategoryIcon = getCategoryIcon(task.category);
                                return (
                                    <div key={task.id} className="rounded-xl overflow-hidden border border-zinc-800/60 bg-zinc-950 group relative">
                                        {task.category === 'video' ? (
                                            <video
                                                src={task.output_url!}
                                                className="w-full aspect-square object-cover"
                                                muted loop autoPlay playsInline
                                            />
                                        ) : task.category === 'audio' ? (
                                            <div className="w-full aspect-square bg-zinc-900 flex items-center justify-center">
                                                <Music className="w-8 h-8 text-zinc-600" />
                                            </div>
                                        ) : (
                                            <img
                                                src={task.output_url!}
                                                alt={task.model}
                                                className="w-full aspect-square object-cover"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                            <span className="text-[10px] text-white font-medium flex items-center gap-1">
                                                <CategoryIcon className="w-3 h-3" />
                                                {getCategoryLabel(task.category)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
