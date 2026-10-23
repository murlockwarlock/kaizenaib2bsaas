'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import { getBillingPayment, refreshBillingPayment } from '@/lib/api';
import type { BillingPayment } from '@/lib/types';

export default function PricingCheckoutSuccessPage() {
  const t = useTranslations('Pricing');
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const paymentId = searchParams.get('payment');
  const [payment, setPayment] = useState<BillingPayment | null>(null);
  const balanceSyncDoneRef = useRef(false);

  useEffect(() => {
    if (!paymentId) return;

    let canceled = false;
    const load = async () => {
      try {
        const current = await refreshBillingPayment(paymentId);
        if (!canceled) {
          setPayment(current);
        }
      } catch {
        try {
          const fallback = await getBillingPayment(paymentId);
          if (!canceled) {
            setPayment(fallback);
          }
        } catch {
          if (!canceled) {
            setPayment(null);
          }
        }
      }
    };

    load();
    return () => {
      canceled = true;
    };
  }, [paymentId]);

  useEffect(() => {
    if (payment?.status !== 'succeeded' || balanceSyncDoneRef.current) return;

    balanceSyncDoneRef.current = true;
    void refreshUser();
    window.dispatchEvent(new Event('globus:user-refresh'));
  }, [payment?.status, refreshUser]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 pt-20">
      <div className="panel-surface w-full rounded-[2rem] border border-white/10 p-8 text-center">
        {payment?.status === 'succeeded' ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-300" />
            <h1 className="mt-6 text-3xl font-semibold text-white">{t('success_title')}</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t('success_desc', { credits: String(payment.credits) })}</p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-5 py-3 text-sm font-semibold text-white"
            >
              {t('go_to_dashboard')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-white" />
            <h1 className="mt-6 text-3xl font-semibold text-white">{t('success_pending_title')}</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t('success_pending_desc')}</p>
            <Link
              href={paymentId ? `/pricing/checkout?payment=${paymentId}` : '/pricing'}
              className="mt-8 inline-flex items-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white"
            >
              {t('return_to_payment')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
