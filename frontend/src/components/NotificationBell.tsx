'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';

import { useAuth } from '@/components/AuthContext';
import { markAllNotificationsRead, markNotificationRead, getMyNotifications } from '@/lib/api';
import type { UserNotification } from '@/lib/types';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';

const POLL_MS = 30000;
const LIST_LIMIT = 12;

type NotificationBellProps = {
  compact?: boolean;
  mode?: 'desktop' | 'mobile' | 'any';
};

const COPY = {
  ru: {
    title: 'Уведомления',
    empty: 'Пока нет уведомлений.',
    markAll: 'Отметить все',
    markOne: 'Отметить как прочитанное',
    openProjects: 'Открыть проекты',
    unreadSuffix: 'непрочитанных',
    queuedTitle: 'Генерация запущена',
    queuedMessage: 'Задача принята в работу.',
    doneTitle: 'Генерация готова',
    doneMessage: 'Результат уже доступен в ваших проектах.',
    failedTitle: 'Генерация не удалась',
    failedMessage: 'Кредиты возвращены на баланс.',
    pendingMessage: 'Провайдер не подтвердил запуск. Кредиты пока зарезервированы; проверьте статус позже или обратитесь в поддержку.',
  },
  en: {
    title: 'Notifications',
    empty: 'No notifications yet.',
    markAll: 'Mark all',
    markOne: 'Mark as read',
    openProjects: 'Open projects',
    unreadSuffix: 'unread',
    queuedTitle: 'Generation started',
    queuedMessage: 'Your task is now in progress.',
    doneTitle: 'Generation completed',
    doneMessage: 'Your result is ready in My Creations.',
    failedTitle: 'Generation failed',
    failedMessage: 'Credits were returned to your balance.',
    pendingMessage: 'The provider did not confirm the request. Credits remain reserved; check the status later or contact support.',
  },
} as const;

function formatNotification(notification: UserNotification, locale: 'ru' | 'en') {
  const copy = COPY[locale];
  const metadata = notification.metadata || {};
  const model = typeof metadata.model === 'string' ? metadata.model : '';
  const errorMessage = typeof metadata.error_message === 'string' ? metadata.error_message : '';
  const creditsRefunded = Boolean(metadata.credits_refunded);
  const providerStatus = typeof metadata.provider_status === 'string' ? metadata.provider_status : '';
  const providerPending = providerStatus === 'provider_confirmation_pending' || providerStatus === 'worker_confirmation_timeout';

  if (notification.kind === 'generation_queued') {
    return {
      title: copy.queuedTitle,
      message: model ? `${copy.queuedMessage} ${model}` : copy.queuedMessage,
    };
  }

  if (notification.kind === 'generation_completed') {
    return {
      title: copy.doneTitle,
      message: model ? `${copy.doneMessage} ${model}` : copy.doneMessage,
    };
  }

  if (notification.kind === 'generation_failed') {
    if (providerPending || (!creditsRefunded && !errorMessage)) {
      return {
        title: copy.failedTitle,
        message: copy.pendingMessage,
      };
    }
    const refundedText = creditsRefunded ? copy.failedMessage : errorMessage || notification.message || '';
    return {
      title: copy.failedTitle,
      message: errorMessage ? `${refundedText} ${errorMessage}`.trim() : refundedText,
    };
  }

  return {
    title: notification.title || copy.title,
    message: notification.message || '',
  };
}

export default function NotificationBell({ compact = false, mode = 'any' }: NotificationBellProps) {
  const { user } = useAuth();
  const locale = useLocale() === 'ru' ? 'ru' : 'en';
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewportReady, setViewportReady] = useState(mode === 'any');
  const [viewportVisible, setViewportVisible] = useState(mode === 'any');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (mode === 'any') return;

    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      setViewportVisible(mode === 'desktop' ? media.matches : !media.matches);
      setViewportReady(true);
    };
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, [mode]);

  const loadNotifications = useCallback(async () => {
    if (!user || !viewportVisible || document.visibilityState === 'hidden') return;
    setLoading(true);
    try {
      const data = await getMyNotifications(LIST_LIMIT);
      setItems(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // ignore transient failures
    } finally {
      setLoading(false);
    }
  }, [user, viewportVisible]);

  useEffect(() => {
    if (!user || !viewportVisible) {
      setItems([]);
      setUnreadCount(0);
      setOpen(false);
      return;
    }

    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, POLL_MS);

    const handleRefresh = () => {
      void loadNotifications();
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('globus:notifications-refresh', handleRefresh as EventListener);
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('globus:notifications-refresh', handleRefresh as EventListener);
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [loadNotifications, user, viewportVisible]);

  const hasUnread = unreadCount > 0;
  const copy = COPY[locale];

  const buttonClassName = useMemo(
    () =>
      compact
        ? 'relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white'
        : 'relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white',
    [compact],
  );

  const handleOpenProjects = async (notification: UserNotification) => {
    if (!notification.is_read) {
      try {
        const data = await markNotificationRead(notification.id, LIST_LIMIT);
        setItems(data.items || []);
        setUnreadCount(data.unread_count || 0);
      } catch {
        // ignore and still navigate
      }
    }
    setOpen(false);
    router.push('/my-creations');
  };

  const handleMarkOne = async (notificationId: number) => {
    try {
      const data = await markNotificationRead(notificationId, LIST_LIMIT);
      setItems(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // ignore
    }
  };

  const handleMarkAll = async () => {
    try {
      const data = await markAllNotificationsRead(LIST_LIMIT);
      setItems(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // ignore
    }
  };

  if (!user || !viewportReady || !viewportVisible) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            void loadNotifications();
          }
        }}
        className={buttonClassName}
        aria-label={copy.title}
      >
        <Bell className={compact ? 'h-4.5 w-4.5' : 'h-5 w-5'} />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_40%,#22c7b8)] px-1 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(255,107,74,0.26)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(92vw,24rem)] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.97),rgba(8,10,14,0.96))] shadow-[0_26px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">{copy.title}</div>
              <div className="text-[11px] text-zinc-500">{unreadCount} {copy.unreadSuffix}</div>
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/[0.07]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {copy.markAll}
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto p-2">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-8 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">{copy.empty}</div>
            ) : null}

            {items.map((item) => {
              const formatted = formatNotification(item, locale);
              return (
                <div
                  key={item.id}
                  className={`group mb-2 rounded-[1.15rem] border px-3 py-3 transition ${
                    item.is_read ? 'border-white/6 bg-white/[0.03]' : 'border-white/12 bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void handleOpenProjects(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${item.is_read ? 'bg-zinc-600' : 'bg-[#ffd166]'}`} />
                        <div className="truncate text-sm font-semibold text-white">{formatted.title}</div>
                      </div>
                      <div className="mt-1 line-clamp-3 text-sm leading-6 text-zinc-300">{formatted.message}</div>
                      <div className="mt-2 text-[11px] font-medium text-zinc-500">{copy.openProjects}</div>
                    </button>

                    {!item.is_read ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkOne(item.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
                        aria-label={copy.markOne}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
