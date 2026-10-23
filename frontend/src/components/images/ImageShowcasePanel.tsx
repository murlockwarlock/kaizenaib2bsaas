'use client';

import Image from 'next/image';
import {
  Copy,
  Globe,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';

import VisualPremiumShowcase from '@/components/VisualPremiumShowcase';

const EXAMPLES = [
  { url: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?w=800&auto=format&fit=crop', prompt: 'Cyberpunk street view with neon lights, highly detailed, cinematic lighting' },
  { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop', prompt: 'Abstract fluid liquid art, vibrant colors, pink and purple gradients' },
  { url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop', prompt: 'Astronaut standing in a surreal alien landscape, giant planets in sky' },
  { url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop', prompt: 'Abstract geometric shapes floating in anti-gravity, minimalist design' },
  { url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop', prompt: 'Cinematic portrait of a cyborg woman, glowing blue eyes, metallic skin' },
  { url: 'https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?w=800&auto=format&fit=crop', prompt: 'Ethereal glowing mushroom forest, magical atmosphere, fireflies' },
];

export default function ImageShowcasePanel({
  locale,
  title,
  onApplyPreset,
  onUsePrompt,
}: {
  locale: 'ru' | 'en';
  title: string;
  onApplyPreset: (modelId: string, promptText: string) => void;
  onUsePrompt: (promptText: string) => void;
}) {
  const premiumImageItems = {
    ru: {
      badge: 'Кейсы для изображений',
      title: 'Выберите, что хотите сделать',
      description: 'Нажмите на подходящий сценарий, и страница сама откроет нужную модель и настройки.',
      cardTag: 'Визуальный сценарий',
      cardCta: 'Открыть',
      quickCta: 'Выбрать',
      cards: [
        {
          id: 'nano-edit',
          title: 'Редактирование через Nano Banana Edit',
          description: 'Подходит для замены деталей, смены стиля и правок по уже готовому изображению.',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
          chips: ['Google', 'Редактирование', 'Референсы'],
          prompt: 'Сохранить композицию кадра, заменить одежду на премиальный футуристичный стритвир, мягкий контровой свет, рекламная чистота.',
          modelId: 'google/nano-banana-edit',
          icon: Upload,
        },
        {
          id: 'imagen-hero',
          title: 'Hero-кадры через Imagen 4 Ultra',
          description: 'Для сильных рекламных кадров, предметной подачи и аккуратных сцен, где важны свет и чистота изображения.',
          image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
          chips: ['Imagen', 'Качество', 'Реклама'],
          prompt: 'Luxury skincare bottle on sculpted stone pedestal, morning side light, soft shadows, premium editorial campaign, ultra clean product photography.',
          modelId: 'google/imagen4-ultra',
          icon: Globe,
        },
        {
          id: 'ideogram-character',
          title: 'Персонаж и consistency через Ideogram',
          description: 'Удобно, когда нужен один и тот же персонаж в разных позах, стилях и сценах.',
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
          chips: ['Персонаж', 'Вариации', 'Образ'],
          prompt: 'Keep the same heroine identity, create a clean fashion editorial portrait with silver jacket, studio rim light and magazine-style composition.',
          modelId: 'ideogram/character',
          icon: ImageIcon,
        },
        {
          id: 'upscale',
          title: 'Апскейл и polish без боли',
          description: 'Если изображение уже есть, этот сценарий поможет сделать его чище, четче и аккуратнее.',
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
          chips: ['Улучшение', 'Чистка', 'Финал'],
          prompt: 'Enhance the uploaded image for premium storefront delivery: preserve details, improve clarity, clean textures and edges.',
          modelId: 'topaz/image-upscale',
          icon: Wand2,
        },
      ],
      quick: [
        {
          id: 'flux-pro',
          eyebrow: 'Flux',
          title: 'Flux Pro для сильного text-to-image',
          description: 'Когда нужен один выразительный запрос и сразу сильный результат без лишних шагов.',
          chips: ['Текст', '2K', 'Стиль'],
          modelId: 'flux-2/pro-text-to-image',
          prompt: 'High-fashion portrait in a rainy neon alley, cinematic haze, reflective floor, bold styling, premium ad look.',
        },
        {
          id: 'nano-pro',
          eyebrow: 'Google',
          title: 'Nano Banana Pro для 4K-подачи',
          description: 'Подходит для больших кадров, рекламных макетов и гибкой работы с форматом изображения.',
          chips: ['4K', 'Форматы', 'Качество'],
          modelId: 'nano-banana-pro',
          prompt: 'Architectural visualization of a modern glass villa at sunset, rich materials, elegant landscaping, premium real-estate campaign.',
        },
        {
          id: 'seedream-edit',
          eyebrow: 'Seedream',
          title: 'Seedream Edit для смелых переделок',
          description: 'Нужен, когда исходный кадр надо не просто улучшить, а заметно изменить по стилю и настроению.',
          chips: ['Правки', 'Стиль', 'Атмосфера'],
          modelId: 'bytedance/seedream-v4-edit',
          prompt: 'Transform the uploaded portrait into a moody cinematic poster with deep blue shadows, amber highlights and high-end poster composition.',
        },
      ],
    },
    en: {
      badge: 'Image cases',
      title: 'Choose what you want to make',
      description: 'Pick a scenario and the page will open the right model and settings for it.',
      cardTag: 'Visual case',
      cardCta: 'Open',
      quickCta: 'Select',
      cards: [
        {
          id: 'nano-edit',
          title: 'Nano Banana Edit for clean revisions',
          description: 'Best for changing details, restyling scenes and editing an existing frame without rebuilding it from scratch.',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
          chips: ['Google', 'Edit', 'Refs'],
          prompt: 'Keep the same composition, switch the outfit to premium futuristic streetwear, soft rim light and polished campaign styling.',
          modelId: 'google/nano-banana-edit',
          icon: Upload,
        },
        {
          id: 'imagen-hero',
          title: 'Hero visuals with Imagen 4 Ultra',
          description: 'Use it for brand key visuals, product hero shots and clean premium scenes where lighting and polish matter.',
          image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
          chips: ['Imagen', 'Quality', 'Hero'],
          prompt: 'Luxury skincare bottle on a sculpted stone pedestal, morning side light, soft shadows, premium editorial campaign, ultra clean product photography.',
          modelId: 'google/imagen4-ultra',
          icon: Globe,
        },
        {
          id: 'ideogram-character',
          title: 'Character consistency with Ideogram',
          description: 'Useful when the same character needs to survive across multiple poses, scenes and styling directions.',
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
          chips: ['Character', 'Edit', 'Identity'],
          prompt: 'Keep the same heroine identity, create a clean fashion editorial portrait with silver jacket, studio rim light and magazine-style composition.',
          modelId: 'ideogram/character',
          icon: ImageIcon,
        },
        {
          id: 'upscale',
          title: 'Upscale and polish for delivery',
          description: 'When the base frame already exists and you just need a cleaner, sharper and more presentable final asset.',
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
          chips: ['Upscale', 'Cleanup', 'Delivery'],
          prompt: 'Enhance the uploaded image for premium storefront delivery: preserve details, improve clarity, clean textures and edges.',
          modelId: 'topaz/image-upscale',
          icon: Wand2,
        },
      ],
      quick: [
        {
          id: 'flux-pro',
          eyebrow: 'Flux',
          title: 'Flux Pro for strong text-to-image',
          description: 'Best when you want one expressive prompt and a strong final result without extra setup.',
          chips: ['Text', '2K', 'Stylized'],
          modelId: 'flux-2/pro-text-to-image',
          prompt: 'High-fashion portrait in a rainy neon alley, cinematic haze, reflective floor, bold styling, premium ad look.',
        },
        {
          id: 'nano-pro',
          eyebrow: 'Google',
          title: 'Nano Banana Pro for 4K delivery',
          description: 'Good for larger frames, deck-ready visuals and more flexible aspect ratio work.',
          chips: ['4K', 'Formats', 'Premium'],
          modelId: 'nano-banana-pro',
          prompt: 'Architectural visualization of a modern glass villa at sunset, rich materials, elegant landscaping, premium real-estate campaign.',
        },
        {
          id: 'seedream-edit',
          eyebrow: 'Seedream',
          title: 'Seedream Edit for bold transformations',
          description: 'Use it when the source image needs a stronger stylistic rewrite, not just a cleanup pass.',
          chips: ['Edit', 'Style', 'Direction'],
          modelId: 'bytedance/seedream-v4-edit',
          prompt: 'Transform the uploaded portrait into a moody cinematic poster with deep blue shadows, amber highlights and high-end poster composition.',
        },
      ],
    },
  }[locale];

  return (
    <>
      <VisualPremiumShowcase
        badge={premiumImageItems.badge}
        title={premiumImageItems.title}
        description={premiumImageItems.description}
        items={premiumImageItems.cards.map((item) => ({
          ...item,
          onClick: () => onApplyPreset(item.modelId, item.prompt),
        }))}
        quickActions={premiumImageItems.quick.map((item) => ({
          ...item,
          onClick: () => onApplyPreset(item.modelId, item.prompt),
        }))}
        cardTagLabel={premiumImageItems.cardTag}
        cardCtaLabel={premiumImageItems.cardCta}
        quickCtaLabel={premiumImageItems.quickCta}
        splitAt="2xl"
      />

      <div className="mt-12">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <h3 className="text-lg font-bold tracking-wide text-white">{title}</h3>
        </div>

        <div className="columns-1 gap-4 space-y-4 sm:columns-2 sm:gap-5 sm:space-y-5 xl:columns-3 xl:gap-6 xl:space-y-6">
          {EXAMPLES.map((example, index) => (
            <div
              key={index}
              className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900 shadow-xl shadow-black/50"
              onClick={() => onUsePrompt(example.prompt)}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={example.url}
                  alt={example.prompt}
                  fill
                  unoptimized
                  loader={({ src }) => src}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-5 transition-transform duration-300 group-hover:translate-y-0">
                <p className="mb-4 line-clamp-3 text-sm font-medium leading-snug text-white/90">{example.prompt}</p>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
                    <Copy className="h-3.5 w-3.5" />
                    {locale === 'ru' ? 'Использовать промпт' : 'Use prompt'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
