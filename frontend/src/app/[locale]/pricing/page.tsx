'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Coins, Layers3, RefreshCcw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { apiClient } from '@/lib/api';
import type { PricingPlan } from '@/lib/types';
import { useAuth } from '@/components/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';

type PricingPlanView = {
  id: number;
  name: string;
  description: string;
  badge: string;
  billingPeriod: string;
  ctaLabel: string;
  ctaUrl: string;
  features: string[];
  currencySymbol: string;
  price: number;
  credits: number;
  isRecurring: boolean;
  recurringDays: number;
  isFeatured: boolean;
};

function splitFeatures(value: string | null | undefined) {
  return (value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPrice(price: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function PricingPage() {
  const t = useTranslations('Pricing');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [publicSettings, setPublicSettings] = useState<Record<string, string>>({});
  const [creditPackAmount, setCreditPackAmount] = useState('500');
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    apiClient.get<PricingPlan[]>('/public/pricing-plans').then((response) => setPlans(response.data || [])).catch(() => {});
    apiClient.get<Record<string, string>>('/public/settings').then((response) => setPublicSettings(response.data || {})).catch(() => {});
  }, []);

  const creditsPer100Rub = useMemo(() => {
    const value = Number.parseFloat(publicSettings.credits_per_100_rub || '100');
    return Number.isFinite(value) && value > 0 ? value : 100;
  }, [publicSettings]);

  const minAmountRub = useMemo(() => {
    const value = Number.parseFloat(publicSettings.billing_min_amount_rub || '50');
    return Number.isFinite(value) && value > 0 ? value : 50;
  }, [publicSettings]);

  const creditPackAmountNumber = useMemo(() => {
    const value = Number.parseFloat(creditPackAmount);
    return Number.isFinite(value) && value > 0 ? value : minAmountRub;
  }, [creditPackAmount, minAmountRub]);

  const estimatedCredits = useMemo(() => {
    return Math.max(Math.round((creditPackAmountNumber * creditsPer100Rub) / 100), 0);
  }, [creditPackAmountNumber, creditsPer100Rub]);

  const fallbackPlans = useMemo<PricingPlanView[]>(() => [
    {
      id: 0,
      name: t('free_plan'),
      description: t('feature_1'),
      badge: '',
      billingPeriod: locale === 'ru' ? '/ навсегда' : '/ forever',
      ctaLabel: t('buy_button'),
      ctaUrl: '/register',
      features: [t('feature_1'), t('feature_2')],
      currencySymbol: '₽',
      price: 0,
      credits: 100,
      isRecurring: false,
      recurringDays: 30,
      isFeatured: false,
    },
    {
      id: 1,
      name: t('pro_plan'),
      description: t('feature_3'),
      badge: t('popular_badge'),
      billingPeriod: locale === 'ru' ? '/ месяц' : '/ month',
      ctaLabel: t('buy_pro_button'),
      ctaUrl: '/register',
      features: [t('feature_1'), t('feature_3'), t('feature_4')],
      currencySymbol: '₽',
      price: 990,
      credits: 1000,
      isRecurring: true,
      recurringDays: 30,
      isFeatured: true,
    },
  ], [locale, t]);

  const pricingPlans = useMemo<PricingPlanView[]>(() => {
    if (plans.length === 0) return fallbackPlans;

    return plans.map((plan) => ({
      id: plan.id,
      name: locale === 'ru' ? plan.name_ru : plan.name_en,
      description: (locale === 'ru' ? plan.description_ru : plan.description_en) || '',
      badge: (locale === 'ru' ? plan.badge_ru : plan.badge_en) || '',
      billingPeriod: (locale === 'ru' ? plan.billing_period_ru : plan.billing_period_en) || '',
      ctaLabel: (locale === 'ru' ? plan.cta_label_ru : plan.cta_label_en) || t('buy_button'),
      ctaUrl: plan.cta_url || '/register',
      features: splitFeatures(locale === 'ru' ? plan.features_ru : plan.features_en),
      currencySymbol: plan.currency_symbol || '$',
      price: plan.price,
      credits: plan.credits,
      isRecurring: plan.is_recurring,
      recurringDays: plan.recurring_days,
      isFeatured: plan.is_featured,
    }));
  }, [fallbackPlans, locale, plans, t]);

  const handlePlanAction = (plan: PricingPlanView) => {
    if (plan.price <= 0) {
      router.push(plan.ctaUrl || '/register');
      return;
    }
    if (!user) {
      setAuthOpen(true);
      return;
    }
    router.push(`/pricing/checkout?plan=${plan.id}`);
  };

  const handleCreditsAction = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    router.push(`/pricing/checkout?mode=credits&amount=${encodeURIComponent(String(creditPackAmountNumber))}`);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-20 sm:px-5 md:gap-10 md:px-6 md:pt-12">
      <section className="panel-surface relative overflow-hidden rounded-[2.4rem] border border-white/10 px-5 py-7 sm:px-6 md:px-8 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_28%)]" />
        <div className="relative">
          <div className="accent-pill inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88">
            <Layers3 className="h-3.5 w-3.5 text-[#ffd166]" />
            {t('eyebrow')}
          </div>
          <h1 className="section-title mt-5 max-w-4xl text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.98] text-white">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base md:text-lg">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-[2rem] border border-[#ff8d68]/20 bg-[linear-gradient(180deg,rgba(18,16,20,0.94),rgba(9,10,14,0.9))] p-6 shadow-[0_22px_56px_rgba(0,0,0,0.24)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.14),transparent_30%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/88">
                  <Coins className="h-3.5 w-3.5 text-[#ffd166]" />
                  {t('credit_pack_badge')}
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{t('credit_pack_title')}</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">{t('credit_pack_desc')}</p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-[#ff8d68]/20 bg-[linear-gradient(135deg,rgba(255,107,74,0.22),rgba(34,199,184,0.18))]">
                <Coins className="h-5 w-5 text-[#ffd166]" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('credit_pack_amount_label')}</div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xl font-semibold text-white">₽</span>
                  <input
                    type="number"
                    min={minAmountRub}
                    step="10"
                    value={creditPackAmount}
                    onChange={(event) => setCreditPackAmount(event.target.value)}
                    className="w-full bg-transparent text-3xl font-semibold text-white outline-none"
                  />
                </div>
                <p className="mt-3 text-xs text-zinc-500">{t('credit_pack_min_amount', { amount: formatPrice(minAmountRub, locale) })}</p>
              </label>

              <div className="rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">{t('credit_pack_you_get')}</div>
                <div className="mt-3 text-3xl font-semibold text-white">{estimatedCredits}</div>
                <div className="mt-1 text-sm text-emerald-100/85">{t('credits')}</div>
                <p className="mt-3 text-xs leading-6 text-zinc-300">{t('credit_pack_rate', { credits: formatPrice(creditsPer100Rub, locale) })}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-400">
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">{t('credit_pack_server_calc')}</span>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">{t('payment_link_lifetime')}</span>
            </div>

            <button
              type="button"
              onClick={handleCreditsAction}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_44px_rgba(255,107,74,0.22)] hover:translate-y-[-1px]"
            >
              {t('buy_credits_button')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </article>

        <aside className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,25,0.94),rgba(8,10,14,0.9))] p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('credit_pack_how_it_works')}</div>
          <div className="mt-5 space-y-4 text-sm text-zinc-300">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="font-semibold text-white">{t('credit_pack_step_1_title')}</div>
              <div className="mt-2 leading-6">{t('credit_pack_step_1_desc')}</div>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="font-semibold text-white">{t('credit_pack_step_2_title')}</div>
              <div className="mt-2 leading-6">{t('credit_pack_step_2_desc')}</div>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="font-semibold text-white">{t('credit_pack_step_3_title')}</div>
              <div className="mt-2 leading-6">{t('credit_pack_step_3_desc')}</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:items-stretch xl:grid-cols-3">
        {pricingPlans.map((plan, index) => {
          const featured = plan.isFeatured || (pricingPlans.length > 1 && index === 1);
          const planFeatures = plan.features.length > 0 ? plan.features : [plan.description || t('feature_1')];

          return (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
              className={`group relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_22px_56px_rgba(0,0,0,0.24)] ${
                featured
                  ? 'border-[#ff8d68]/28 bg-[linear-gradient(180deg,rgba(22,18,16,0.96),rgba(10,10,14,0.92))] ring-1 ring-[#ff8d68]/12'
                  : 'border-white/8 bg-[linear-gradient(180deg,rgba(14,18,25,0.94),rgba(8,10,14,0.9))]'
              }`}
            >
              <div className={`absolute inset-0 ${featured
                ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.16),transparent_30%)]'
                : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.08),transparent_28%)]'
              }`} />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {plan.badge ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/88">
                        <Layers3 className="h-3.5 w-3.5 text-[#ffd166]" />
                        {plan.badge}
                      </div>
                    ) : null}
                    <h2 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h2>
                    {plan.description ? (
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-300">{plan.description}</p>
                    ) : null}
                    {plan.isRecurring ? (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                        <RefreshCcw className="h-3.5 w-3.5" />
                        {t('recurring_badge')}
                      </div>
                    ) : null}
                  </div>

                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border ${
                    featured ? 'border-[#ff8d68]/20 bg-[linear-gradient(135deg,rgba(255,107,74,0.22),rgba(34,199,184,0.18))]' : 'border-white/10 bg-white/[0.05]'
                  }`}>
                    <Coins className={`h-5 w-5 ${featured ? 'text-[#ffd166]' : 'text-white'}`} />
                  </div>
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight text-white">
                    {plan.currencySymbol}{formatPrice(plan.price, locale)}
                  </span>
                  {plan.billingPeriod ? <span className="pb-1 text-sm text-zinc-500">{plan.billingPeriod}</span> : null}
                </div>

                <div className={`mt-5 inline-flex w-fit items-center gap-2 rounded-[1.2rem] border px-4 py-3 ${
                  featured ? 'border-[#ff8d68]/20 bg-[#ff8d68]/10 text-white' : 'border-white/10 bg-white/[0.04] text-white'
                }`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    featured ? 'bg-[linear-gradient(135deg,#ff6b4a,#22c7b8)]' : 'bg-white/[0.06]'
                  }`}>
                    <Coins className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">{t('credits_label')}</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {plan.credits} <span className="text-sm font-medium text-zinc-400">{t('credits')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex-1 space-y-3">
                  {planFeatures.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                      <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                        featured ? 'bg-[#ff8d68]/16 text-[#ffd166]' : 'bg-white/[0.06] text-[#22c7b8]'
                      }`}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanAction(plan)}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-5 py-3.5 text-sm font-semibold transition-all ${
                    featured
                      ? 'bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] text-white shadow-[0_20px_44px_rgba(255,107,74,0.22)] hover:translate-y-[-1px]'
                      : 'border border-white/10 bg-white/[0.05] text-white hover:border-white/16 hover:bg-white/[0.08]'
                  }`}
                >
                  {plan.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.article>
          );
        })}
      </section>
      <AuthRequiredModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </div>
  );
}
