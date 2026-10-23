'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, Download, Eye, Heart, Info, Wand2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link, useRouter } from '@/i18n/routing';
import type { GenerationTask } from '@/lib/types';
import {
  getEditorCategory,
  getModelDisplayName,
  getModelFamilyLabel,
  getModelWorkflowLabel,
  getTaskPrompt,
  type SupportedLocale,
} from '@/lib/model-presenter';
import { getUserAvatarUrl, getUserDisplayName, getUserInitials } from '@/lib/user-presenter';
import {
  PublicTaskMedia,
  getPublicTaskHeadline,
  getPublicTaskMediaType,
  getTaskLikesCount,
  normalizePublicMediaSrc,
} from '@/components/explore/PublicTaskCard';

type ExploreTask = GenerationTask & {
  is_hot?: boolean;
  like_count?: number;
};

type DetailEntry = {
  key: string;
  label: string;
  value: string;
};

function formatDate(value: string | null | undefined, locale: SupportedLocale, full = false) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale, full ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }).format(parsed);
}

function getBoolValue(value: unknown, t: ReturnType<typeof useTranslations>) {
  if (typeof value !== 'boolean') return null;
  return value ? t('yes') : t('no');
}

function buildInfoEntries(task: ExploreTask, locale: SupportedLocale, t: ReturnType<typeof useTranslations>): DetailEntry[] {
  const snapshot = (task.settings_snapshot && typeof task.settings_snapshot === 'object') ? task.settings_snapshot : null;
  const entries: DetailEntry[] = [];
  const push = (key: string, label: string, value: unknown) => {
    if (value === null || value === undefined) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    entries.push({ key, label, value: normalized });
  };

  push('model', t('info_model'), getModelDisplayName(task.model));
  push('family', t('info_family'), getModelFamilyLabel(task.model, task.category, locale));
  push('workflow', t('info_workflow'), getModelWorkflowLabel(task.model, task.category, locale));
  push('quality', t('info_quality'), snapshot?.resolution ?? task.resolution ?? null);
  push('date', t('info_date'), formatDate(task.created_at, locale, true));
  push('views', t('views_label'), task.view_count ?? 0);
  push('likes', t('likes_label'), getTaskLikesCount(task));
  push('duration', t('info_duration'), snapshot?.duration ?? task.duration ?? null);
  push('aspect_ratio', t('info_aspect_ratio'), snapshot?.aspect_ratio ?? null);
  push('references', t('info_references'), snapshot?.reference_count ?? null);
  push('mode', t('info_mode'), snapshot?.generation_mode ?? null);
  push('frame_count', t('info_frame_count'), snapshot?.frame_count ?? null);
  push('output_format', t('info_output_format'), snapshot?.output_format ?? null);
  push('images', t('info_images'), snapshot?.num_images ?? null);
  push('acceleration', t('info_acceleration'), snapshot?.acceleration ?? null);

  const soundValue = getBoolValue(snapshot?.sound_enabled, t);
  if (soundValue) push('sound_enabled', t('info_sound'), soundValue);

  const watermarkValue = getBoolValue(snapshot?.remove_watermark, t);
  if (watermarkValue) push('remove_watermark', t('info_watermark'), watermarkValue);

  return entries;
}

export default function TaskDetailDrawer({
  task,
  open,
  onClose,
  isLiked,
  onLike,
}: {
  task: ExploreTask | null;
  open: boolean;
  onClose: () => void;
  isLiked?: boolean;
  onLike?: () => void;
}) {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations('Explore');
  const router = useRouter();
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [showAllInfo, setShowAllInfo] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowFullPrompt(false);
      setShowAllInfo(false);
    }
  }, [open]);

  const prompt = task ? getTaskPrompt(task) : null;
  const authorName = task ? getUserDisplayName(task) : '';
  const authorAvatar = task ? getUserAvatarUrl(task) : null;
  const authorInitials = task ? getUserInitials(task) : 'G';
  const infoEntries = useMemo(() => (task ? buildInfoEntries(task, locale, t) : []), [locale, t, task]);
  const visibleInfoEntries = showAllInfo ? infoEntries : infoEntries.slice(0, 5);
  const hasMoreInfo = infoEntries.length > 5;
  const mediaType = task ? getPublicTaskMediaType(task) : 'image';

  const usePrompt = () => {
    if (!task || !prompt) return;
    const category = getEditorCategory(task.category);
    router.push(`/${category}?prompt=${encodeURIComponent(prompt)}&model=${encodeURIComponent(task.model || '')}`);
  };

  return (
    <AnimatePresence>
      {open && task ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-y-0 right-0 flex h-full w-full max-w-[100vw] flex-col overflow-hidden border-l border-white/10 bg-[linear-gradient(180deg,rgba(11,14,20,0.98),rgba(6,8,11,0.98))] shadow-[0_32px_96px_rgba(0,0,0,0.42)] lg:max-w-[min(1320px,100vw)] lg:flex-row"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex min-h-[34vh] flex-1 items-center justify-center overflow-hidden bg-black lg:min-h-full">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,107,74,0.14),transparent_24%),radial-gradient(circle_at_78%_14%,rgba(34,199,184,0.16),transparent_28%),linear-gradient(180deg,rgba(10,12,16,0.98),rgba(3,4,6,1))]" />
              <div className="relative h-full w-full">
                {mediaType === 'video' ? (
                  <video
                    src={normalizePublicMediaSrc(task.output_url || '')}
                    className="h-full w-full object-contain"
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <PublicTaskMedia task={task} locale={locale} fill prioritizeAudioControls />
                )}
              </div>
            </div>

            <aside className="relative flex w-full shrink-0 flex-col border-t border-white/8 bg-[linear-gradient(180deg,rgba(12,16,23,0.98),rgba(8,10,14,0.98))] lg:w-[430px] lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{getModelFamilyLabel(task.model, task.category, locale)}</div>
                  <div className="mt-1 text-lg font-semibold text-white">{getPublicTaskHeadline(task, locale)}</div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:border-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                {task.author_id ? (
                  <Link
                    href={`/profile/${task.author_id}`}
                    className="flex items-center gap-3 rounded-[1.45rem] border border-white/10 bg-white/[0.04] p-3 transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.1rem] bg-[linear-gradient(145deg,#ff6b4a,#22c7b8)] text-sm font-bold text-white">
                      {authorAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
                      ) : (
                        authorInitials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{t('author_label')}</div>
                      <div className="mt-1 truncate text-base font-semibold text-white">{authorName}</div>
                    </div>
                    <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-zinc-500" />
                  </Link>
                ) : null}

                <section className="rounded-[1.55rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    <Info className="h-3.5 w-3.5 text-[#ffd166]" />
                    {t('prompt_label')}
                  </div>
                  {prompt ? (
                    <>
                      <p className={`mt-3 text-sm leading-7 text-zinc-200 ${showFullPrompt ? '' : 'line-clamp-5'}`}>{prompt}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={usePrompt}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          {t('use_prompt_button')}
                        </button>
                        {prompt.length > 220 ? (
                          <button
                            type="button"
                            onClick={() => setShowFullPrompt((value) => !value)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                          >
                            {showFullPrompt ? t('see_less') : t('see_all')}
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-zinc-500">{t('no_prompt_public')}</p>
                  )}
                </section>

                <section className="rounded-[1.55rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    <Info className="h-3.5 w-3.5 text-cyan-300" />
                    {t('information_label')}
                  </div>
                  <div className="mt-4 space-y-3">
                    {visibleInfoEntries.map((entry) => (
                      <div key={entry.key} className="flex items-start justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-3.5 py-3">
                        <div className="text-xs font-medium text-zinc-500">{entry.label}</div>
                        <div className="max-w-[62%] text-right text-sm font-semibold text-white">{entry.value}</div>
                      </div>
                    ))}
                  </div>
                  {hasMoreInfo ? (
                    <button
                      type="button"
                      onClick={() => setShowAllInfo((value) => !value)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                    >
                      {showAllInfo ? t('see_less') : t('see_all')}
                    </button>
                  ) : null}
                </section>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/8 px-5 py-4">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <Heart className="h-3.5 w-3.5 text-pink-300" />
                    {t('likes_label')}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{getTaskLikesCount(task)}</div>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <Eye className="h-3.5 w-3.5 text-cyan-300" />
                    {t('views_label')}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{task.view_count ?? 0}</div>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <CalendarDays className="h-3.5 w-3.5 text-[#ffd166]" />
                    {t('posted_label')}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{formatDate(task.created_at, locale) || '-'}</div>
                </div>
                <a
                  href={normalizePublicMediaSrc(task.output_url || '')}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                >
                  <Download className="h-4 w-4" />
                  {t('download_button')}
                </a>
                <button
                  type="button"
                  onClick={onLike}
                  disabled={!onLike}
                  className={`inline-flex items-center justify-center gap-2 rounded-[1.35rem] border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isLiked ? 'border-pink-400/30 bg-pink-500/15 text-pink-200' : 'border-white/10 bg-white/[0.05] text-white hover:border-white/20'}`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {t('like_button')}
                </button>
              </div>
            </aside>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
