'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import { apiClient } from '@/lib/api';
import { getTrackedGenerations, subscribeTrackedGenerations, untrackGeneration } from '@/lib/generation-tracker';
import { getGenerationFailureDescription } from '@/lib/generation-alerts';
import { ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';

const SUCCESS_STATES = new Set(['success', 'completed']);
const FAILURE_STATES = new Set(['failed', 'error', 'submission_unknown']);

function playNotificationSound() {
  if (typeof window === 'undefined') return;

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.03, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);

    const oscA = context.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.setValueAtTime(880, context.currentTime);
    oscA.connect(gain);

    const oscB = context.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(1174, context.currentTime + 0.16);
    oscB.connect(gain);

    oscA.start(context.currentTime);
    oscA.stop(context.currentTime + 0.2);
    oscB.start(context.currentTime + 0.16);
    oscB.stop(context.currentTime + 0.38);

    window.setTimeout(() => {
      context.close().catch(() => {});
    }, 700);
  } catch {
    // Ignore unsupported audio contexts or autoplay restrictions.
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (document.visibilityState === 'visible') return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      tag: 'globus-generation-status',
      silent: true,
    });

    window.setTimeout(() => notification.close(), 9000);
  } catch {
    // Ignore notification API failures.
  }
}

function refreshNotifications() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('globus:notifications-refresh'));
}

function GenerationToastCard({
  icon,
  accentClass,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  accentClass: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="w-[min(92vw,24rem)] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(8,10,14,0.94))] shadow-[0_26px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="flex items-start gap-4 p-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] ${accentClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-zinc-300">{description}</div>
          <button
            type="button"
            onClick={onAction}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            {actionLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GenerationStatusNotifier() {
  const { user } = useAuth();
  const t = useTranslations('GenerationAlerts');
  const router = useRouter();
  const inFlightRef = useRef<Set<number>>(new Set());
  const providerIssueNoticeRef = useRef<Set<number>>(new Set());
  const [trackedCount, setTrackedCount] = useState(() => getTrackedGenerations().length);

  useEffect(() => {
    return subscribeTrackedGenerations((items) => {
      setTrackedCount(items.length);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (trackedCount <= 0) return;

    let cancelled = false;

    const pollTrackedGenerations = async () => {
      const tracked = getTrackedGenerations();
      if (!tracked.length) return;

      await Promise.all(
        tracked.map(async (item) => {
          if (inFlightRef.current.has(item.taskId)) return;
          inFlightRef.current.add(item.taskId);

          try {
            const response = await apiClient.get(`/ai/status/${item.taskId}`);
            const status = String(response.data?.status || '').toLowerCase();

            if (SUCCESS_STATES.has(status)) {
              providerIssueNoticeRef.current.delete(item.taskId);
              if (!cancelled) {
                refreshNotifications();
                playNotificationSound();
                const description = t('completed_desc');
                showBrowserNotification(t('completed_title'), description);
                toast.custom(() => (
                  <GenerationToastCard
                    icon={<CheckCircle2 className="h-5 w-5 text-emerald-100" />}
                    accentClass="bg-emerald-500/16 text-emerald-200"
                    title={t('completed_title')}
                    description={description}
                    actionLabel={t('open_projects')}
                    onAction={() => router.push('/my-creations')}
                  />
                ), {
                  duration: 12000,
                  id: `generation-success-${item.taskId}`,
                });
              }
              untrackGeneration(item.taskId);
              return;
            }

            if (FAILURE_STATES.has(status)) {
              providerIssueNoticeRef.current.delete(item.taskId);
              if (!cancelled) {
                refreshNotifications();
                const errorMessage = response.data?.error_message as string | null | undefined;
                const description = getGenerationFailureDescription(
                  errorMessage,
                  t,
                  response.data?.credits_refunded !== false && status !== 'submission_unknown',
                );
                showBrowserNotification(t('failed_title'), description);
                toast.custom(() => (
                  <GenerationToastCard
                    icon={<XCircle className="h-5 w-5 text-rose-100" />}
                    accentClass="bg-rose-500/16 text-rose-200"
                    title={t('failed_title')}
                    description={description}
                    actionLabel={t('open_projects')}
                    onAction={() => router.push('/my-creations')}
                  />
                ), {
                  duration: 10000,
                  id: `generation-failed-${item.taskId}`,
                });
              }
              untrackGeneration(item.taskId);
              return;
            }

            const providerStatus = String(response.data?.provider_status || '').toLowerCase();
            if (providerStatus === 'provider_status_unavailable') {
              if (!providerIssueNoticeRef.current.has(item.taskId)) {
                providerIssueNoticeRef.current.add(item.taskId);
                const description = t('provider_pending_desc');
                showBrowserNotification(t('provider_pending_title'), description);
                toast.custom(() => (
                  <GenerationToastCard
                    icon={<XCircle className="h-5 w-5 text-amber-100" />}
                    accentClass="bg-amber-500/16 text-amber-200"
                    title={t('provider_pending_title')}
                    description={description}
                    actionLabel={t('open_projects')}
                    onAction={() => router.push('/my-creations')}
                  />
                ), {
                  duration: 10000,
                  id: `generation-provider-pending-${item.taskId}`,
                });
              }
            } else {
              providerIssueNoticeRef.current.delete(item.taskId);
            }
          } catch {
            // Ignore transient polling errors and retry on next tick.
          } finally {
            inFlightRef.current.delete(item.taskId);
          }
        })
      );
    };

    pollTrackedGenerations();
    const intervalId = window.setInterval(pollTrackedGenerations, 6000);
    const inFlightTasks = inFlightRef.current;
    const providerIssueNotices = providerIssueNoticeRef.current;

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      inFlightTasks.clear();
      providerIssueNotices.clear();
    };
  }, [router, t, trackedCount, user]);

  return null;
}
