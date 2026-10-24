import dynamic from 'next/dynamic';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  Coins,
  Layers3,
} from 'lucide-react';
import { SUNO_BENEFIT_CONFIG, SUNO_PRESET_CONFIG } from '@/lib/suno-config';
import { EFFECT_HERO_PREVIEW_IDS, EFFECT_TOOLS } from '@/lib/effect-tools';
import { VIDEO_SHOWCASE_EXAMPLES, VIDEO_SHOWCASE_FEATURED_MODEL_IDS } from '@/lib/video-showcase-examples';
import { getCatalogPageData } from '@/lib/server/catalog-content';

const SunoSpotlight = dynamic(() => import('@/components/SunoSpotlight'));
const MotionControlSpotlight = dynamic(() => import('@/components/MotionControlSpotlight'));
const VideoShowcaseGrid = dynamic(() => import('@/components/VideoShowcaseGrid'));
const EffectPremiumGrid = dynamic(() => import('@/components/EffectPremiumGrid'));

const HERO_PREVIEW_ID_SET = new Set<string>(EFFECT_HERO_PREVIEW_IDS);

export default async function CatalogPage() {
  const locale = (await getLocale()) as 'ru' | 'en';
  const [t, sunoT, { featuredAudio, settings: siteSettings }] = await Promise.all([
    getTranslations('Catalog'),
    getTranslations('Index'),
    getCatalogPageData(),
  ]);

  const getCost = (tool: (typeof EFFECT_TOOLS)[number]) => {
    const value = siteSettings[tool.settingKey];
    return value ? parseFloat(value) : tool.defaultCost;
  };

  const minCost = Math.min(...EFFECT_TOOLS.map(getCost));
  const featuredTool = EFFECT_TOOLS[0];
  const FeaturedIcon = featuredTool.icon;
  const previewTools = EFFECT_TOOLS.filter((tool) => HERO_PREVIEW_ID_SET.has(tool.id));
  const premiumEffectItems = EFFECT_TOOLS.map((tool) => ({
    ...tool,
    title: t(`tools.${tool.id}.title`),
    description: t(`tools.${tool.id}.description`),
    chips: [t(`tools.${tool.id}.chip_1`), t(`tools.${tool.id}.chip_2`), t(`tools.${tool.id}.chip_3`)],
    cost: getCost(tool),
  }));
  const featuredVideoShowcases = VIDEO_SHOWCASE_EXAMPLES
    .filter((item) => VIDEO_SHOWCASE_FEATURED_MODEL_IDS.includes(item.modelId as (typeof VIDEO_SHOWCASE_FEATURED_MODEL_IDS)[number]))
    .map((item) => ({
      id: item.modelId,
      title: item.title[locale],
      description: item.description[locale],
      chips: item.chips[locale],
      videoSrc: item.videoSrc,
      href: item.href,
    }));
  const sunoPresets = SUNO_PRESET_CONFIG.map((preset) => ({
    ...preset,
    title: sunoT(preset.titleKey),
    prompt: sunoT(preset.promptKey),
  }));
  const sunoBenefits = SUNO_BENEFIT_CONFIG.map((benefit) => ({
    label: benefit.label,
    title: sunoT(benefit.titleKey),
    description: sunoT(benefit.descKey),
  }));
  const primarySunoPrompt = featuredAudio.find((item) => item.prompt)?.prompt || sunoPresets[0].prompt;
  const primarySunoHref = `/audio?model=suno%2FV6&prompt=${encodeURIComponent(primarySunoPrompt)}`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-0 pb-10 pt-20 sm:px-4 md:gap-10 md:px-6 md:pb-14 md:pt-12">
      <SunoSpotlight
        featuredAudio={featuredAudio}
        presets={sunoPresets}
        benefits={sunoBenefits}
        createHref="/audio?model=suno%2FV6"
        promptHref={primarySunoHref}
        copy={{
          badge: sunoT('suno_badge'),
          title: sunoT('suno_title'),
          description: sunoT('suno_desc'),
          ctaCreate: sunoT('suno_cta_create'),
          ctaPrompt: sunoT('suno_cta_remix'),
          featuredLabel: sunoT('suno_featured_label'),
          featuredTitle: sunoT('suno_featured_title'),
          featuredCountLabel: sunoT('suno_featured_count'),
          featuredFallbackLabel: sunoT('suno_featured_fallback'),
          usePromptLabel: sunoT('suno_use_prompt'),
          playLabel: sunoT('suno_player_play'),
          pauseLabel: sunoT('suno_player_pause'),
          promptLabel: sunoT('suno_player_prompt'),
          tryNowLabel: sunoT('suno_try_now'),
        }}
      />

      <section className="panel-surface relative isolate overflow-hidden rounded-[2rem] border border-white/10 px-4 py-5 sm:px-5 sm:py-6 md:rounded-[2.5rem] md:px-8 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.12),transparent_28%)]" />
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] opacity-60 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
          <div>
            <div className="accent-pill inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88">
              <Layers3 className="h-3.5 w-3.5 text-[#ffd166]" />
              {t('badge')}
            </div>
            <h1 className="section-title mt-5 max-w-3xl text-[clamp(2.5rem,7vw,4.85rem)] leading-[0.98] text-white">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base md:text-lg">
              {t('subtitle')}
            </p>

            <div className="mt-6 grid gap-3 min-[520px]:grid-cols-2">
              <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.035] px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  {t('stat_tools_label')}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">{EFFECT_TOOLS.length}</div>
              </div>
              <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.035] px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  {t('stat_starting_label')}
                </div>
                <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                  <Coins className="h-5 w-5 text-[#ffd166]" />
                  {minCost}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
            <div className="group relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(8,10,14,0.92))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:col-span-2 lg:col-span-1">
              <div className={`absolute inset-0 bg-gradient-to-br ${featuredTool.glow} opacity-100`} />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div className={`flex h-13 w-13 items-center justify-center rounded-[1.2rem] bg-gradient-to-br ${featuredTool.orb} shadow-[0_16px_36px_rgba(0,0,0,0.22)]`}>
                    <FeaturedIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-500/18 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300">
                    <Coins className="h-4 w-4" />
                    {getCost(featuredTool)} {t('cr')}
                  </div>
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-white">{t(`tools.${featuredTool.id}.title`)}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t(`tools.${featuredTool.id}.description`)}</p>
                <div className="mt-5 flex items-center gap-3 text-sm text-zinc-300">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[#ffd166]" />
                  {t('preview_ready')}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {previewTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="relative overflow-hidden rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.glow} opacity-70`} />
                    <div className="relative">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br ${tool.orb}`}>
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="mt-4 text-sm font-semibold text-white">{t(`tools.${tool.id}.title`)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="panel-surface rounded-[1.6rem] border border-white/8 px-4 py-4"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              {t(`steps.${index + 1}.eyebrow`)}
            </div>
            <div className="mt-2 text-lg font-semibold text-white">{t(`steps.${index + 1}.title`)}</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t(`steps.${index + 1}.desc`)}</p>
          </div>
        ))}
      </section>

      <MotionControlSpotlight
        badge={t('motion_control_badge')}
        title={t('motion_control_title')}
        description={t('motion_control_desc')}
        beforeLabel={t('motion_control_before')}
        afterLabel={t('motion_control_after')}
        chips={[
          t('tools.motion_control.chip_1'),
          t('tools.motion_control.chip_2'),
          t('tools.motion_control.chip_3'),
        ]}
        tipsTitle={t('motion_control_tips_title')}
        tips={[
          t('motion_control_tip_1'),
          t('motion_control_tip_2'),
          t('motion_control_tip_3'),
        ]}
        ctaLabel={t('try_now')}
        href="/video?model=kling-3%2Fmotion-control"
      />

      <VideoShowcaseGrid
        badge={locale === 'ru' ? 'Видео-модели' : 'Video Models'}
        title={locale === 'ru' ? 'Ещё несколько кейсов, которые реально стоит открыть' : 'A few more video cases worth opening immediately'}
        description={
          locale === 'ru'
            ? 'Посмотрите несколько характерных примеров и выберите модель по тому результату, который нужен именно вам.'
            : 'Look through a few distinctive examples and choose the model by the kind of result you actually want.'
        }
        ctaLabel={locale === 'ru' ? 'Открыть модель' : 'Open model'}
        items={featuredVideoShowcases}
      />

      <section className="panel-surface rounded-[2rem] border border-white/8 px-4 py-5 sm:px-5 md:px-6 md:py-6">
        <div className="mb-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('grid_label')}</div>
            <h2 className="section-title mt-3 text-3xl text-white md:text-4xl">{t('grid_title')}</h2>
          </div>
        </div>

        <EffectPremiumGrid
          items={premiumEffectItems}
          badgeLabel={t('premium_card_tag')}
          ctaLabel={t('try_now')}
          creditsLabel={t('cr')}
        />
      </section>
    </div>
  );
}
