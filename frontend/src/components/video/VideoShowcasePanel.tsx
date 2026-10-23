'use client';

import Image from 'next/image';
import {
  Check,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import VisualPremiumShowcase from '@/components/VisualPremiumShowcase';
import SmartPreviewVideo from '@/components/SmartPreviewVideo';
import { getVideoShowcaseByModelId } from '@/lib/video-showcase-examples';

const EXAMPLES = [
  {
    title: { ru: 'Сцена продукта', en: 'Product scene' },
    prompt: {
      ru: 'Кинематографичный пролёт камеры вокруг флакона парфюма на мокром стекле, мягкие неоновые отражения, premium lighting.',
      en: 'Cinematic camera orbit around a perfume bottle on wet glass with soft neon reflections and premium lighting.',
    },
    image:
      'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: { ru: 'Персонаж', en: 'Character' },
    prompt: {
      ru: 'Молодая певица на репетиции делает шаг к камере, улыбается и начинает петь, живая ручная камера, тёплый свет.',
      en: 'Young singer in a rehearsal room steps toward camera, smiles and starts singing, handheld motion, warm light.',
    },
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: { ru: 'Пейзаж', en: 'Landscape' },
    prompt: {
      ru: 'Дрон вылетает из тумана над горным озером на рассвете, масштабный широкий кадр, медленное кинематографичное движение.',
      en: 'Drone emerges from fog over a mountain lake at sunrise, wide epic composition, slow cinematic movement.',
    },
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
];

const KLING_MOTION_CONTROL_EXAMPLE = {
  before: '/examples/kling-3motion-control/before.mp4',
  after: '/examples/kling-3motion-control/after.mp4',
  prompt: {
    ru: 'Preserve the character identity from the reference image. Transfer the motion from the source video with realistic body movement, stable face, clean hands, natural proportions, smooth motion, consistent lighting.',
    en: 'Preserve the character identity from the reference image. Transfer the motion from the source video with realistic body movement, stable face, clean hands, natural proportions, smooth motion, consistent lighting.',
  },
  badge: {
    ru: 'Пример Kling Motion Control',
    en: 'Kling Motion Control Example',
  },
  title: {
    ru: 'Как выглядит удачный перенос движения',
    en: 'What a clean motion transfer looks like',
  },
  description: {
    ru: 'Слева исходное видео с движением, справа итоговый ролик после переноса на нового персонажа. Для этой модели важнее всего не длинный prompt, а валидные референсы.',
    en: 'Left: the source motion clip. Right: the generated result after transferring motion onto a new character. For this model, clean references matter more than a long prompt.',
  },
  beforeLabel: {
    ru: 'Исходное движение',
    en: 'Source Motion',
  },
  afterLabel: {
    ru: 'Результат',
    en: 'Result',
  },
  chips: {
    ru: ['Один персонаж', 'Лицо видно', 'Первый кадр важен'],
    en: ['Single subject', 'Face visible', 'First frame matters'],
  },
  tips: {
    ru: [
      'Фото персонажа лучше брать по пояс, с хорошо видимыми лицом, плечами и торсом.',
      'В первом кадре видео человек уже должен быть виден ясно, без сильного блюра и обрезки.',
      'Если фото и видео слишком разные по ракурсу и позе, Kling чаще отклоняет запрос.',
    ],
    en: [
      'Use a waist-up character photo with the face, shoulders, and torso clearly visible.',
      'The person should already be visible in the first frame of the motion video, without heavy blur or cropping.',
      'If the image and video are too different in angle and pose, Kling is more likely to reject the request.',
    ],
  },
};

function KlingMotionControlExample({
  locale,
  onUsePrompt,
  ctaLabel,
}: {
  locale: 'ru' | 'en';
  onUsePrompt: () => void;
  ctaLabel: string;
}) {
  const content = {
    badge: KLING_MOTION_CONTROL_EXAMPLE.badge[locale],
    title: KLING_MOTION_CONTROL_EXAMPLE.title[locale],
    description: KLING_MOTION_CONTROL_EXAMPLE.description[locale],
    beforeLabel: KLING_MOTION_CONTROL_EXAMPLE.beforeLabel[locale],
    afterLabel: KLING_MOTION_CONTROL_EXAMPLE.afterLabel[locale],
    chips: KLING_MOTION_CONTROL_EXAMPLE.chips[locale],
    tips: KLING_MOTION_CONTROL_EXAMPLE.tips[locale],
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_30%),rgba(7,10,16,0.92)] p-5 sm:p-6">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,rgba(0,0,0,0.14))]" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
          <Video className="h-3.5 w-3.5" />
          {content.badge}
        </div>
        <h3 className="mt-4 max-w-2xl text-[clamp(1.5rem,3vw,2.35rem)] font-semibold leading-tight text-white">
          {content.title}
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
          {content.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {content.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-zinc-100"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                id: 'before',
                label: content.beforeLabel,
                src: KLING_MOTION_CONTROL_EXAMPLE.before,
                accent: 'bg-amber-300',
              },
              {
                id: 'after',
                label: content.afterLabel,
                src: KLING_MOTION_CONTROL_EXAMPLE.after,
                accent: 'bg-emerald-300',
              },
            ].map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
              >
                <div className="relative aspect-[9/16] bg-black">
                  <SmartPreviewVideo
                    src={item.src}
                    preload="metadata"
                    mobileAutoPlay={true}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-start p-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(10,12,16,0.86)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                      <span className={`h-2 w-2 rounded-full ${item.accent}`} />
                      {item.label}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex h-full flex-col justify-between rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                {locale === 'ru' ? 'Что держать под контролем' : 'What to keep under control'}
              </div>
              <div className="mt-4 space-y-3">
                {content.tips.map((tip) => (
                  <div
                    key={tip}
                    className="flex items-start gap-3 rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/12 text-cyan-200">
                      <Check className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-zinc-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onUsePrompt}
              className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
            >
              <Clapperboard className="h-4 w-4" />
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SingleVideoModelExample({
  locale,
  example,
  onUsePrompt,
  ctaLabel,
}: {
  locale: 'ru' | 'en';
  example: NonNullable<ReturnType<typeof getVideoShowcaseByModelId>>;
  onUsePrompt: () => void;
  ctaLabel: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.35rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.12),transparent_28%),rgba(7,10,16,0.92)] p-4 sm:rounded-[2rem] sm:border-white/10 sm:p-6">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,rgba(0,0,0,0.14))]" />

      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] xl:items-center">
        <div className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:rounded-[1.6rem]">
          <div className="relative aspect-[4/5] bg-black sm:aspect-[16/9]">
            <SmartPreviewVideo
              key={example.videoSrc}
              src={example.videoSrc}
              preload="metadata"
              mobileAutoPlay={true}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,10,0.06),rgba(3,6,10,0.2)_38%,rgba(3,6,10,0.82)_100%)]" />
            <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(10,12,16,0.82)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              {locale === 'ru' ? 'Пример модели' : 'Model Example'}
            </div>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4 sm:rounded-[1.6rem] sm:p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
            <Video className="h-3.5 w-3.5" />
            {example.title[locale]}
          </div>
          <h3 className="mt-4 text-[clamp(1.45rem,2.8vw,2.15rem)] font-semibold leading-tight text-white">
            {example.title[locale]}
          </h3>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{example.description[locale]}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {example.chips[locale].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-zinc-100"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-zinc-300">
            {locale === 'ru'
              ? 'Этот промпт можно использовать как безопасную стартовую точку для этой модели.'
              : 'You can use this prompt as a safe starting point for this model.'}
          </div>

          <button
            type="button"
            onClick={onUsePrompt}
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
          >
            <Clapperboard className="h-4 w-4" />
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function VideoShowcasePanel({
  locale,
  modelId,
  activeModelShowcase,
  onApplyPreset,
  onUsePrompt,
}: {
  locale: 'ru' | 'en';
  modelId: string;
  activeModelShowcase: ReturnType<typeof getVideoShowcaseByModelId>;
  onApplyPreset: (modelId: string, promptText: string) => void;
  onUsePrompt: (promptText: string) => void;
}) {
  const t = useTranslations('Video');

  const premiumVideoItems = {
    ru: {
      badge: 'Видео-кейсы',
      title: 'Выберите тип видео',
      description: 'Нажмите на нужный сценарий, и страница сама переключится на подходящую модель.',
      quickBadge: 'Быстрый запуск',
      quickTitle: 'Быстрые входы',
      quickDescription: 'Для аватаров, рекламных роликов и быстрых тестов движения.',
      cardTag: 'Сценарий',
      cardCta: 'Открыть',
      quickCta: 'Выбрать',
      cards: [
        {
          id: 'motion-control',
          title: 'Управляемое движение камеры и объекта',
          description: 'Когда важны траектория, движение объекта и более точный контроль над роликом, а не просто лёгкое оживление кадра.',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
          chips: ['Kling', 'Движение', 'Контроль'],
          prompt: 'Модель уверенно идет вперед, камера плавно уходит по дуге влево, ткань движется на ходу, чистый студийный свет, выразительная динамика.',
          modelId: 'kling-3/motion-control',
          icon: Clapperboard,
        },
        {
          id: 'runway-generate',
          title: 'Рекламный ролик с сильной подачей',
          description: 'Подходит для продуктовых и брендовых видео, где важны свет, подача и аккуратный кинематографичный вид.',
          image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
          chips: ['Runway', 'Реклама', 'Подача'],
          prompt: 'Рекламный ролик с флаконом дорогого парфюма на отражающем черном стекле, медленное макродвижение камеры, аккуратные блики, премиальная студийная атмосфера.',
          modelId: 'runway/generate',
          icon: Video,
        },
        {
          id: 'veo-quality',
          title: 'Фотореалистичная сцена с сильным реализмом',
          description: 'Подходит, когда важны натуральный свет, ощущение реальной камеры и более правдоподобная cinematic-картинка.',
          image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
          chips: ['VEO', 'Реализм', 'Cinematic'],
          prompt: 'Реалистичная ночная сцена в современном городе после дождя: женщина в темном пальто идет к камере, мягкие отражения на мокром асфальте, натуральный свет витрин, спокойное движение камеры, правдоподобная кинематографичная атмосфера.',
          modelId: 'veo-3.1/text-quality',
          icon: Film,
        },
        {
          id: 'hailuo-image',
          title: 'Мягко оживить готовое изображение',
          description: 'Когда сильный кадр уже есть и его нужно превратить в аккуратный живой ролик без сложной постановки.',
          image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
          chips: ['Hailuo', 'Кадр', 'Оживление'],
          prompt: 'Оживить уличный портрет: лёгкий ветер в волосах, едва заметное движение камеры, мягкие солнечные блики.',
          modelId: 'hailuo/2-3-image-to-video-pro',
          icon: ImageIcon,
        },
      ],
      quick: [
        {
          id: 'avatar',
          eyebrow: 'Аватар',
          title: 'Говорящий персонаж',
          description: 'Подходит для презентаций, объясняющих роликов и видео, где в центре один персонаж.',
          chips: ['Kling', 'Аватар', 'Персонаж'],
          modelId: 'kling/ai-avatar-pro',
          prompt: 'Уверенный цифровой спикер в чистой студии, лёгкие движения руками, презентация технологичного бренда.',
        },
        {
          id: 'seedance',
          eyebrow: 'Bytedance',
          title: 'Seedance для рекламных клипов',
          description: 'Хороший универсальный вариант для коротких рекламных роликов, где важны кадр, темп и звук.',
          chips: ['Seedance', 'Звук', 'Реклама'],
          modelId: 'bytedance/seedance-1-5-pro',
          prompt: 'Короткий рекламный ролик для запуска новых кроссовок: смелые движения камеры, отражающий пол, контрастный свет и выразительный звук.',
        },
        {
          id: 'wan-flash',
          eyebrow: 'Wan',
          title: 'Быстрые пробы движения по картинке',
          description: 'Нужен, когда команда хочет быстро тестировать несколько направлений движения по одному исходному кадру.',
          chips: ['Быстро', 'Тесты', 'Движение'],
          modelId: 'wan/2-6-flash-image-to-video',
          prompt: 'Быстро превратить модный статичный кадр в тест движения: уверенное движение вперед, гладкий студийный свет, чистая подача.',
        },
        {
          id: 'veo-fast',
          eyebrow: 'VEO',
          title: 'Фотореалистичный быстрый старт',
          description: 'Когда нужен правдоподобный результат по тексту без долгого выбора между десятками настроек.',
          chips: ['VEO', 'Реализм', 'Быстро'],
          modelId: 'veo-3.1/text-fast',
          prompt: 'Реалистичная городская сцена на закате: человек идет по улице, мягкие отражения в витринах, натуральный свет, спокойное кинематографичное движение камеры.',
        },
      ],
    },
    en: {
      badge: 'Video cases',
      title: 'Choose the video type',
      description: 'Pick a scenario and the page will switch to the right model automatically.',
      quickBadge: 'Quick launch',
      quickTitle: 'Quick starts',
      quickDescription: 'For avatars, ad clips and fast motion tests.',
      cardTag: 'Scenario',
      cardCta: 'Open',
      quickCta: 'Select',
      cards: [
        {
          id: 'motion-control',
          title: 'Motion Control for directed movement',
          description: 'Use it when trajectory, subject motion and more director-like control matter more than simply animating an image.',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
          chips: ['Kling', 'Motion', 'Control'],
          prompt: 'Dynamic fashion shot with the model stepping forward while the camera arcs left, cloth movement, controlled subject motion and clean studio highlights.',
          modelId: 'kling-3/motion-control',
          icon: Clapperboard,
        },
        {
          id: 'runway-generate',
          title: 'Runway for premium hero videos',
          description: 'Best for product and brand films where presentation, cinematic softness and a polished premium feel matter.',
          image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
          chips: ['Runway', 'Hero', 'Premium'],
          prompt: 'Cinematic beauty campaign video of a luxury perfume bottle on reflective black glass, slow macro movement, elegant highlights, premium studio atmosphere.',
          modelId: 'runway/generate',
          icon: Video,
        },
        {
          id: 'veo-quality',
          title: 'VEO for photoreal cinematic scenes',
          description: 'Best when realism, natural lighting and a believable camera feel matter more than stylized direction.',
          image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
          chips: ['VEO', 'Realism', 'Cinematic'],
          prompt: 'A realistic night scene in a modern city after rain, a woman in a dark coat walks toward the camera, natural reflections on wet pavement, practical storefront lighting, subtle camera movement, grounded cinematic atmosphere.',
          modelId: 'veo-3.1/text-quality',
          icon: Film,
        },
        {
          id: 'hailuo-image',
          title: 'Hailuo image-to-video for soft animation',
          description: 'Use it when you already have a strong key visual and just need a clean, subtle animated clip without a heavy directing setup.',
          image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
          chips: ['Hailuo', 'Image', 'Animate'],
          prompt: 'Animate a premium outdoor portrait with soft wind in the hair, subtle camera drift and cinematic sunlight flicker.',
          modelId: 'hailuo/2-3-image-to-video-pro',
          icon: ImageIcon,
        },
      ],
      quick: [
        {
          id: 'avatar',
          eyebrow: 'Avatar',
          title: 'AI Avatar for talking-head videos',
          description: 'Use it when the task is closer to a presenter, explainer or character-led piece than a cinematic spot.',
          chips: ['Kling', 'Avatar', 'Character'],
          modelId: 'kling/ai-avatar-pro',
          prompt: 'Confident digital spokesperson in a clean studio set, subtle hand movement, premium tech brand presentation.',
        },
        {
          id: 'seedance',
          eyebrow: 'Bytedance',
          title: 'Seedance for ad-style clips',
          description: 'A strong general starting point for short promo videos that may need text prompts, reference frames and sound.',
          chips: ['Seedance', 'Audio', 'Ad'],
          modelId: 'bytedance/seedance-1-5-pro',
          prompt: 'Short premium sneaker launch film with bold camera moves, reflective floor, dramatic key light and punchy sound design.',
        },
        {
          id: 'wan-flash',
          eyebrow: 'Wan',
          title: 'Wan Flash for fast image-to-video iterations',
          description: 'Use it when the team wants to test several motion directions quickly from the same source frame.',
          chips: ['Flash', 'Fast', 'Iterate'],
          modelId: 'wan/2-6-flash-image-to-video',
          prompt: 'Turn the uploaded fashion still into a quick premium motion test with confident forward movement and glossy studio lighting.',
        },
        {
          id: 'veo-fast',
          eyebrow: 'VEO',
          title: 'Fast photoreal starting point',
          description: 'Use it when you want a believable text-to-video result fast without overthinking the setup.',
          chips: ['VEO', 'Realism', 'Fast'],
          modelId: 'veo-3.1/text-fast',
          prompt: 'A realistic city street at sunset, a person walking toward camera, soft storefront reflections, natural light, grounded cinematic movement.',
        },
      ],
    },
  }[locale];

  return (
    <>
      {modelId === 'kling-3/motion-control' ? (
        <section className="mb-8 overflow-hidden">
          <KlingMotionControlExample
            locale={locale}
            onUsePrompt={() => onUsePrompt(KLING_MOTION_CONTROL_EXAMPLE.prompt[locale])}
            ctaLabel={t('use_prompt')}
          />
        </section>
      ) : activeModelShowcase ? (
        <section className="mb-8 overflow-hidden">
          <SingleVideoModelExample
            locale={locale}
            example={activeModelShowcase}
            onUsePrompt={() => onUsePrompt(activeModelShowcase.prompt[locale])}
            ctaLabel={t('use_prompt')}
          />
        </section>
      ) : null}

      <section className="overflow-hidden">
        <VisualPremiumShowcase
          badge={premiumVideoItems.badge}
          title={premiumVideoItems.title}
          description={premiumVideoItems.description}
          items={premiumVideoItems.cards.map((item) => ({
            ...item,
            onClick: () => onApplyPreset(item.modelId, item.prompt),
          }))}
          quickActions={premiumVideoItems.quick.map((item) => ({
            ...item,
            onClick: () => onApplyPreset(item.modelId, item.prompt),
          }))}
          cardTagLabel={premiumVideoItems.cardTag}
          cardCtaLabel={premiumVideoItems.cardCta}
          quickCtaLabel={premiumVideoItems.quickCta}
          splitAt="2xl"
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-cyan-300" />
          <h3 className="text-xl font-semibold text-white">{t('inspiration')}</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {EXAMPLES.map((example) => (
            <button
              key={example.title.en}
              type="button"
              onClick={() => onUsePrompt(example.prompt[locale])}
              className="group overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/20 text-left transition hover:border-cyan-400/30"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={example.image}
                  alt={example.title[locale]}
                  fill
                  unoptimized
                  loader={({ src }) => src}
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              </div>
              <div className="p-5">
                <div className="text-sm font-semibold text-white">{example.title[locale]}</div>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-zinc-400">
                  {example.prompt[locale]}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition group-hover:border-cyan-400/30 group-hover:text-white">
                  <Clapperboard className="h-3.5 w-3.5" />
                  {t('use_prompt')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
