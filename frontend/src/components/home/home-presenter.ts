import type { ReactNode } from 'react';

import { EFFECT_TOOLS } from '@/lib/effect-tools';
import { buildImageDirectory, buildVideoDirectory } from '@/lib/home-model-directory';
import { getModelGuide } from '@/lib/model-presenter';
import { getAudioCover } from '@/lib/audio-covers';
import type { GenerationExample, GenerationTask, SiteSettings } from '@/lib/types';
import { VIDEO_MODEL_OPTIONS } from '@/lib/video-models';

export type SupportedLocale = 'ru' | 'en';

export type NavCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image?: string | null;
};

export type SectionCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image?: string | null;
  imageBefore?: string | null;
  chips: string[];
};

export type FeedCardItem = {
  id: string | number;
  title: string;
  description: string;
  href: string;
  preview: string;
  mediaKind: string;
};

export type HomeSocialLink = {
  href: string;
  label: string;
  iconKey: 'telegram' | 'instagram' | 'twitter' | 'discord';
};

const IMAGE_DROPDOWN_PRIORITY = ['google/nano-banana', 'google/nano-banana-edit', 'nano-banana-2', 'nano-banana-pro'];
const VIDEO_DROPDOWN_PRIORITY = ['kling-2.6/text-to-video', 'kling-2.6/image-to-video', 'kling-3/motion-control', 'kling/ai-avatar-pro', 'kling/ai-avatar-standard'];

const AUDIO_MODELS = [
  { id: 'suno/V5', href: '/audio?model=suno%2FV5', chips: { ru: ['Музыка', 'Suno', 'Финал'], en: ['Music', 'Suno', 'Final'] } },
  { id: 'suno/V4_5PLUS', href: '/audio?model=suno%2FV4_5PLUS', chips: { ru: ['Музыка', 'Suno', 'Быстро'], en: ['Music', 'Suno', 'Fast'] } },
  { id: 'elevenlabs/text-to-speech-turbo-2-5', href: '/audio?model=elevenlabs%2Ftext-to-speech-turbo-2-5', chips: { ru: ['Голос', 'TTS', 'Turbo'], en: ['Voice', 'TTS', 'Turbo'] } },
  { id: 'elevenlabs/text-to-dialogue-v3', href: '/audio?model=elevenlabs%2Ftext-to-dialogue-v3', chips: { ru: ['Голос', 'Диалог', 'Scene'], en: ['Voice', 'Dialogue', 'Scene'] } },
] as const;

const SHOWCASE_TRENDING = {
  ru: [
    { id: 'showcase-1', title: 'Kling 2.6 — видео по картинке', description: 'Оживление статичного кадра в динамичный ролик с сохранением стиля и деталей.', href: '/video', preview: '/examples/kling-2.6image-to-video/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-2', title: 'Seedance 1.5 Pro — продуктовое видео', description: 'Рекламный ролик товара с плавным движением камеры. Bytedance Seedance.', href: '/video', preview: '/examples/Bytedance Seedance 1.5 Pro/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-3', title: 'Hailuo 02 — видео по тексту', description: 'Генерация видеоролика по текстовому описанию сцены. Hailuo Text Pro.', href: '/video', preview: '/examples/Hailuo 02 Text Pro/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-4', title: 'Kling 3.0 — кинематографичное видео', description: 'Кинематографичный ролик с точным управлением движением и камерой.', href: '/video', preview: '/examples/kling-3.0video/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-5', title: 'Motion Control', description: 'Перенос движения из одного видео на другое.', href: '/video?model=kling-3%2Fmotion-control', preview: '/examples/kling-3motion-control/after.mp4', mediaKind: 'video' as const },
    { id: 'showcase-6', title: 'Колоризация', description: 'Чёрно-белое фото превращено в цветное за один клик.', href: '/catalog', preview: '/examples/%D0%9A%D0%BE%D0%BB%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F/after.jpg', mediaKind: 'image' as const },
  ],
  en: [
    { id: 'showcase-1', title: 'Kling 2.6 — Image to Video', description: 'Bring a still frame to life with smooth motion while keeping the original style.', href: '/video', preview: '/examples/kling-2.6image-to-video/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-2', title: 'Seedance 1.5 Pro — Product Video', description: 'A product ad clip with smooth camera movement. Bytedance Seedance.', href: '/video', preview: '/examples/Bytedance Seedance 1.5 Pro/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-3', title: 'Hailuo 02 — Text to Video', description: 'Generate a video from a text scene description. Hailuo Text Pro.', href: '/video', preview: '/examples/Hailuo 02 Text Pro/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-4', title: 'Kling 3.0 — Cinematic Video', description: 'A cinematic clip with precise motion and camera control.', href: '/video', preview: '/examples/kling-3.0video/example.mp4', mediaKind: 'video' as const },
    { id: 'showcase-5', title: 'Motion Control', description: 'Transfer motion from one video to another.', href: '/video?model=kling-3%2Fmotion-control', preview: '/examples/kling-3motion-control/after.mp4', mediaKind: 'video' as const },
    { id: 'showcase-6', title: 'Colorize', description: 'A black-and-white photo turned into full color in one click.', href: '/catalog', preview: '/examples/%D0%9A%D0%BE%D0%BB%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F/after.jpg', mediaKind: 'image' as const },
  ],
};

function prioritizeDropdownCards<T extends { id: string }>(items: T[], priority: string[]) {
  const priorityRank = new Map(priority.map((id, index) => [id, index]));
  return [...items].sort((left, right) => {
    const leftRank = priorityRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = priorityRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return 0;
  });
}

function interleave<T>(groups: T[][]): T[] {
  const result: T[] = [];
  const maxLen = Math.max(...groups.map((g) => g.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (i < group.length) result.push(group[i]);
    }
  }
  return result;
}

function normalizeMediaSrc(src: string) {
  if (!src) return src;
  return src.replace(/^https?:\/\/127\.0\.0\.1:8000/, '');
}

function resolveTaskPreview(task: GenerationTask) {
  return normalizeMediaSrc(task.output_url || task.result_url || task.input_url || '');
}

function inferTaskMediaKind(task: GenerationTask) {
  const category = task.category?.toLowerCase();
  if (category === 'video' || category === 'audio' || category === 'image') return category;
  const preview = resolveTaskPreview(task).toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(preview)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/.test(preview)) return 'audio';
  return 'image';
}

function inferExampleMediaKind(example: GenerationExample) {
  const mediaUrl = normalizeMediaSrc(example.media_url || '').toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(mediaUrl)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/.test(mediaUrl)) return 'audio';
  const category = example.category?.toLowerCase();
  if (category === 'video' || category === 'audio' || category === 'image') return category;
  return 'image';
}

export function buildHomeViewModel({
  locale,
  examples,
  settings,
  tasks,
}: {
  locale: SupportedLocale;
  examples: GenerationExample[];
  settings: SiteSettings;
  tasks: GenerationTask[];
}) {
  const imageDirectory = buildImageDirectory(locale);
  const videoDirectory = buildVideoDirectory(locale);
  const knownImageModelIds = new Set(imageDirectory.flatMap((group) => group.cards.map((card) => card.id)));
  const knownVideoModelIds = new Set(VIDEO_MODEL_OPTIONS.map((model) => String(model.id)));
  const knownAudioModelIds = new Set(AUDIO_MODELS.map((model) => String(model.id)));
  const trendingLimit = (() => {
    const raw = Number(settings.homepage_trending_limit ?? '6');
    return raw === 8 || raw === 12 ? raw : 6;
  })();

  const imageCards: SectionCard[] = interleave(
    imageDirectory.map((group) =>
      group.cards.map((card) => {
        const guide = getModelGuide(card.id, locale);
        return {
          id: card.id,
          title: guide.title,
          description: guide.summary,
          href: card.href,
          image: card.image,
          chips: card.chips,
        };
      }),
    ),
  );

  const videoCards: SectionCard[] = interleave(
    videoDirectory.map((group) =>
      group.cards.map((card) => {
        const guide = getModelGuide(card.id, locale);
        return {
          id: card.id,
          title: guide.title,
          description: guide.bestFor,
          href: card.href,
          image: card.image,
          chips: card.chips,
        };
      }),
    ),
  );

  const audioCards: SectionCard[] = AUDIO_MODELS.map((entry, index) => {
    const guide = getModelGuide(entry.id, locale);
    return {
      id: entry.id,
      title: guide.title,
      description: guide.summary,
      href: entry.href,
      image: getAudioCover(index),
      chips: [...entry.chips[locale]],
    };
  });

  const toolCards: SectionCard[] = EFFECT_TOOLS.map((tool) => ({
    id: tool.id,
    title:
      tool.id === 'upscale' ? (locale === 'ru' ? 'Апскейл' : 'Upscale')
      : tool.id === 'remove_bg' ? (locale === 'ru' ? 'Удаление фона' : 'Remove background')
      : tool.id === 'colorize' ? (locale === 'ru' ? 'Колоризация' : 'Colorize')
      : tool.id === 'cartoonize' ? (locale === 'ru' ? 'Мультяшный стиль' : 'Cartoonize')
      : tool.id === 'motion_control' ? 'Motion Control'
      : tool.id === 'restore' ? (locale === 'ru' ? 'Восстановление' : 'Restore')
      : 'Tool',
    description:
      tool.id === 'upscale' ? (locale === 'ru' ? 'Поднимает резкость и разрешение готового изображения.' : 'Improves detail and resolution on an existing image.')
      : tool.id === 'remove_bg' ? (locale === 'ru' ? 'Быстро вырезает объект и убирает фон.' : 'Cuts out the subject and removes the background fast.')
      : tool.id === 'colorize' ? (locale === 'ru' ? 'Добавляет цвет и оживляет чёрно-белые кадры.' : 'Adds color and revives monochrome images.')
      : tool.id === 'cartoonize' ? (locale === 'ru' ? 'Превращает фотографию в яркую мультяшную иллюстрацию.' : 'Turns a photo into a vibrant cartoon illustration.')
      : tool.id === 'motion_control' ? (locale === 'ru' ? 'Помогает точнее переносить движение внутри видео.' : 'Helps transfer motion more precisely inside a video.')
      : tool.id === 'restore' ? (locale === 'ru' ? 'Восстанавливает повреждённые и старые фотографии.' : 'Restores damaged and old photographs.')
      : (locale === 'ru' ? 'Быстрый утилитарный режим для готового контента.' : 'Fast utility workflow for finished content.'),
    href: tool.href,
    image: tool.exampleAfter || tool.image,
    imageBefore: tool.exampleBefore || null,
    chips:
      tool.id === 'upscale' ? ['Utility', 'Image', 'Sharp']
      : tool.id === 'remove_bg' ? ['Utility', 'Cutout', 'Fast']
      : tool.id === 'colorize' ? ['Utility', 'Color', 'Edit']
      : tool.id === 'cartoonize' ? ['Utility', 'Style', 'Fun']
      : tool.id === 'restore' ? ['Utility', 'Fix', 'Photo']
      : tool.id === 'motion_control' ? ['Utility', 'Video', 'Motion']
      : ['Utility', 'Quick', 'AI'],
  }));

  const latestCards: FeedCardItem[] = tasks
    .filter((task) => {
      const mediaKind = inferTaskMediaKind(task);
      return mediaKind !== 'audio' && Boolean(resolveTaskPreview(task));
    })
    .slice(0, 12)
    .map((task) => {
      const guide = getModelGuide(task.model, locale);
      const mediaKind = inferTaskMediaKind(task);
      return {
        id: task.id,
        title: guide.title,
        description:
          guide.summary ||
          (mediaKind === 'video'
            ? locale === 'ru'
              ? 'Откройте пример и запустите похожее видео в пару кликов.'
              : 'Open the example and launch a similar video in a few clicks.'
            : locale === 'ru'
              ? 'Откройте пример и повторите стиль под свой запрос.'
              : 'Open the example and recreate the style for your own prompt.'),
        href: mediaKind === 'video' ? `/video?model=${encodeURIComponent(task.model)}` : `/images?model=${encodeURIComponent(task.model)}`,
        preview: resolveTaskPreview(task),
        mediaKind,
      };
    });

  const pool = examples.filter((example) => example.is_trending).slice(0, trendingLimit);
  const apiCards = pool.length ? pool : examples.slice(0, trendingLimit);
  const trendingCards: FeedCardItem[] = apiCards.length > 0
    ? apiCards.map((example) => ({
        id: example.id,
        title: example.title,
        description:
          example.prompt ||
          getModelGuide(example.model || '', locale).summary ||
          (locale === 'ru'
            ? 'Популярный пример, который можно использовать как ориентир для своей генерации.'
            : 'A popular example you can use as a reference for your own generation.'),
        href:
          example.model && knownVideoModelIds.has(example.model)
            ? `/video?model=${encodeURIComponent(example.model)}`
            : example.model && knownAudioModelIds.has(example.model)
              ? `/audio?model=${encodeURIComponent(example.model)}`
              : example.model && knownImageModelIds.has(example.model)
                ? `/images?model=${encodeURIComponent(example.model)}`
                : inferExampleMediaKind(example) === 'video'
                  ? '/video'
                  : inferExampleMediaKind(example) === 'audio'
                    ? '/audio'
                    : '/images',
        preview: normalizeMediaSrc(example.media_url),
        mediaKind: inferExampleMediaKind(example),
      }))
    : SHOWCASE_TRENDING[locale].slice(0, trendingLimit);

  const dropdownImages: NavCard[] = prioritizeDropdownCards(
    imageDirectory.flatMap((group) => group.cards),
    IMAGE_DROPDOWN_PRIORITY,
  ).map((card) => {
    const guide = getModelGuide(card.id, locale);
    return { id: card.id, title: guide.title, description: guide.summary, href: card.href, image: card.image };
  });

  const dropdownVideo: NavCard[] = prioritizeDropdownCards(
    videoDirectory.flatMap((group) => group.cards),
    VIDEO_DROPDOWN_PRIORITY,
  ).map((card) => {
    const guide = getModelGuide(card.id, locale);
    return { id: card.id, title: guide.title, description: guide.summary, href: card.href, image: card.image };
  });

  const dropdownAudio: NavCard[] = AUDIO_MODELS.map((entry, index) => {
    const guide = getModelGuide(entry.id, locale);
    return { id: entry.id, title: guide.title, description: guide.summary, href: entry.href, image: getAudioCover(index) };
  });

  const socials: HomeSocialLink[] = [
    settings.telegram ? { href: settings.telegram, label: 'Telegram', iconKey: 'telegram' } : null,
    settings.instagram ? { href: settings.instagram, label: 'Instagram', iconKey: 'instagram' } : null,
    settings.twitter ? { href: settings.twitter, label: 'X / Twitter', iconKey: 'twitter' } : null,
    settings.discord ? { href: settings.discord, label: 'Discord', iconKey: 'discord' } : null,
  ].filter(Boolean) as HomeSocialLink[];

  return {
    imageCards,
    videoCards,
    audioCards,
    toolCards,
    latestCards,
    trendingCards,
    dropdownImages,
    dropdownVideo,
    dropdownAudio,
    socials,
  };
}
