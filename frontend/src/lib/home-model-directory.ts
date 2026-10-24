import { VIDEO_MODELS, type VideoModelDefinition, type VideoFamilyId } from '@/lib/video-models';

type SupportedLocale = 'ru' | 'en';

type DirectoryCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
  chips: string[];
};

type DirectoryGroup = {
  id: string;
  title: string;
  description: string;
  cards: DirectoryCard[];
};

const HOME_IMAGE_MODELS = [
  {
    groupId: 'flux',
    groupLabel: { ru: 'Flux', en: 'Flux' },
    groupDescription: {
      ru: 'Для художественных кадров, стильных постеров и быстрых вариаций по описанию или по загруженному изображению.',
      en: 'For stylized scenes, poster-like visuals and fast variations from text or an uploaded image.',
    },
    models: [
      { id: 'flux-2/pro-text-to-image', name: 'Flux Pro (Text)', type: 'text' },
      { id: 'flux-2/pro-image-to-image', name: 'Flux Pro (Image)', type: 'edit' },
      { id: 'flux-2/flex-text-to-image', name: 'Flux Flex (Text)', type: 'text' },
      { id: 'flux-2/flex-image-to-image', name: 'Flux Flex (Image)', type: 'edit' },
    ],
  },
  {
    groupId: 'seedream',
    groupLabel: { ru: 'Seedream', en: 'Seedream' },
    groupDescription: {
      ru: 'Для выразительных стилизованных сцен, атмосферных кадров и смелых переделок готового изображения.',
      en: 'For expressive stylized scenes, atmospheric visuals and bold transformations of an existing image.',
    },
    models: [
      { id: 'bytedance/seedream-v4-text-to-image', name: 'Seedream V4 (Text)', type: 'text' },
      { id: 'bytedance/seedream-v4-edit', name: 'Seedream V4 Edit', type: 'edit' },
      { id: 'seedream/4.5-text-to-image', name: 'Seedream 4.5 (Text)', type: 'text' },
      { id: 'bytedance/seedream', name: 'Seedream 3.0 (Text)', type: 'text' },
    ],
  },
  {
    groupId: 'qwen',
    groupLabel: { ru: 'Qwen', en: 'Qwen' },
    groupDescription: {
      ru: 'Для генерации или переработки изображения по запросу без перегруженного интерфейса.',
      en: 'For generating or transforming an image from a prompt without a heavy setup.',
    },
    models: [
      { id: 'qwen/text-to-image', name: 'Qwen (Text)', type: 'text' },
      { id: 'qwen/image-to-image', name: 'Qwen (Image)', type: 'edit' },
    ],
  },
  {
    groupId: 'ideogram',
    groupLabel: { ru: 'Ideogram', en: 'Ideogram' },
    groupDescription: {
      ru: 'Для постеров, типографики и персонажей, где важно удерживать один образ в нескольких вариантах.',
      en: 'For posters, typography and character work where one identity needs to stay consistent across variations.',
    },
    models: [
      { id: 'ideogram/v3-text-to-image', name: 'Ideogram V3 (Text)', type: 'text' },
      { id: 'ideogram/character', name: 'Ideogram Character', type: 'character' },
    ],
  },
  {
    groupId: 'google',
    groupLabel: { ru: 'Google', en: 'Google' },
    groupDescription: {
      ru: 'Для качественной генерации, редактирования, 4K-кадров и работы с несколькими референсами.',
      en: 'For quality generation, editing, 4K visuals and multi-reference image work.',
    },
    models: [
      { id: 'google/nano-banana', name: 'Google Nano Banana', type: 'text' },
      { id: 'google/nano-banana-edit', name: 'Google Nano Banana Edit', type: 'edit' },
      { id: 'nano-banana-2', name: 'Nano Banana 2', type: 'text' },
      { id: 'nano-banana-2-1', name: 'Nano Banana 2.1', type: 'text' },
      { id: 'nano-banana-2-lite', name: 'Nano Banana 2 Lite', type: 'text' },
      { id: 'nano-banana-pro', name: 'Nano Banana Pro', type: 'text' },
      { id: 'google/imagen4', name: 'Google Imagen 4', type: 'text' },
      { id: 'google/imagen4-fast', name: 'Google Imagen 4 Fast', type: 'text' },
      { id: 'google/imagen4-ultra', name: 'Google Imagen 4 Ultra', type: 'text' },
    ],
  },
  {
    groupId: 'other',
    groupLabel: { ru: 'Enhance', en: 'Enhance' },
    groupDescription: {
      ru: 'Для увеличения четкости, вырезания фона и доведения готовых изображений до чистого финального вида.',
      en: 'For upscaling, background removal and polishing finished images into clean final assets.',
    },
    models: [
      { id: 'z-image', name: 'Z-Image (Text)', type: 'text' },
      { id: 'topaz/image-upscale', name: 'Topaz Upscale', type: 'upscale' },
      { id: 'recraft/crisp-upscale', name: 'Recraft Crisp Upscale', type: 'upscale' },
      { id: 'recraft/remove-background', name: 'Recraft Remove BG', type: 'remove-background' },
    ],
  },
] as const;

const VIDEO_GROUP_DESCRIPTIONS: Record<VideoFamilyId, { ru: string; en: string }> = {
  bytedance: {
    ru: 'Сильные универсальные модели для рекламных роликов, оживления кадров и коротких динамичных видео.',
    en: 'Versatile models for ad clips, still-image animation and fast short-form videos.',
  },
  kling: {
    ru: 'Для сильной динамики, аватаров, управляемого движения и более режиссерской подачи.',
    en: 'For stronger motion, avatars, directed camera control and more cinematic direction.',
  },
  veo: {
    ru: 'Для фотореалистичных сцен, сильного реализма по тексту и аккуратного продолжения уже готового ролика.',
    en: 'For photoreal scenes, strong realism from text prompts and extending finished clips cleanly.',
  },
  hailuo: {
    ru: 'Для аккуратного оживления изображений и быстрых текстовых роликов без лишней перегрузки.',
    en: 'For soft image animation and fast text-based clips without a heavy setup.',
  },
  wan: {
    ru: 'Для быстрых проб, переноса движения, работы с аудио и разных сценариев преобразования видео.',
    en: 'For fast motion tests, motion transfer, audio-led clips and video transformations.',
  },
  runway: {
    ru: 'Для выразительной рекламной подачи, продолжения готовых роликов и более polished-визуала.',
    en: 'For polished ad-style visuals, continuing existing clips and a more refined finish.',
  },
  grok: {
    ru: 'Для быстрых экспериментальных роликов с изображениями, keyframes и синхронным звуком.',
    en: 'For fast experimental clips with image references, keyframes and synchronized audio.',
  },
  pixverse: {
    ru: 'Для быстрых выразительных роликов до 15 секунд с управляемым качеством и опциональным native audio.',
    en: 'For expressive clips up to 15 seconds with selectable quality and optional native audio.',
  },
};

const VIDEO_MODEL_IMAGE_MAP: Record<string, string> = {
  'bytedance/seedance-1-5-pro': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=80',
  'bytedance/v1-pro-fast-image-to-video': 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80',
  'bytedance/v1-pro-image-to-video': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
  'bytedance/v1-pro-text-to-video': 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80',
  'bytedance/v1-lite-image-to-video': 'https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1400&q=80',
  'bytedance/v1-lite-text-to-video': 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80',
  'kling-2.6/text-to-video': 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=80',
  'kling-2.6/image-to-video': 'https://images.unsplash.com/photo-1494256997604-768d1f608cac?auto=format&fit=crop&w=1400&q=80',
  'kling/v2-1-master-image-to-video': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80',
  'kling/v2-5-turbo-text-to-video-pro': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'kling/ai-avatar-standard': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1400&q=80',
  'kling/ai-avatar-pro': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1400&q=80',
  'kling-3/motion-control': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80',
  'kling-3.0/video': 'https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18?auto=format&fit=crop&w=1400&q=80',
  'veo-3.1/text-fast': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=80',
  'veo-3.1/text-quality': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'veo-3.1/image-fast': 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1400&q=80',
  'veo-3.1/image-quality': 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1400&q=80',
  'veo-3.1/reference-fast': 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=1400&q=80',
  'veo-3.1/extend-fast': 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1400&q=80',
  'veo-3.1/extend-quality': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1400&q=80',
  'hailuo/2-3-image-to-video-standard': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1400&q=80',
  'hailuo/02-text-to-video-pro': 'https://images.unsplash.com/photo-1520034475321-cbe63696469a?auto=format&fit=crop&w=1400&q=80',
  'hailuo/02-image-to-video-pro': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=80',
  'hailuo/02-text-to-video-standard': 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1400&q=80',
  'hailuo/02-image-to-video-standard': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=80',
  'hailuo/2-3-image-to-video-pro': 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1400&q=80',
  'wan/2-6-image-to-video': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'wan/2-6-text-to-video': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80',
  'wan/2-6-video-to-video': 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1400&q=80',
  'wan/2-2-a14b-image-to-video-turbo': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80',
  'wan/2-2-a14b-text-to-video-turbo': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
  'wan/2-2-a14b-speech-to-video-turbo': 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=80',
  'wan/2-2-animate-move': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
  'wan/2-2-animate-replace': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=80',
  'wan/2-6-flash-image-to-video': 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=80',
  'wan/2-6-flash-video-to-video': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80',
  'runway/generate': 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1400&q=80',
  'runway/extend': 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1400&q=80',
  'runway/aleph-generate': 'https://images.unsplash.com/photo-1493246318656-5bfd4cfb29b8?auto=format&fit=crop&w=1400&q=80',
  'pixverse-v6-max/text-to-video': 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=80',
  'pixverse-v6-max/image-to-video': 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1400&q=80',
};

const IMAGE_MODEL_IMAGE_MAP: Record<string, string> = {
  'flux-2/pro-text-to-image': 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=80',
  'flux-2/pro-image-to-image': 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=80',
  'flux-2/flex-text-to-image': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'flux-2/flex-image-to-image': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80',
  'bytedance/seedream-v4-text-to-image': 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=80',
  'bytedance/seedream-v4-edit': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=80',
  'seedream/4.5-text-to-image': 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1400&q=80',
  'bytedance/seedream': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80',
  'qwen/text-to-image': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1400&q=80',
  'qwen/image-to-image': 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1400&q=80',
  'ideogram/v3-text-to-image': 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1400&q=80',
  'ideogram/character': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80',
  'google/nano-banana': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=80',
  'google/nano-banana-edit': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
  'nano-banana-2': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1400&q=80',
  'nano-banana-pro': 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1400&q=80',
  'google/imagen4': 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1400&q=80',
  'google/imagen4-fast': 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?auto=format&fit=crop&w=1400&q=80',
  'google/imagen4-ultra': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80',
  'z-image': 'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1400&q=80',
  'topaz/image-upscale': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=80',
  'recraft/crisp-upscale': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
  'recraft/remove-background': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1400&q=80',
};

function getVideoCardKind(model: VideoModelDefinition) {
  const id = model.id;
  if (id.includes('avatar')) return 'avatar';
  if (id.includes('motion-control')) return 'motion';
  if (id.includes('storyboard')) return 'storyboard';
  if (id.includes('characters')) return 'character';
  if (id.includes('speech-to-video')) return 'speech';
  if (id.includes('watermark')) return 'watermark';
  if (id.includes('extend')) return 'extend';
  if (id.includes('video-to-video') || id.includes('animate-move') || id.includes('animate-replace')) return 'video';
  if (id.includes('image-to-video')) return 'image';
  if (id.includes('seedance')) return 'product';
  return 'text';
}

function getVideoCardDescription(model: VideoModelDefinition, locale: SupportedLocale) {
  const id = model.id;
  if (id.includes('avatar')) {
    return locale === 'ru'
      ? 'Создает говорящего персонажа для презентаций и роликов с ведущим.'
      : 'Creates a speaking avatar for presenter-led videos and explainers.';
  }
  if (id.includes('motion-control')) {
    return locale === 'ru'
      ? 'Дает больше контроля над движением камеры и объекта в кадре.'
      : 'Gives you tighter control over camera and subject movement.';
  }
  if (id.includes('storyboard')) {
    return locale === 'ru'
      ? 'Собирает ролик из нескольких последовательных сцен.'
      : 'Builds a video from multiple ordered scenes.';
  }
  if (id.includes('characters-pro')) {
    return locale === 'ru'
      ? 'Сохраняет персонажа из готового ролика для дальнейшего использования.'
      : 'Captures a reusable character from an existing clip.';
  }
  if (id.includes('characters')) {
    return locale === 'ru'
      ? 'Создает персонажа по короткому референсу для следующих сцен.'
      : 'Creates a reusable character from a short reference clip.';
  }
  if (id.includes('watermark')) {
    return locale === 'ru'
      ? 'Убирает водяной знак из уже готового ролика по ссылке.'
      : 'Removes the watermark from an existing linked clip.';
  }
  if (id.includes('extend')) {
    return locale === 'ru'
      ? 'Продолжает уже готовое видео в том же визуальном ключе.'
      : 'Extends an existing video in the same visual direction.';
  }
  if (id.includes('video-to-video')) {
    return locale === 'ru'
      ? 'Переделывает готовый ролик по новому описанию.'
      : 'Transforms an existing clip using a new prompt.';
  }
  if (id.includes('animate-move')) {
    return locale === 'ru'
      ? 'Переносит движение из видео на загруженное изображение.'
      : 'Transfers motion from a video onto an uploaded image.';
  }
  if (id.includes('animate-replace')) {
    return locale === 'ru'
      ? 'Вставляет новый объект или персонажа в готовую сцену.'
      : 'Replaces or inserts a new subject into an existing scene.';
  }
  if (id.includes('speech-to-video')) {
    return locale === 'ru'
      ? 'Собирает ролик по изображению и аудио с упором на речь и синхрон.'
      : 'Builds a video from an image and audio track with speech sync in mind.';
  }
  if (id.includes('image-to-video')) {
    return locale === 'ru'
      ? 'Оживляет загруженное изображение и превращает его в короткий ролик.'
      : 'Animates an uploaded image into a short clip.';
  }
  if (id.includes('text-to-video')) {
    return locale === 'ru'
      ? 'Создает видео по текстовому описанию сцены.'
      : 'Generates a video from a text description.';
  }
  if (id.includes('aleph')) {
    return locale === 'ru'
      ? 'Продвинутый режим для более сложной и выразительной генерации.'
      : 'Advanced generation mode for more complex cinematic results.';
  }
  return model.summary[locale];
}

function getVideoCardChips(model: VideoModelDefinition, locale: SupportedLocale) {
  const kind = getVideoCardKind(model);
  const family = model.familyLabel[locale];
  const modeLabel =
    kind === 'avatar' ? (locale === 'ru' ? 'Аватар' : 'Avatar')
    : kind === 'motion' ? (locale === 'ru' ? 'Движение' : 'Motion')
    : kind === 'storyboard' ? (locale === 'ru' ? 'Сцены' : 'Scenes')
    : kind === 'character' ? (locale === 'ru' ? 'Персонаж' : 'Character')
    : kind === 'speech' ? (locale === 'ru' ? 'Речь' : 'Speech')
    : kind === 'watermark' ? (locale === 'ru' ? 'Сервис' : 'Utility')
    : kind === 'extend' ? (locale === 'ru' ? 'Продолжение' : 'Extend')
    : kind === 'video' ? (locale === 'ru' ? 'По видео' : 'Video')
    : kind === 'image' ? (locale === 'ru' ? 'По изображению' : 'Image')
    : locale === 'ru' ? 'По тексту' : 'Text';

  const qualityLabel =
    model.resolutions?.includes('1080p') ? '1080p'
    : model.resolutions?.[0] || (model.durationOptions?.length ? `${model.durationOptions[0]}s` : null);

  return [family, modeLabel, qualityLabel].filter(Boolean) as string[];
}

function getVideoCardImage(model: VideoModelDefinition) {
  return VIDEO_MODEL_IMAGE_MAP[model.id];
}

function getImageCardDescription(modelId: string, type: string, locale: SupportedLocale) {
  if (modelId.includes('remove-background')) {
    return locale === 'ru'
      ? 'Убирает фон и оставляет чистый объект для каталога, карточки товара или макета.'
      : 'Removes the background and keeps a clean subject for product or design use.';
  }
  if (modelId.includes('upscale')) {
    return locale === 'ru'
      ? 'Повышает четкость и детализацию готового изображения.'
      : 'Increases sharpness and detail on an existing image.';
  }
  if (modelId.includes('character')) {
    return locale === 'ru'
      ? 'Помогает удерживать одного персонажа в нескольких вариантах и сценах.'
      : 'Helps keep one character consistent across multiple versions and scenes.';
  }
  if (type === 'edit') {
    return locale === 'ru'
      ? 'Переделывает загруженное изображение по новому запросу.'
      : 'Transforms an uploaded image using a new prompt.';
  }
  return locale === 'ru'
    ? 'Создает новое изображение по текстовому описанию.'
    : 'Creates a new image from a text prompt.';
}

function getImageCardChips(groupLabel: string, modelId: string, type: string, locale: SupportedLocale) {
  const mode =
    modelId.includes('remove-background') ? (locale === 'ru' ? 'Без фона' : 'Cutout')
    : modelId.includes('upscale') ? (locale === 'ru' ? 'Четкость' : 'Upscale')
    : modelId.includes('character') ? (locale === 'ru' ? 'Персонаж' : 'Character')
    : type === 'edit' ? (locale === 'ru' ? 'Правки' : 'Edit')
    : locale === 'ru' ? 'Генерация' : 'Generate';

  const extra =
    modelId.includes('imagen4-ultra') || modelId.includes('nano-banana-pro') ? '4K'
    : modelId.includes('nano-banana') ? (locale === 'ru' ? 'Референсы' : 'Refs')
    : modelId.includes('seedream') ? (locale === 'ru' ? 'Стиль' : 'Style')
    : modelId.includes('ideogram') ? (locale === 'ru' ? 'Типографика' : 'Typography')
    : modelId.includes('qwen') ? (locale === 'ru' ? 'Быстро' : 'Fast')
    : null;

  return [groupLabel, mode, extra].filter(Boolean) as string[];
}

function getImageCardImage(modelId: string) {
  return IMAGE_MODEL_IMAGE_MAP[modelId];
}

export function buildVideoDirectory(locale: SupportedLocale): DirectoryGroup[] {
  const familyOrder: VideoFamilyId[] = ['bytedance', 'kling', 'veo', 'hailuo', 'wan', 'grok', 'pixverse', 'runway'];

  return familyOrder.map((family) => {
    const familyModels = VIDEO_MODELS.filter((model) => model.family === family);
    return {
      id: family,
      title: familyModels[0]?.familyLabel[locale] || family,
      description: VIDEO_GROUP_DESCRIPTIONS[family][locale],
      cards: familyModels.map((model) => ({
        id: model.id,
        title: model.name,
        description: getVideoCardDescription(model, locale),
        href: `/video?model=${encodeURIComponent(model.id)}`,
        image: getVideoCardImage(model),
        chips: getVideoCardChips(model, locale),
      })),
    };
  });
}

export function buildImageDirectory(locale: SupportedLocale): DirectoryGroup[] {
  return HOME_IMAGE_MODELS.map((group) => ({
    id: group.groupId,
    title: group.groupLabel[locale],
    description: group.groupDescription[locale],
    cards: group.models.map((model) => ({
      id: model.id,
        title: model.name,
        description: getImageCardDescription(model.id, model.type, locale),
        href: `/images?model=${encodeURIComponent(model.id)}`,
        image: getImageCardImage(model.id),
        chips: getImageCardChips(group.groupLabel[locale], model.id, model.type, locale),
      })),
  }));
}
