'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Coins, CreditCard, Loader2, RefreshCcw, ShieldCheck, TicketPercent } from 'lucide-react';

import { Link, useRouter } from '@/i18n/routing';
import { apiClient, createBillingCheckout, getBillingPayment, getBillingQuote, refreshBillingPayment } from '@/lib/api';
import type { BillingPayment, BillingQuote, PricingPlan } from '@/lib/types';
import { useAuth } from '@/components/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';

function formatAmount(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseApiDate(value: string | null) {
  if (!value) return null;
  const withIsoSeparator = value.replace(' ', 'T');
  const normalized = /[zZ]|[+-]\d{2}:\d{2}$/.test(withIsoSeparator) ? withIsoSeparator : `${withIsoSeparator}Z`;
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatCountdown(expiresAt: string | null, nowMs: number) {
  const expiresAtMs = parseApiDate(expiresAt);
  if (!expiresAtMs) return '00:00';
  const diff = expiresAtMs - nowMs;
  if (diff <= 0) return '00:00';
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'detail' in error.response.data &&
    typeof error.response.data.detail === 'string'
  ) {
    return error.response.data.detail;
  }

  return fallback;
}

export default function PricingCheckoutPage() {
  const t = useTranslations('Pricing');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, refreshUser } = useAuth();

  const planId = searchParams.get('plan');
  const paymentId = searchParams.get('payment');
  const mode = searchParams.get('mode');
  const amountParam = searchParams.get('amount');
  const purchaseType = mode === 'credits' ? 'credit_pack' : 'plan';
  const parsedPlanId = useMemo(() => {
    const parsed = Number.parseInt(planId || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [planId]);
  const creditPackAmount = useMemo(() => {
    const parsed = Number.parseFloat(amountParam || '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amountParam]);

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [quote, setQuote] = useState<BillingQuote | null>(null);
  const [payment, setPayment] = useState<BillingPayment | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isRecurringEnabled, setIsRecurringEnabled] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    apiClient.get<PricingPlan[]>('/public/pricing-plans').then((response) => {
      setPlans(response.data || []);
    }).catch(() => {}).finally(() => {
      setPlansLoaded(true);
    });
  }, []);

  const selectedPlan = useMemo(() => {
    if (!parsedPlanId) return null;
    return plans.find((plan) => plan.id === parsedPlanId) || null;
  }, [parsedPlanId, plans]);

  const selectedTitle = useMemo(() => {
    if (quote?.item_name) return quote.item_name;
    if (payment?.description) return payment.description;
    if (purchaseType === 'credit_pack') return t('credit_pack_title');
    if (!selectedPlan) return '';
    return locale === 'ru' ? selectedPlan.name_ru : selectedPlan.name_en;
  }, [locale, payment?.description, purchaseType, quote?.item_name, selectedPlan, t]);

  useEffect(() => {
    if (!paymentId || !user) return;
    getBillingPayment(paymentId).then(setPayment).catch(() => {});
  }, [paymentId, user]);

  useEffect(() => {
    if (!user || paymentId) return;
    if (purchaseType === 'credit_pack') {
      if (!creditPackAmount) {
        setPromoError(t('quote_failed'));
        return;
      }
      getBillingQuote({ purchaseType: 'credit_pack', amountRub: creditPackAmount }).then((response) => {
        setQuote(response);
        setIsRecurringEnabled(false);
        setPromoError('');
      }).catch((error: unknown) => {
        setPromoError(getErrorMessage(error, t('quote_failed')));
      });
      return;
    }
    if (!parsedPlanId) {
      setPromoError(t('quote_failed'));
      return;
    }
    getBillingQuote({ planId: parsedPlanId }).then((response) => {
      setQuote(response);
      setIsRecurringEnabled(response.is_recurring_available);
      setPromoError('');
    }).catch((error: unknown) => {
      setPromoError(getErrorMessage(error, t('quote_failed')));
    });
  }, [creditPackAmount, parsedPlanId, paymentId, purchaseType, t, user]);

  useEffect(() => {
    if (!payment || !paymentId) return;
    if (!['pending', 'waiting_for_capture'].includes(payment.status)) return;

    const interval = window.setInterval(() => {
      refreshBillingPayment(paymentId).then(setPayment).catch(() => {});
    }, 8000);

    return () => window.clearInterval(interval);
  }, [payment, paymentId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (payment?.status !== 'succeeded') return;
    void refreshUser();
    window.dispatchEvent(new Event('globus:user-refresh'));
  }, [payment?.status, refreshUser]);

  const countdown = useMemo(() => formatCountdown(payment?.expires_at || null, nowMs), [nowMs, payment?.expires_at]);

  const applyPromo = async () => {
    if (purchaseType === 'credit_pack') {
      if (!creditPackAmount) return;
      setIsWorking(true);
      try {
        const response = await getBillingQuote({ purchaseType: 'credit_pack', amountRub: creditPackAmount, promoCode });
        setQuote(response);
        setPromoCode(response.promo_code || promoCode.toUpperCase());
        setPromoError('');
        setIsRecurringEnabled(false);
      } catch (error: unknown) {
        setPromoError(getErrorMessage(error, t('promo_failed')));
      } finally {
        setIsWorking(false);
      }
      return;
    }
    if (!parsedPlanId) return;
    setIsWorking(true);
    try {
      const response = await getBillingQuote({ planId: parsedPlanId, promoCode });
      setQuote(response);
      setPromoCode(response.promo_code || promoCode.toUpperCase());
      setPromoError('');
      if (!response.is_recurring_available) {
        setIsRecurringEnabled(false);
      }
    } catch (error: unknown) {
      setPromoError(getErrorMessage(error, t('promo_failed')));
    } finally {
      setIsWorking(false);
    }
  };

  const createPayment = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (purchaseType === 'plan' && !parsedPlanId) return;
    if (purchaseType === 'credit_pack' && !creditPackAmount) return;
    setIsWorking(true);
    try {
      const response = await createBillingCheckout(
        purchaseType === 'credit_pack'
          ? { purchaseType: 'credit_pack', amountRub: creditPackAmount, locale, promoCode, enableRecurring: false }
          : { planId: parsedPlanId!, locale, promoCode, enableRecurring: isRecurringEnabled },
      );
      router.replace(response.checkout_url);
    } catch (error: unknown) {
      setPromoError(getErrorMessage(error, t('payment_create_failed')));
    } finally {
      setIsWorking(false);
    }
  };

  if (!isLoading && !user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 pt-20">
        <div className="panel-surface w-full rounded-[2rem] border border-white/10 p-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-[#ffd166]" />
          <h1 className="mt-5 text-3xl font-semibold text-white">{t('checkout_auth_title')}</h1>
          <p className="mt-3 text-sm text-zinc-300">{t('checkout_auth_desc')}</p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-5 py-3 text-sm font-semibold text-white"
          >
            {t('checkout_auth_button')}
            <ArrowRight className="h-4 w-4" />
          </button>
          <AuthRequiredModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-20 sm:px-5 md:px-6 md:pt-12">
      <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        {t('back_to_pricing')}
      </Link>

      {payment ? (
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="panel-surface rounded-[2rem] border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="accent-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88">
                  <CreditCard className="h-3.5 w-3.5 text-[#ffd166]" />
                  {t('payment_link_title')}
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-white">{t('payment_link_heading')}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">{t('payment_link_desc')}</p>
              </div>
              <div className={`rounded-[1.5rem] border px-4 py-3 text-center ${
                countdown === '00:00' ? 'border-red-500/25 bg-red-500/10' : 'border-[#ff8d68]/20 bg-[#ff8d68]/10'
              }`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">{t('time_left')}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{countdown}</div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('status_label')}</div>
                <div className="mt-2 text-lg font-semibold capitalize text-white">{payment.status}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('amount_label')}</div>
                <div className="mt-2 text-lg font-semibold text-white">{formatAmount(payment.amount, locale)} ₽</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('credits_label')}</div>
                <div className="mt-2 text-lg font-semibold text-white">{payment.credits} {t('credits')}</div>
              </div>
            </div>

            {payment.status === 'succeeded' ? (
              <div className="mt-8 rounded-[1.8rem] border border-emerald-400/20 bg-emerald-400/10 p-5 text-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{t('payment_success_inline')}</div>
                    <div className="text-sm text-emerald-100/85">{t('payment_success_credits', { credits: String(payment.credits) })}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={payment.confirmation_url || '#'}
                  className={`inline-flex items-center gap-2 rounded-[1.25rem] px-5 py-3 text-sm font-semibold ${
                    payment.confirmation_url && countdown !== '00:00'
                      ? 'bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] text-white'
                      : 'cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  {t('open_payment')}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => paymentId && refreshBillingPayment(paymentId).then(setPayment).catch(() => {})}
                  className="inline-flex items-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t('refresh_status')}
                </button>
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,25,0.94),rgba(8,10,14,0.92))] p-6 shadow-[0_22px_56px_rgba(0,0,0,0.24)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('order_summary')}</div>
            <div className="mt-5 space-y-4 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-4">
                <span>{t('amount_label')}</span>
                <span className="font-semibold text-white">{formatAmount(payment.original_amount, locale)} ₽</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{t('discount_label')}</span>
                <span className="font-semibold text-white">-{formatAmount(payment.discount_amount, locale)} ₽</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{t('promo_label')}</span>
                <span className="font-semibold text-white">{payment.promo_code || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{t('credits_label')}</span>
                <span className="font-semibold text-white">{payment.credits}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between gap-4 text-base">
                <span>{t('to_pay')}</span>
                <span className="text-xl font-semibold text-white">{formatAmount(payment.amount, locale)} ₽</span>
              </div>
            </div>
          </aside>
        </section>
      ) : quote ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel-surface rounded-[2rem] border border-white/10 p-6">
            <div className="accent-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88">
              <TicketPercent className="h-3.5 w-3.5 text-[#ffd166]" />
              {t('checkout_title')}
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{selectedTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">{t('checkout_desc')}</p>

            <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('promo_label')}</div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder={t('promo_placeholder')}
                  className="flex-1 rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#ff8d68]/30"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={isWorking}
                  className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white"
                >
                  {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketPercent className="h-4 w-4" />}
                  {t('apply_promo')}
                </button>
              </div>
              {promoError ? <p className="mt-3 text-sm text-red-300">{promoError}</p> : null}
              {quote.promo_code ? <p className="mt-3 text-sm text-emerald-300">{t('promo_applied', { code: quote.promo_code })}</p> : null}
            </div>

            {quote.is_recurring_available ? (
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/8 p-4">
                <input
                  type="checkbox"
                  checked={isRecurringEnabled}
                  onChange={(event) => setIsRecurringEnabled(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{t('recurring_toggle_title')}</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-300">{t('recurring_toggle_desc', { days: String(quote.recurring_days) })}</div>
                </div>
              </label>
            ) : null}

            <button
              type="button"
              onClick={createPayment}
              disabled={isWorking}
              className="mt-8 inline-flex items-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_44px_rgba(255,107,74,0.22)]"
            >
              {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {t('create_payment')}
            </button>
          </motion.div>

          <aside className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,25,0.94),rgba(8,10,14,0.92))] p-6 shadow-[0_22px_56px_rgba(0,0,0,0.24)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('order_summary')}</div>
            <div className="mt-5 space-y-4 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-4">
                <span>{t('selected_product')}</span>
                <span className="font-semibold text-right text-white">{quote.item_name}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{t('amount_label')}</span>
                <span className="font-semibold text-white">{formatAmount(quote.original_amount, locale)} ₽</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{t('discount_label')}</span>
                <span className="font-semibold text-white">-{formatAmount(quote.discount_amount, locale)} ₽</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{t('credits_label')}</span>
                <span className="font-semibold text-white">{quote.credits} {t('credits')}</span>
              </div>
              {quote.purchase_type === 'credit_pack' ? (
                <div className="flex items-center justify-between gap-4">
                  <span>{t('credit_pack_rate_short')}</span>
                  <span className="font-semibold text-white">{formatAmount(quote.credits_rate_per_100, locale)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span>{t('time_left')}</span>
                <span className="font-semibold text-white">{t('payment_link_lifetime')}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between gap-4 text-base">
                <span>{t('to_pay')}</span>
                <span className="text-xl font-semibold text-white">{formatAmount(quote.final_amount, locale)} ₽</span>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <Coins className="h-4.5 w-4.5 text-[#ffd166]" />
                </div>
                <div>
                  <div className="font-semibold text-white">{t('credits_delivery_title')}</div>
                  <div className="mt-1 leading-6">{t('credits_delivery_desc')}</div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      ) : promoError || (purchaseType === 'plan' && plansLoaded && !selectedPlan && !quote) ? (
        <div className="panel-surface rounded-[2rem] border border-red-500/20 bg-red-500/5 p-8 text-center text-zinc-200">
          <p className="text-lg font-semibold text-white">{t('quote_failed')}</p>
          <p className="mt-3 text-sm text-red-200/90">{promoError || 'Pricing plan is unavailable.'}</p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back_to_pricing')}
          </Link>
        </div>
      ) : (
        <div className="panel-surface rounded-[2rem] border border-white/10 p-8 text-center text-zinc-300">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-4">{t('checkout_loading')}</p>
        </div>
      )}

      <AuthRequiredModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </div>
  );
}
