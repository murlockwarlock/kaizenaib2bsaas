export type VideoModelId =
  | 'bytedance/seedance-2-5'
  | 'bytedance/seedance-2'
  | 'bytedance/seedance-2-fast'
  | 'bytedance/seedance-2-mini'
  | 'bytedance/seedance-1-5-pro'
  | 'bytedance/v1-pro-fast-image-to-video'
  | 'bytedance/v1-pro-image-to-video'
  | 'bytedance/v1-pro-text-to-video'
  | 'bytedance/v1-lite-image-to-video'
  | 'bytedance/v1-lite-text-to-video'
  | 'kling-2.6/text-to-video'
  | 'kling-2.6/image-to-video'
  | 'kling/v2-1-master-image-to-video'
  | 'kling/v2-5-turbo-text-to-video-pro'
  | 'kling/ai-avatar-standard'
  | 'kling/ai-avatar-pro'
  | 'kling-3/motion-control'
  | 'kling-3.0/video'
  | 'kling-4.0/reference-to-video'
  | 'kling-4.0/keyframe-to-video'
  | 'veo-3-1'
  | 'veo-3.1/text-fast'
  | 'veo-3.1/text-quality'
  | 'veo-3.1/image-fast'
  | 'veo-3.1/image-quality'
  | 'veo-3.1/reference-fast'
  | 'veo-3.1/extend-fast'
  | 'veo-3.1/extend-quality'
  | 'hailuo/2-3-image-to-video-standard'
  | 'hailuo/02-text-to-video-pro'
  | 'hailuo/02-image-to-video-pro'
  | 'hailuo/02-text-to-video-standard'
  | 'hailuo/02-image-to-video-standard'
  | 'hailuo/2-3-image-to-video-pro'
  | 'wan/2-6-image-to-video'
  | 'wan/2-6-text-to-video'
  | 'wan/2-6-video-to-video'
  | 'wan/2-2-a14b-image-to-video-turbo'
  | 'wan/2-2-a14b-text-to-video-turbo'
  | 'wan/2-2-a14b-speech-to-video-turbo'
  | 'wan/2-2-animate-move'
  | 'wan/2-2-animate-replace'
  | 'wan/2-6-flash-image-to-video'
  | 'wan/2-6-flash-video-to-video'
  | 'wan/2-7-text-to-video'
  | 'wan/2-7-image-to-video'
  | 'wan/2-7-videoedit'
  | 'wan/2-7-r2v'
  | 'wan/3-0-video'
  | 'wan/3-0-video-prime'
  | 'grok-imagine-video-1-5-preview'
  | 'pixverse-v6-max/text-to-video'
  | 'pixverse-v6-max/image-to-video'
  | 'runway/generate'
  | 'runway/extend'
  | 'runway/aleph-generate';

export type VideoFamilyId = 'bytedance' | 'kling' | 'veo' | 'hailuo' | 'wan' | 'runway' | 'grok' | 'pixverse';

export type UploadSlot = {
  key: string;
  label: string;
  kind: 'image' | 'video' | 'audio';
  maxFiles: number;
  help: string;
  required?: boolean;
};

export type VideoModelDefinition = {
  id: VideoModelId;
  name: string;
  family: VideoFamilyId;
  familyLabel: { ru: string; en: string };
  summary: { ru: string; en: string };
  promptRequired: boolean;
  promptOptional?: boolean;
  aspectRatios?: string[];
  resolutions?: string[];
  durationOptions?: number[];
  frameOptions?: number[];
  modeOptions?: string[];
  sizeOptions?: string[];
  accelerationOptions?: string[];
  supportsSound?: boolean;
  supportsRemoveWatermark?: boolean;
  supportsCameraFixed?: boolean;
  supportsFixedLens?: boolean;
  supportsGenerateAudio?: boolean;
  supportsSafetyChecker?: boolean;
  supportsSeed?: boolean;
  supportsEndImage?: boolean;
  supportsPromptOptimizer?: boolean;
  supportsEnablePromptExpansion?: boolean;
  supportsAcceleration?: boolean;
  supportsAudioFlag?: boolean;
  supportsNumFrames?: boolean;
  supportsFramesPerSecond?: boolean;
  supportsGuidanceScale?: boolean;
  supportsInferenceSteps?: boolean;
  supportsShift?: boolean;
  supportsWatermarkText?: boolean;
  supportsNegativePrompt?: boolean;
  supportsCfgScale?: boolean;
  supportsCharacterIds?: boolean;
  supportsMultiShots?: boolean;
  supportsMultiShotsToggle?: boolean;
  supportsKlingElements?: boolean;
  supportsStoryboardShots?: boolean;
  supportsCharacterPrompt?: boolean;
  supportsSafetyInstruction?: boolean;
  supportsOriginTaskId?: boolean;
  supportsTimestamps?: boolean;
  supportsCharacterUserName?: boolean;
  videoUrlInput?: boolean;
  uploadSlots?: UploadSlot[];
};

export const VIDEO_FAMILY_LABELS: Record<VideoFamilyId, { ru: string; en: string }> = {
  bytedance: { ru: 'Bytedance', en: 'Bytedance' },
  kling: { ru: 'Kling', en: 'Kling' },
  veo: { ru: 'VEO', en: 'VEO' },
  hailuo: { ru: 'Hailuo', en: 'Hailuo' },
  wan: { ru: 'Wan', en: 'Wan' },
  runway: { ru: 'Runway', en: 'Runway' },
  grok: { ru: 'Grok', en: 'Grok' },
  pixverse: { ru: 'PixVerse', en: 'PixVerse' },
};

export const VIDEO_ACCELERATION_OPTIONS = ['none'];

export const VIDEO_MODELS: VideoModelDefinition[] = [
  {
    id: 'bytedance/seedance-2-5',
    name: 'Seedance 2.5',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Новая мультимодальная модель ByteDance: до 30 секунд, 1080p и референсы изображений, видео и аудио.',
      en: 'ByteDance\'s newer multimodal model with up to 30 seconds, 1080p and image, video and audio references.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'],
    resolutions: ['480p', '720p', '1080p'],
    durationOptions: [4, 5, 8, 10, 15, 30],
    supportsGenerateAudio: true,
    uploadSlots: [
      { key: 'first_frame_url', label: 'Первый кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Первый кадр ролика.', required: false },
      { key: 'last_frame_url', label: 'Последний кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Последний кадр; используется вместе с первым.', required: false },
      { key: 'reference_image_urls', label: 'Референсы изображений', kind: 'image', maxFiles: 10, help: 'Необязательные изображения для управления сценой.', required: false },
      { key: 'reference_video_urls', label: 'Референсы видео', kind: 'video', maxFiles: 3, help: 'Необязательные видео-референсы.', required: false },
      { key: 'reference_audio_urls', label: 'Референсы аудио', kind: 'audio', maxFiles: 3, help: 'Необязательные аудио-референсы.', required: false },
    ],
  },
  {
    id: 'bytedance/seedance-2',
    name: 'Seedance 2.0',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Мультимодальный Seedance 2.0 для текста, кадров, видео- и аудиореференсов, включая 4K.',
      en: 'Multimodal Seedance 2.0 for text, frames, video and audio references, including 4K output.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
    resolutions: ['480p', '720p', '1080p', '4k'],
    durationOptions: [4, 5, 8, 10, 15],
    supportsGenerateAudio: true,
    uploadSlots: [
      { key: 'first_frame_url', label: 'Первый кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Первый кадр; не смешивается с reference-полями.', required: false },
      { key: 'last_frame_url', label: 'Последний кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Требует первый кадр.', required: false },
      { key: 'reference_image_urls', label: 'Референсы изображений', kind: 'image', maxFiles: 9, help: 'Необязательные изображения для мультимодального режима.', required: false },
      { key: 'reference_video_urls', label: 'Референсы видео', kind: 'video', maxFiles: 3, help: 'Необязательные видео-референсы.', required: false },
      { key: 'reference_audio_urls', label: 'Референсы аудио', kind: 'audio', maxFiles: 3, help: 'Необязательные аудио-референсы.', required: false },
    ],
  },
  {
    id: 'bytedance/seedance-2-fast',
    name: 'Seedance 2.0 Fast',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Быстрый и более экономичный Seedance 2.0 для итераций и массовых роликов.',
      en: 'Faster, more cost-efficient Seedance 2.0 for iteration and scaled video workflows.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
    resolutions: ['480p', '720p'],
    durationOptions: [4, 5, 8, 10, 15],
    supportsGenerateAudio: true,
    uploadSlots: [
      { key: 'first_frame_url', label: 'Первый кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Первый кадр.', required: false },
      { key: 'last_frame_url', label: 'Последний кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Требует первый кадр.', required: false },
      { key: 'reference_image_urls', label: 'Референсы изображений', kind: 'image', maxFiles: 9, help: 'Необязательные изображения.', required: false },
      { key: 'reference_video_urls', label: 'Референсы видео', kind: 'video', maxFiles: 3, help: 'Необязательные видео-референсы.', required: false },
      { key: 'reference_audio_urls', label: 'Референсы аудио', kind: 'audio', maxFiles: 3, help: 'Необязательные аудио-референсы.', required: false },
    ],
  },
  {
    id: 'bytedance/seedance-2-mini',
    name: 'Seedance 2.0 Mini',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Экономичный Seedance 2.0 Mini для быстрых проверок и недорогих генераций.',
      en: 'Cost-efficient Seedance 2.0 Mini for fast checks and lower-cost generations.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'],
    resolutions: ['480p', '720p'],
    durationOptions: [4, 5, 8, 10, 15],
    supportsGenerateAudio: true,
    uploadSlots: [
      { key: 'first_frame_url', label: 'Первый кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Первый кадр.', required: false },
      { key: 'last_frame_url', label: 'Последний кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Требует первый кадр.', required: false },
      { key: 'reference_image_urls', label: 'Референсы изображений', kind: 'image', maxFiles: 9, help: 'Необязательные изображения.', required: false },
      { key: 'reference_video_urls', label: 'Референсы видео', kind: 'video', maxFiles: 3, help: 'Необязательные видео-референсы.', required: false },
      { key: 'reference_audio_urls', label: 'Референсы аудио', kind: 'audio', maxFiles: 3, help: 'Необязательные аудио-референсы.', required: false },
    ],
  },
  {
    id: 'kling-4.0/reference-to-video',
    name: 'Kling 4.0 Reference',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Kling 4.0 для сцен с референсными изображениями и видео, синхронным звуком и элементами.',
      en: 'Kling 4.0 for reference images and videos, synchronized sound and reusable elements.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['720p', '1080p'],
    durationOptions: [5, 10, 15, 30],
    supportsKlingElements: true,
    uploadSlots: [
      { key: 'image_urls', label: 'Референсы изображений', kind: 'image', maxFiles: 10, help: 'Необязательно. Изображения, на которые можно ссылаться в промпте.', required: false },
      { key: 'video_urls', label: 'Референсы видео', kind: 'video', maxFiles: 5, help: 'Необязательно. Видео, на которые можно ссылаться в промпте.', required: false },
    ],
  },
  {
    id: 'kling-4.0/keyframe-to-video',
    name: 'Kling 4.0 Keyframe',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Kling 4.0 с первым, промежуточными и последним ключевыми кадрами.',
      en: 'Kling 4.0 with first, middle and last keyframes for directed transitions.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    durationOptions: [5, 10, 15, 30],
    uploadSlots: [
      { key: 'first_frame_url', label: 'Первый кадр', kind: 'image', maxFiles: 1, help: 'Обязательный стартовый кадр.' },
      { key: 'keyframe_urls', label: 'Промежуточные кадры', kind: 'image', maxFiles: 8, help: 'Необязательные промежуточные кадры.', required: false },
      { key: 'last_frame_url', label: 'Последний кадр', kind: 'image', maxFiles: 1, help: 'Необязательный финальный кадр.', required: false },
    ],
  },
  {
    id: 'veo-3-1',
    name: 'Veo 3.1 Unified',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Актуальный unified-путь Veo 3.1 для текста, одного/двух кадров и native audio.',
      en: 'The current unified Veo 3.1 path for text, one/two frame references and native audio.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p', '4k'],
    durationOptions: [4, 6, 8],
    uploadSlots: [
      { key: 'image_urls', label: 'Кадры-референсы', kind: 'image', maxFiles: 2, help: 'Необязательно. Один или два кадра для image-to-video.', required: false },
    ],
  },
  {
    id: 'grok-imagine-video-1-5-preview',
    name: 'Grok Imagine Video 1.5',
    family: 'grok',
    familyLabel: VIDEO_FAMILY_LABELS.grok,
    summary: {
      ru: 'Grok Imagine Video 1.5 с генерацией синхронного аудио и поддержкой keyframes.',
      en: 'Grok Imagine Video 1.5 with synchronized audio and keyframe-aware generation.',
    },
    promptRequired: true,
    aspectRatios: ['auto', '1:1', '16:9', '9:16', '3:2', '2:3'],
    resolutions: ['480p', '720p', '1080p'],
    durationOptions: [1, 4, 8, 12, 15],
    uploadSlots: [
      { key: 'image_urls', label: 'Кадры-референсы', kind: 'image', maxFiles: 7, help: 'Необязательные изображения; в промпте используются ссылки @image1, @image2 и т.д.', required: false },
    ],
  },
  {
    id: 'pixverse-v6-max/text-to-video',
    name: 'PixVerse V6 Max Text',
    family: 'pixverse',
    familyLabel: VIDEO_FAMILY_LABELS.pixverse,
    summary: {
      ru: 'Актуальный PixVerse V6 Max для кинематографичного text-to-video до 15 секунд с опциональным native audio.',
      en: 'Current PixVerse V6 Max text-to-video for cinematic clips up to 15 seconds with optional native audio.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    resolutions: ['360p', '540p', '720p', '1080p'],
    durationOptions: [5, 8, 10, 15],
    supportsGenerateAudio: true,
    supportsSeed: true,
  },
  {
    id: 'pixverse-v6-max/image-to-video',
    name: 'PixVerse V6 Max Image',
    family: 'pixverse',
    familyLabel: VIDEO_FAMILY_LABELS.pixverse,
    summary: {
      ru: 'PixVerse V6 Max для оживления одного изображения с native audio; пропорции берутся из входного изображения.',
      en: 'PixVerse V6 Max image-to-video from one input image with optional native audio; aspect follows the input.',
    },
    promptRequired: true,
    resolutions: ['360p', '540p', '720p', '1080p'],
    durationOptions: [5, 8, 10, 15],
    supportsGenerateAudio: true,
    supportsSeed: true,
    uploadSlots: [
      { key: 'image_urls', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Одно изображение используется как первый кадр.' },
    ],
  },
  {
    id: 'wan/2-7-text-to-video',
    name: 'Wan 2.7 Text',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Новый текстовый Wan 2.7 с prompt extension, native audio и 1080p.',
      en: 'New Wan 2.7 text-to-video with prompt extension, native audio and 1080p.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'],
    resolutions: ['480p', '720p', '1080p'],
    durationOptions: [5, 10],
    supportsEnablePromptExpansion: true,
    uploadSlots: [
      { key: 'audio_url', label: 'Аудио-референс', kind: 'audio', maxFiles: 1, help: 'Необязательно. Исходная дорожка.', required: false },
    ],
  },
  {
    id: 'wan/2-7-image-to-video',
    name: 'Wan 2.7 Image',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Wan 2.7 для первого кадра, пары первый/последний кадр или продолжения клипа.',
      en: 'Wan 2.7 for first-frame, first/last-frame and clip-continuation workflows.',
    },
    promptRequired: true,
    resolutions: ['480p', '720p', '1080p'],
    durationOptions: [5, 10],
    supportsEnablePromptExpansion: true,
    uploadSlots: [
      { key: 'first_frame_url', label: 'Первый кадр', kind: 'image', maxFiles: 1, help: 'Обязательный кадр или замените его исходным клипом.', required: false },
      { key: 'last_frame_url', label: 'Последний кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Финальный кадр.', required: false },
      { key: 'first_clip_url', label: 'Исходный клип', kind: 'video', maxFiles: 1, help: 'Необязательно. Для продолжения видео.', required: false },
    ],
  },
  {
    id: 'wan/2-7-videoedit',
    name: 'Wan 2.7 Video Edit',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Wan 2.7 для редактирования готового видео с референсным изображением.',
      en: 'Wan 2.7 for editing an existing video with an optional reference image.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['480p', '720p', '1080p'],
    durationOptions: [5, 10],
    supportsEnablePromptExpansion: true,
    uploadSlots: [
      { key: 'video_url', label: 'Исходное видео', kind: 'video', maxFiles: 1, help: 'Обязательное видео для редактирования.' },
      { key: 'reference_image', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Необязательная картинка для замены/добавления.', required: false },
    ],
  },
  {
    id: 'wan/2-7-r2v',
    name: 'Wan 2.7 Reference',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Wan 2.7 с несколькими референсными изображениями, видео и первым кадром.',
      en: 'Wan 2.7 with multiple reference images, videos and a first frame.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    resolutions: ['480p', '720p', '1080p'],
    durationOptions: [5, 10],
    supportsEnablePromptExpansion: true,
    uploadSlots: [
      { key: 'reference_image', label: 'Референсы изображений', kind: 'image', maxFiles: 9, help: 'Минимум один референс.', required: false },
      { key: 'reference_video', label: 'Референсы видео', kind: 'video', maxFiles: 3, help: 'Необязательные видео-референсы.', required: false },
      { key: 'first_frame', label: 'Первый кадр', kind: 'image', maxFiles: 1, help: 'Необязательный первый кадр.', required: false },
      { key: 'reference_voice', label: 'Голосовой референс', kind: 'audio', maxFiles: 1, help: 'Необязательная голосовая дорожка.', required: false },
    ],
  },
  {
    id: 'wan/3-0-video',
    name: 'Wan 3.0',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Wan 3.0 для мультимодальных сцен с native audio.',
      en: 'Wan 3.0 for multimodal scenes with native audio.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', 'adaptive'],
    resolutions: ['480P', '720P', '1080P'],
    durationOptions: [5, 10],
    supportsGenerateAudio: true,
    uploadSlots: [
      { key: 'image_urls', label: 'Изображения', kind: 'image', maxFiles: 9, help: 'Необязательные изображения.', required: false },
      { key: 'video_urls', label: 'Видео', kind: 'video', maxFiles: 3, help: 'Необязательные видео-референсы.', required: false },
      { key: 'audio_urls', label: 'Аудио', kind: 'audio', maxFiles: 3, help: 'Необязательные аудио-референсы.', required: false },
    ],
  },
  {
    id: 'wan/3-0-video-prime',
    name: 'Wan 3.0 Prime',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Ускоренный Wan 3.0 Prime для повседневных генераций и native audio.',
      en: 'Faster Wan 3.0 Prime for everyday generations with native audio.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', 'adaptive'],
    resolutions: ['480P', '720P', '1080P'],
    durationOptions: [5, 10],
    supportsGenerateAudio: true,
  },
  {
    id: 'bytedance/seedance-1-5-pro',
    name: 'Bytedance Seedance 1.5 Pro',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Универсальный Bytedance-режим: text-to-video или image-to-video с 0-2 входными кадрами, fixed lens и audio generation.',
      en: 'Flexible Bytedance mode: text-to-video or image-to-video with 0-2 input frames, fixed lens and audio generation.',
    },
    promptRequired: true,
    aspectRatios: ['1:1', '16:9', '9:16'],
    resolutions: ['720p', '1080p'],
    durationOptions: [8, 10],
    supportsFixedLens: true,
    supportsGenerateAudio: true,
    uploadSlots: [
      { key: 'input_urls', label: 'Входные кадры', kind: 'image', maxFiles: 2, help: 'Можно не загружать ничего, один кадр или два кадра.', required: false },
    ],
  },
  {
    id: 'bytedance/v1-pro-fast-image-to-video',
    name: 'Bytedance V1 Pro Fast Image',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Быстрый режим для короткой анимации одного изображения.',
      en: 'Fast mode for turning a single image into a short animated clip.',
    },
    promptRequired: true,
    resolutions: ['720p'],
    durationOptions: [5],
    uploadSlots: [
      { key: 'image_url', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Один стартовый кадр.' },
    ],
  },
  {
    id: 'bytedance/v1-pro-image-to-video',
    name: 'Bytedance V1 Pro Image',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Более управляемый image-to-video режим для портретов, товаров и спокойного движения камеры.',
      en: 'More controlled image-to-video mode for portraits, products and steadier camera motion.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    durationOptions: [5, 10],
    supportsCameraFixed: true,
    supportsSafetyChecker: true,
    supportsSeed: true,
    uploadSlots: [
      { key: 'image_url', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Один стартовый кадр.' },
    ],
  },
  {
    id: 'bytedance/v1-pro-text-to-video',
    name: 'Bytedance V1 Pro Text',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Сильный универсальный текстовый режим Bytedance для обычных коротких сцен.',
      en: 'Solid all-purpose Bytedance text mode for everyday short-form scenes.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['720p', '1080p'],
    durationOptions: [5, 10],
    supportsCameraFixed: true,
    supportsSafetyChecker: true,
    supportsSeed: true,
  },
  {
    id: 'bytedance/v1-lite-image-to-video',
    name: 'Bytedance V1 Lite Image',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Облегчённый режим для анимации одного изображения с более простым и быстрым результатом.',
      en: 'Lightweight mode for animating a single image into a faster, simpler result.',
    },
    promptRequired: true,
    resolutions: ['720p'],
    durationOptions: [5],
    supportsCameraFixed: true,
    supportsSafetyChecker: true,
    supportsSeed: true,
    supportsEndImage: true,
    uploadSlots: [
      { key: 'image_url', label: 'Стартовый кадр', kind: 'image', maxFiles: 1, help: 'Первый кадр генерации.' },
      { key: 'end_image_url', label: 'Финальный кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Конечный кадр для направления движения.', required: false },
    ],
  },
  {
    id: 'bytedance/v1-lite-text-to-video',
    name: 'Bytedance V1 Lite Text',
    family: 'bytedance',
    familyLabel: VIDEO_FAMILY_LABELS.bytedance,
    summary: {
      ru: 'Быстрый текстовый режим для коротких сцен, когда нужен простой результат без тяжёлой настройки.',
      en: 'Fast text-to-video mode for short scenes when you want a simpler result without heavy setup.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['720p'],
    durationOptions: [5],
    supportsCameraFixed: true,
    supportsSafetyChecker: true,
  },
  {
    id: 'kling-2.6/text-to-video',
    name: 'Kling 2.6 Text',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Текст в видео с выбором звука, формата кадра и 5/10 секунд.',
      en: 'Text-to-video with sound toggle, frame format and 5/10s output.',
    },
    promptRequired: true,
    aspectRatios: ['1:1', '16:9', '9:16'],
    durationOptions: [5, 10],
    supportsSound: true,
  },
  {
    id: 'kling-2.6/image-to-video',
    name: 'Kling 2.6 Image',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Анимирует один кадр в видео; можно включить или выключить звук.',
      en: 'Animates one still image into video with optional sound.',
    },
    promptRequired: true,
    durationOptions: [5, 10],
    supportsSound: true,
    uploadSlots: [
      { key: 'image_urls', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Первый кадр для анимации.' },
    ],
  },
  {
    id: 'kling/v2-1-master-image-to-video',
    name: 'Kling V2.1 Master Image',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Более управляемый image-to-video режим для аккуратного движения от сильного стартового кадра.',
      en: 'More controlled image-to-video mode for cleaner motion from a strong starting frame.',
    },
    promptRequired: true,
    durationOptions: [5, 10],
    supportsNegativePrompt: true,
    supportsCfgScale: true,
    uploadSlots: [
      { key: 'image_url', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Исходный кадр для генерации.' },
    ],
  },
  {
    id: 'kling/v2-5-turbo-text-to-video-pro',
    name: 'Kling V2.5 Turbo Pro',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Быстрый Kling-режим для динамичных текстовых роликов с упором на скорость и понятный результат.',
      en: 'Fast Kling mode for dynamic text-to-video clips focused on speed and reliable output.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    durationOptions: [5, 10],
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },
  {
    id: 'kling/ai-avatar-standard',
    name: 'Kling AI Avatar Standard',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Аватар из изображения и аудио.',
      en: 'Avatar video from one image and one audio track.',
    },
    promptRequired: false,
    promptOptional: true,
    uploadSlots: [
      { key: 'image_url', label: 'Аватар', kind: 'image', maxFiles: 1, help: 'Портрет или аватар персонажа.' },
      { key: 'audio_url', label: 'Аудио', kind: 'audio', maxFiles: 1, help: 'Голос или речь для анимации.' },
    ],
  },
  {
    id: 'kling/ai-avatar-pro',
    name: 'Kling AI Avatar Pro',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Продвинутый AI Avatar с тем же входом: изображение + аудио.',
      en: 'Higher-end avatar mode using image plus audio.',
    },
    promptRequired: false,
    promptOptional: true,
    uploadSlots: [
      { key: 'image_url', label: 'Аватар', kind: 'image', maxFiles: 1, help: 'Портрет или аватар персонажа.' },
      { key: 'audio_url', label: 'Аудио', kind: 'audio', maxFiles: 1, help: 'Голос или речь для анимации.' },
    ],
  },
  {
    id: 'kling-3/motion-control',
    name: 'Kling Motion Control',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Переносит движение из видео на изображение персонажа. Лучше всего работает, когда и на фото, и в первом кадре видео хорошо видны голова, плечи и торс.',
      en: 'Transfers motion from a guide video onto a character image. Works best when both the image and the first video frame clearly show the head, shoulders and torso.',
    },
    promptRequired: false,
    promptOptional: true,
    modeOptions: ['720p', '1080p'],
    uploadSlots: [
      { key: 'input_urls', label: 'Изображение персонажа', kind: 'image', maxFiles: 1, help: 'Чёткое фото с видимыми головой, плечами и торсом. Персонаж отсюда считается основным.' },
      { key: 'video_urls', label: 'Видео-референс', kind: 'video', maxFiles: 1, help: 'Видео с движением, где в первом кадре тоже хорошо видны голова, плечи и торс.' },
    ],
  },
  {
    id: 'kling-3.0/video',
    name: 'Kling 3.0 Video',
    family: 'kling',
    familyLabel: VIDEO_FAMILY_LABELS.kling,
    summary: {
      ru: 'Самый гибкий Kling-режим для режиссируемых сцен, нескольких шотов и более сложной постановки.',
      en: 'Most flexible Kling mode for directed scenes, multi-shot sequences and more complex video setups.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    durationOptions: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    modeOptions: ['std', 'pro', '4K'],
    supportsSound: true,
    supportsMultiShots: true,
    supportsKlingElements: true,
    uploadSlots: [
      { key: 'image_urls', label: 'Кадры-референсы', kind: 'image', maxFiles: 2, help: 'Можно загрузить первый и последний кадр.' },
    ],
  },
  {
    id: 'veo-3.1/text-fast',
    name: 'VEO 3.1 Text Fast',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Быстрый text-to-video режим VEO 3.1 без обязательных референсов.',
      en: 'Fast VEO 3.1 text-to-video mode with no required references.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16'],
    durationOptions: [5, 8],
  },
  {
    id: 'veo-3.1/text-quality',
    name: 'VEO 3.1 Text Quality',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Качественный text-to-video режим VEO 3.1 для более дорогого и реалистичного результата.',
      en: 'Higher-quality VEO 3.1 text-to-video mode for a more premium realistic result.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16'],
    durationOptions: [5, 8],
  },
  {
    id: 'veo-3.1/image-fast',
    name: 'VEO 3.1 Image Fast',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Быстрый image-to-video режим VEO 3.1 с одним или двумя кадрами-референсами.',
      en: 'Fast VEO 3.1 image-to-video mode with one or two reference frames.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16'],
    durationOptions: [5, 8],
    uploadSlots: [
      { key: 'image_urls', label: 'Референсные кадры', kind: 'image', maxFiles: 2, help: 'Загрузите один кадр или первый и последний кадр.', required: true },
    ],
  },
  {
    id: 'veo-3.1/image-quality',
    name: 'VEO 3.1 Image Quality',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Качественный image-to-video режим VEO 3.1 для более сильного реализма и аккуратного движения.',
      en: 'Higher-quality VEO 3.1 image-to-video mode for stronger realism and cleaner motion.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16'],
    durationOptions: [5, 8],
    uploadSlots: [
      { key: 'image_urls', label: 'Референсные кадры', kind: 'image', maxFiles: 2, help: 'Загрузите один кадр или первый и последний кадр.', required: true },
    ],
  },
  {
    id: 'veo-3.1/reference-fast',
    name: 'VEO 3.1 Reference Fast',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Режим VEO 3.1 для reference-to-video: несколько референсов плюс быстрый результат.',
      en: 'VEO 3.1 reference-to-video mode using multiple references for a faster result.',
    },
    promptRequired: true,
    aspectRatios: ['16:9'],
    durationOptions: [8],
    uploadSlots: [
      { key: 'image_urls', label: 'Референсы', kind: 'image', maxFiles: 3, help: 'Загрузите до трех референсных изображений.', required: true },
    ],
  },
  {
    id: 'veo-3.1/extend-fast',
    name: 'VEO 3.1 Extend Fast',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Быстрое продолжение уже готового VEO-ролика по его ID.',
      en: 'Fast continuation of an existing VEO clip using its task ID.',
    },
    promptRequired: true,
    supportsOriginTaskId: true,
  },
  {
    id: 'veo-3.1/extend-quality',
    name: 'VEO 3.1 Extend Quality',
    family: 'veo',
    familyLabel: VIDEO_FAMILY_LABELS.veo,
    summary: {
      ru: 'Качественное продолжение уже готового VEO-ролика по его ID.',
      en: 'Higher-quality continuation of an existing VEO clip using its task ID.',
    },
    promptRequired: true,
    supportsOriginTaskId: true,
  },
  {
    id: 'hailuo/2-3-image-to-video-pro',
    name: 'Hailuo V2.3 Image',
    family: 'hailuo',
    familyLabel: VIDEO_FAMILY_LABELS.hailuo,
    summary: {
      ru: 'Сильный Hailuo-режим для оживления одного изображения с аккуратным движением и чистой картинкой.',
      en: 'Strong Hailuo mode for animating a single image with clean motion and polished visuals.',
    },
    promptRequired: true,
    resolutions: ['768P'],
    durationOptions: [6],
    uploadSlots: [
      { key: 'image_url', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Исходный кадр для анимации.' },
    ],
  },
  {
    id: 'hailuo/2-3-image-to-video-standard',
    name: 'Hailuo V2.3 Standard Image',
    family: 'hailuo',
    familyLabel: VIDEO_FAMILY_LABELS.hailuo,
    summary: {
      ru: 'Более доступный Hailuo-режим для простой анимации изображения без лишней сложности.',
      en: 'More affordable Hailuo mode for straightforward image animation without extra complexity.',
    },
    promptRequired: true,
    resolutions: ['768P'],
    durationOptions: [6],
    uploadSlots: [
      { key: 'image_url', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Исходный кадр для анимации.' },
    ],
  },
  {
    id: 'hailuo/02-text-to-video-pro',
    name: 'Hailuo 02 Text Pro',
    family: 'hailuo',
    familyLabel: VIDEO_FAMILY_LABELS.hailuo,
    summary: {
      ru: 'Текстовый Hailuo-режим для чистых коротких сцен, когда нужен аккуратный cinematic результат.',
      en: 'Hailuo text mode for clean short-form scenes when you want a polished cinematic result.',
    },
    promptRequired: true,
    supportsPromptOptimizer: true,
  },
  {
    id: 'hailuo/02-image-to-video-pro',
    name: 'Hailuo 02 Image Pro',
    family: 'hailuo',
    familyLabel: VIDEO_FAMILY_LABELS.hailuo,
    summary: {
      ru: 'Hailuo image-to-video режим с возможностью мягко направить движение от стартового к финальному кадру.',
      en: 'Hailuo image-to-video mode that can gently guide motion from a starting frame toward an optional ending frame.',
    },
    promptRequired: true,
    supportsPromptOptimizer: true,
    supportsEndImage: true,
    uploadSlots: [
      { key: 'image_url', label: 'Стартовый кадр', kind: 'image', maxFiles: 1, help: 'Первый кадр генерации.' },
      { key: 'end_image_url', label: 'Финальный кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Конечный кадр.', required: false },
    ],
  },
  {
    id: 'hailuo/02-text-to-video-standard',
    name: 'Hailuo 02 Text Standard',
    family: 'hailuo',
    familyLabel: VIDEO_FAMILY_LABELS.hailuo,
    summary: {
      ru: 'Более простой и доступный текстовый режим Hailuo для быстрых сцен и первых тестов.',
      en: 'Simpler and more affordable Hailuo text mode for quick scenes and first-pass tests.',
    },
    promptRequired: true,
    durationOptions: [6],
    supportsPromptOptimizer: true,
  },
  {
    id: 'hailuo/02-image-to-video-standard',
    name: 'Hailuo 02 Image Standard',
    family: 'hailuo',
    familyLabel: VIDEO_FAMILY_LABELS.hailuo,
    summary: {
      ru: 'Доступный image-to-video режим Hailuo для плавной анимации изображения, при желании с управлением через финальный кадр.',
      en: 'Affordable Hailuo image-to-video mode for smooth image animation, with optional guidance from an ending frame.',
    },
    promptRequired: true,
    resolutions: ['768P'],
    durationOptions: [10],
    supportsPromptOptimizer: true,
    supportsEndImage: true,
    uploadSlots: [
      { key: 'image_url', label: 'Стартовый кадр', kind: 'image', maxFiles: 1, help: 'Первый кадр генерации.' },
      { key: 'end_image_url', label: 'Финальный кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Конечный кадр.', required: false },
    ],
  },
  {
    id: 'wan/2-6-text-to-video',
    name: 'Wan 2.6 Text',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Базовый текстовый режим Wan для универсальных коротких сцен и спокойного рабочего результата.',
      en: 'Core Wan text mode for general short-form scenes and steady day-to-day results.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    durationOptions: [5],
  },
  {
    id: 'wan/2-6-image-to-video',
    name: 'Wan 2.6 Image',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Универсальный Wan-режим для оживления одного кадра в короткий ролик.',
      en: 'General-purpose Wan mode for turning a single frame into a short animated clip.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    durationOptions: [5],
    uploadSlots: [
      { key: 'image_urls', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Первый кадр видео.' },
    ],
  },
  {
    id: 'wan/2-6-video-to-video',
    name: 'Wan 2.6 Video',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Wan video-to-video режим для переработки готового ролика в новый визуальный стиль.',
      en: 'Wan video-to-video mode for transforming an existing clip into a new visual direction.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    durationOptions: [5],
    uploadSlots: [
      { key: 'video_urls', label: 'Видео-референс', kind: 'video', maxFiles: 1, help: 'Исходное видео для преобразования.' },
    ],
  },
  {
    id: 'wan/2-2-a14b-image-to-video-turbo',
    name: 'Wan 2.2 A14B Image Turbo',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Быстрый Wan-режим для оживления одного кадра, когда важна скорость итераций.',
      en: 'Fast Wan mode for animating a single frame when quick iteration matters most.',
    },
    promptRequired: true,
    resolutions: ['720p'],
    supportsSeed: true,
    supportsEnablePromptExpansion: true,
    accelerationOptions: VIDEO_ACCELERATION_OPTIONS,
    supportsAcceleration: true,
    uploadSlots: [
      { key: 'image_url', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Стартовый кадр.' },
    ],
  },
  {
    id: 'wan/2-2-a14b-text-to-video-turbo',
    name: 'Wan 2.2 Turbo',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Быстрый текстовый Wan-режим для первых проходов, проб и черновых идей.',
      en: 'Fast Wan text mode for first-pass clips, quick tests and rough concept exploration.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['720p'],
    supportsSeed: true,
    supportsEnablePromptExpansion: true,
    accelerationOptions: VIDEO_ACCELERATION_OPTIONS,
    supportsAcceleration: true,
  },
  {
    id: 'wan/2-2-a14b-speech-to-video-turbo',
    name: 'Wan 2.2 Speech Turbo',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Speech-to-video: изображение + аудио, с контролем длины, плавности и фильтра безопасности.',
      en: 'Speech-to-video using image plus audio with control over length, smoothness and safety filtering.',
    },
    promptRequired: true,
    resolutions: ['480p'],
    supportsNegativePrompt: true,
    supportsNumFrames: true,
    supportsFramesPerSecond: true,
    supportsGuidanceScale: true,
    supportsInferenceSteps: true,
    supportsShift: true,
    supportsSafetyChecker: true,
    uploadSlots: [
      { key: 'image_url', label: 'Референсное изображение', kind: 'image', maxFiles: 1, help: 'Изображение персонажа или сцены.' },
      { key: 'audio_url', label: 'Аудио', kind: 'audio', maxFiles: 1, help: 'Аудио для синхронизации.' },
    ],
  },
  {
    id: 'wan/2-2-animate-move',
    name: 'Wan 2.2 Animate Move',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Переносит движение из видео на загруженное изображение и сохраняет основную сцену.',
      en: 'Transfers motion from a source video onto an uploaded image while preserving the main scene.',
    },
    promptRequired: false,
    promptOptional: true,
    resolutions: ['480p'],
    uploadSlots: [
      { key: 'image_url', label: 'Изображение', kind: 'image', maxFiles: 1, help: 'Исходное изображение.' },
      { key: 'video_url', label: 'Видео-движение', kind: 'video', maxFiles: 1, help: 'Видео, из которого берется движение.' },
    ],
  },
  {
    id: 'wan/2-2-animate-replace',
    name: 'Wan 2.2 Animate Replace',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Подменяет или встраивает нового персонажа либо объект в готовое видео.',
      en: 'Replaces or inserts a new character or object into an existing video.',
    },
    promptRequired: false,
    promptOptional: true,
    resolutions: ['480p'],
    uploadSlots: [
      { key: 'image_url', label: 'Кадр замены', kind: 'image', maxFiles: 1, help: 'Изображение, которое будет вставлено в сцену.' },
      { key: 'video_url', label: 'Исходное видео', kind: 'video', maxFiles: 1, help: 'Видео, в которое нужно встроить новый элемент.' },
    ],
  },
  {
    id: 'wan/2-6-flash-image-to-video',
    name: 'Wan 2.6 Flash Image',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Облегченный быстрый image-to-video режим Wan 2.6 Flash.',
      en: 'Lightweight fast Wan 2.6 Flash image-to-video mode.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    durationOptions: [5],
    supportsMultiShotsToggle: true,
    uploadSlots: [
      { key: 'image_urls', label: 'Референсные кадры', kind: 'image', maxFiles: 2, help: 'Можно загрузить один или два стартовых кадра.' },
    ],
  },
  {
    id: 'wan/2-6-flash-video-to-video',
    name: 'Wan 2.6 Flash Video',
    family: 'wan',
    familyLabel: VIDEO_FAMILY_LABELS.wan,
    summary: {
      ru: 'Быстрый video-to-video режим Wan 2.6 Flash.',
      en: 'Fast Wan 2.6 Flash video-to-video mode.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    durationOptions: [5],
    supportsMultiShotsToggle: true,
    uploadSlots: [
      { key: 'video_urls', label: 'Видео-референс', kind: 'video', maxFiles: 1, help: 'Исходное видео.' },
    ],
  },
  {
    id: 'runway/generate',
    name: 'Runway Generate',
    family: 'runway',
    familyLabel: VIDEO_FAMILY_LABELS.runway,
    summary: {
      ru: 'Классическая генерация Runway: текст в видео или текст + референсный кадр. 1080p доступно только для 5-секундных клипов.',
      en: 'Classic Runway generation: text to video or text plus a reference frame. 1080p is available only for 5-second clips.',
    },
    promptRequired: true,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16'],
    resolutions: ['720p', '1080p'],
    durationOptions: [5, 10],
    supportsWatermarkText: true,
    uploadSlots: [
      { key: 'image_url', label: 'Референсный кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Помогает удержать композицию.', required: false },
    ],
  },
  {
    id: 'runway/extend',
    name: 'Runway Extend',
    family: 'runway',
    familyLabel: VIDEO_FAMILY_LABELS.runway,
    summary: {
      ru: 'Продолжает уже готовый Runway-ролик в том же визуальном и сюжетном направлении.',
      en: 'Extends an existing Runway clip in the same visual and narrative direction.',
    },
    promptRequired: true,
    resolutions: ['720p', '1080p'],
    supportsEnablePromptExpansion: true,
    supportsWatermarkText: true,
    supportsOriginTaskId: true,
    uploadSlots: [
      { key: 'image_url', label: 'Новый ключевой кадр', kind: 'image', maxFiles: 1, help: 'Необязательно. Помогает мягко продолжить сцену.', required: false },
    ],
  },
  {
    id: 'runway/aleph-generate',
    name: 'Runway Aleph',
    family: 'runway',
    familyLabel: VIDEO_FAMILY_LABELS.runway,
    summary: {
      ru: 'Video-to-video режим Runway Aleph для переработки короткого исходного ролика в новый визуальный стиль.',
      en: 'Runway Aleph video-to-video workflow for transforming a short source clip into a new visual style.',
    },
    promptRequired: true,
    supportsWatermarkText: true,
    uploadSlots: [
      { key: 'video_url', label: 'Исходное видео', kind: 'video', maxFiles: 1, help: 'Видео, которое нужно переработать.' },
    ],
  },
];

export const VIDEO_MODEL_OPTIONS = VIDEO_MODELS.map((model) => ({ id: model.id, name: model.name }));

export const VIDEO_RESOLUTION_OPTIONS = ['720p', '1080p', '4k'];
export const VIDEO_PRICING_GENERATION_MODES = ['720p', '1080p', 'std', 'pro', 'standard', 'high', 'single-shot', 'multi-shot'];

export function getVideoModelById(id: string | null | undefined) {
  return VIDEO_MODELS.find((model) => model.id === id) ?? VIDEO_MODELS[0];
}

export function getVideoFamilies(locale: 'ru' | 'en') {
  return (Object.keys(VIDEO_FAMILY_LABELS) as VideoFamilyId[]).map((id) => ({
    id,
    label: VIDEO_FAMILY_LABELS[id][locale],
  }));
}
