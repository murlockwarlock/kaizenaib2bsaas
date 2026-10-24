import type { GenerationTask } from '@/lib/types';
import { VIDEO_MODELS } from '@/lib/video-models';

export type SupportedLocale = 'en' | 'ru';

type ModelGuide = {
  title: string;
  summary: string;
  bestFor: string;
  workflow: string;
};

type LocalizedModelGuide = {
  en: ModelGuide;
  ru: ModelGuide;
};

const MODEL_GUIDES: Record<string, LocalizedModelGuide> = {
  'flux-2/pro-text-to-image': {
    en: {
      title: 'Flux Pro',
      summary: 'Premium text-to-image model for polished commercial visuals.',
      bestFor: 'Hero shots, product scenes, ads, premium renders.',
      workflow: 'Write the scene, style and lighting. Best when the prompt is specific and visual.',
    },
    ru: {
      title: 'Flux Pro',
      summary: 'Премиальная text-to-image модель для аккуратного коммерческого визуала.',
      bestFor: 'Hero-кадры, продуктовые сцены, реклама, дорогие рендеры.',
      workflow: 'Лучше всего работает, когда в промпте чётко описаны сцена, стиль и свет.',
    },
  },
  'flux-2/pro-image-to-image': {
    en: {
      title: 'Flux Pro Edit',
      summary: 'High-end image editing model for controlled restyling.',
      bestFor: 'Refining references, changing mood, upgrading existing art.',
      workflow: 'Upload a base image and explain what should change, not just the end result.',
    },
    ru: {
      title: 'Flux Pro Edit',
      summary: 'Сильная image-to-image модель для контролируемого редактирования.',
      bestFor: 'Доработка референсов, смена настроения, улучшение готового арта.',
      workflow: 'Загрузите базовую картинку и опишите, что именно нужно изменить.',
    },
  },
  'flux-2/flex-text-to-image': {
    en: {
      title: 'Flux Flex',
      summary: 'More flexible and faster Flux variant for experiments and ideation.',
      bestFor: 'Concept drafts, style exploration, fast iterations.',
      workflow: 'Use it when you want several prompt variations quickly.',
    },
    ru: {
      title: 'Flux Flex',
      summary: 'Более гибкая и быстрая версия Flux для быстрых экспериментов.',
      bestFor: 'Черновые концепты, поиск стиля, быстрые итерации.',
      workflow: 'Подходит, когда нужно быстро прогнать несколько вариантов промпта.',
    },
  },
  'flux-2/flex-image-to-image': {
    en: {
      title: 'Flux Flex Edit',
      summary: 'Fast image-to-image editing for lighter iterations.',
      bestFor: 'Mood shifts, visual remixes, quick redirections.',
      workflow: 'Use a simple reference and a short prompt describing the new direction.',
    },
    ru: {
      title: 'Flux Flex Edit',
      summary: 'Быстрое image-to-image редактирование для лёгких итераций.',
      bestFor: 'Смена настроения, ремиксы, быстрый редирект визуала.',
      workflow: 'Загрузите референс и коротко опишите новое направление.',
    },
  },
  'bytedance/seedream-v4-text-to-image': {
    en: {
      title: 'Seedream V4',
      summary: 'Strong all-rounder for clean composition and stylized visuals.',
      bestFor: 'Editorial art, cinematic posters, stylized scenes.',
      workflow: 'Combine composition, lens mood and art direction in one prompt.',
    },
    ru: {
      title: 'Seedream V4',
      summary: 'Сильная универсальная модель с чистой композицией и стилем.',
      bestFor: 'Редакционный арт, постеры, стилизованные сцены.',
      workflow: 'Хорошо работает, если в промпте есть композиция, настроение и арт-дирекшн.',
    },
  },
  'bytedance/seedream-v4-edit': {
    en: {
      title: 'Seedream V4 Edit',
      summary: 'Reference-based editing with a stylized visual feel.',
      bestFor: 'Restyling portraits, scene changes, guided edits.',
      workflow: 'Keep the prompt focused on what changes while the reference preserves structure.',
    },
    ru: {
      title: 'Seedream V4 Edit',
      summary: 'Редактирование по референсу с выраженной стилистикой.',
      bestFor: 'Перестилизация портретов, замена сцен, направленное редактирование.',
      workflow: 'Референс держит структуру, а в промпте лучше писать только нужные изменения.',
    },
  },
  'seedream/4.5-text-to-image': {
    en: {
      title: 'Seedream 4.5',
      summary: 'Balanced image model for quality, style and speed.',
      bestFor: 'Marketing visuals, concept frames, polished scenes.',
      workflow: 'Good default choice when you want quality without overthinking the setup.',
    },
    ru: {
      title: 'Seedream 4.5',
      summary: 'Сбалансированная модель по качеству, стилю и скорости.',
      bestFor: 'Маркетинговый визуал, концепт-кадры, аккуратные сцены.',
      workflow: 'Хороший дефолтный выбор, когда нужен качественный результат без сложной настройки.',
    },
  },
  'bytedance/seedream': {
    en: {
      title: 'Seedream 3',
      summary: 'Earlier Seedream model for broad creative ideation.',
      bestFor: 'Moodboards, visual drafts, early exploration.',
      workflow: 'Use it for direction-finding, then move to V4/V4.5 for cleaner finals.',
    },
    ru: {
      title: 'Seedream 3',
      summary: 'Более ранняя Seedream-модель для широкого креативного поиска.',
      bestFor: 'Мудборды, черновики, ранние исследования.',
      workflow: 'Подходит для поиска направления, а финал лучше дожимать на V4/V4.5.',
    },
  },
  'qwen/text-to-image': {
    en: {
      title: 'Qwen Image',
      summary: 'Straightforward text-to-image model for broad prompts.',
      bestFor: 'General scenes, social visuals, simple concepts.',
      workflow: 'Keep prompts plain and descriptive. It likes direct instructions.',
    },
    ru: {
      title: 'Qwen Image',
      summary: 'Прямая и понятная text-to-image модель для обычных промптов.',
      bestFor: 'Общие сцены, соцсети, простые концепты.',
      workflow: 'Лучше писать просто и по делу: что должно быть в кадре и какой стиль нужен.',
    },
  },
  'qwen/image-to-image': {
    en: {
      title: 'Qwen Edit',
      summary: 'Reference-based editing model for practical visual changes.',
      bestFor: 'Simple transformations, cleanup, quick creative edits.',
      workflow: 'Upload the source image and describe only the desired change.',
    },
    ru: {
      title: 'Qwen Edit',
      summary: 'Практичная image-to-image модель для понятных изменений.',
      bestFor: 'Простые трансформации, cleanup, быстрые креативные правки.',
      workflow: 'Загрузите исходник и опишите только желаемое изменение.',
    },
  },
  'ideogram/v3-text-to-image': {
    en: {
      title: 'Ideogram V3',
      summary: 'Excellent for design-heavy visuals and cleaner lettering.',
      bestFor: 'Posters, branding concepts, covers, typography-led art.',
      workflow: 'Use it when text inside the image matters.',
    },
    ru: {
      title: 'Ideogram V3',
      summary: 'Сильная модель для дизайна и более аккуратного текста в кадре.',
      bestFor: 'Постеры, брендинг, обложки, арт с типографикой.',
      workflow: 'Выбирайте её, когда в картинке важны надписи или графический дизайн.',
    },
  },
  'ideogram/character': {
    en: {
      title: 'Ideogram Character',
      summary: 'Character-preserving model for reference-driven identity work.',
      bestFor: 'Consistent characters, mascots, avatar systems.',
      workflow: 'Upload a strong reference and describe pose, outfit or setting changes.',
    },
    ru: {
      title: 'Ideogram Character',
      summary: 'Модель для сохранения персонажа при работе от референса.',
      bestFor: 'Консистентные персонажи, маскоты, аватары.',
      workflow: 'Загрузите хороший референс и опишите позу, одежду или окружение.',
    },
  },
  'z-image': {
    en: {
      title: 'Z-Image',
      summary: 'General-purpose image model for fast all-round generation.',
      bestFor: 'Quick drafts, general ideas, broad visual tasks.',
      workflow: 'Good as a lightweight default when you just need an image fast.',
    },
    ru: {
      title: 'Z-Image',
      summary: 'Универсальная image-модель для быстрой генерации.',
      bestFor: 'Быстрые черновики, общие идеи, широкие задачи.',
      workflow: 'Подходит как простой дефолтный выбор, когда нужен быстрый результат.',
    },
  },
  'google/imagen4': {
    en: {
      title: 'Google Imagen 4',
      summary: 'Polished general image model with strong realism and detail.',
      bestFor: 'Realistic product shots, lifestyle scenes, premium visuals.',
      workflow: 'Use clean prompts with subject, environment and lighting.',
    },
    ru: {
      title: 'Google Imagen 4',
      summary: 'Качественная универсальная модель с хорошим реализмом и деталями.',
      bestFor: 'Реалистичные продукты, lifestyle-сцены, премиальный визуал.',
      workflow: 'Лучше всего работает с чистым промптом: объект, окружение и свет.',
    },
  },
  'google/imagen4-fast': {
    en: {
      title: 'Google Imagen 4 Fast',
      summary: 'Faster Imagen variant for rapid ideation and multi-image batches.',
      bestFor: 'Quick drafts, lighter prompt exploration, generating several options at once.',
      workflow: 'Use a clear prompt, keep a simple negative prompt if needed, and increase image count when comparing directions.',
    },
    ru: {
      title: 'Google Imagen 4 Fast',
      summary: 'Быстрая версия Imagen для быстрых идей и пачек вариантов.',
      bestFor: 'Черновики, быстрый перебор промптов, генерация нескольких опций за раз.',
      workflow: 'Пишите понятный промпт, при необходимости добавляйте negative prompt и включайте несколько изображений для сравнения.',
    },
  },
  'google/imagen4-ultra': {
    en: {
      title: 'Google Imagen 4 Ultra',
      summary: 'Higher-end Imagen mode for quality-focused final outputs.',
      bestFor: 'Cleaner hero visuals, polished marketing images, more deliberate final renders.',
      workflow: 'Treat it like a finishing model: tighter prompt, cleaner framing, and optional negative prompt for better control.',
    },
    ru: {
      title: 'Google Imagen 4 Ultra',
      summary: 'Более качественный режим Imagen для финальных рендеров.',
      bestFor: 'Чистые hero-визуалы, маркетинговые изображения, более аккуратный финал.',
      workflow: 'Используйте как финальную модель: более точный промпт, аккуратный кадр и при необходимости negative prompt для контроля.',
    },
  },
  'google/nano-banana': {
    en: {
      title: 'Google Nano Banana',
      summary: 'Compact Google image generator with broad aspect-ratio control and lightweight setup.',
      bestFor: 'Fast single-shot image generation with minimal controls.',
      workflow: 'Pick the frame, choose output format, and keep the prompt concise and visual.',
    },
    ru: {
      title: 'Google Nano Banana',
      summary: 'Компактная Google image-модель с широкими форматами кадра и простыми настройками.',
      bestFor: 'Быстрая одиночная генерация изображения без сложной конфигурации.',
      workflow: 'Выберите формат кадра, формат файла и держите промпт коротким и визуальным.',
    },
  },
  'google/nano-banana-edit': {
    en: {
      title: 'Google Nano Banana Edit',
      summary: 'Reference-based Google editing model for transforming uploaded images.',
      bestFor: 'Stylization, remixing, object changes, guided edits from one or more references.',
      workflow: 'Upload one or more references, describe the intended transformation, then pick the target frame and format.',
    },
    ru: {
      title: 'Google Nano Banana Edit',
      summary: 'Google image-edit модель для преобразования загруженных референсов.',
      bestFor: 'Стилизация, ремикс, замена объектов, направленное редактирование по референсам.',
      workflow: 'Загрузите один или несколько референсов, опишите нужную трансформацию и выберите итоговый кадр и формат.',
    },
  },
  'nano-banana-2': {
    en: {
      title: 'Nano Banana 2',
      summary: 'Google image model with high-resolution output, flexible aspect ratios and optional web-grounded generation.',
      bestFor: 'Rich text prompts, multiple image references, 2K/4K exports, up-to-date visual concepts.',
      workflow: 'Pick the aspect ratio and resolution first, then add prompt, optional references, output format and Google Search only when real-time context matters.',
    },
    ru: {
      title: 'Nano Banana 2',
      summary: 'Google image-модель с высоким разрешением, широкими форматами кадра и опциональной генерацией с web-grounding.',
      bestFor: 'Подробные промпты, несколько референсов, экспорт в 2K/4K, визуалы с актуальным контекстом.',
      workflow: 'Сначала выберите формат кадра и разрешение, затем добавьте промпт, при необходимости референсы, формат файла и Google Search только когда нужен актуальный контекст.',
    },
  },
  'nano-banana-2-1': {
    en: {
      title: 'Nano Banana 2.1',
      summary: 'Current Nano Banana image model with flexible framing, high-resolution output and optional references.',
      bestFor: 'New image generations, detailed prompts and controlled 1K/2K/4K exports.',
      workflow: 'Choose the frame and resolution, then add a prompt and optional references before generating.',
    },
    ru: {
      title: 'Nano Banana 2.1',
      summary: 'Актуальная Nano Banana с гибким кадром, высоким разрешением и опциональными референсами.',
      bestFor: 'Новые генерации, подробные промпты и управляемый экспорт в 1K/2K/4K.',
      workflow: 'Выберите формат кадра и разрешение, затем добавьте промпт и при необходимости референсы.',
    },
  },
  'nano-banana-2-lite': {
    en: {
      title: 'Nano Banana 2 Lite',
      summary: 'Fast Nano Banana mode with optional multi-reference input and JPEG output.',
      bestFor: 'Quick drafts, variations and reference-guided concepts.',
      workflow: 'Use a concise prompt and add up to ten references when visual consistency matters.',
    },
    ru: {
      title: 'Nano Banana 2 Lite',
      summary: 'Быстрый режим Nano Banana с несколькими референсами и JPEG-результатом.',
      bestFor: 'Черновики, варианты и концепты по референсам.',
      workflow: 'Используйте короткий промпт и добавьте до десяти референсов, если важна визуальная связность.',
    },
  },
  'nano-banana-pro': {
    en: {
      title: 'Nano Banana Pro',
      summary: 'Higher-capability Banana model with 2K/4K output and support for multiple references.',
      bestFor: 'Higher-detail compositions, richer prompts, premium visual directions.',
      workflow: 'Use it when you want stronger final quality than the base Banana modes and need room for several references.',
    },
    ru: {
      title: 'Nano Banana Pro',
      summary: 'Усиленная Banana-модель с 2K/4K и поддержкой нескольких референсов.',
      bestFor: 'Более детальные композиции, насыщенные промпты, премиальный визуал.',
      workflow: 'Подходит, когда нужен более сильный финальный результат, чем у базовых Banana-режимов, и несколько референсов.',
    },
  },
  'topaz/image-upscale': {
    en: {
      title: 'Topaz Upscale',
      summary: 'Utility model for increasing resolution rather than changing style.',
      bestFor: 'Sharper output, bigger exports, improving existing images.',
      workflow: 'Upload the image you already like and use it when quality is the main goal.',
    },
    ru: {
      title: 'Topaz Upscale',
      summary: 'Утилитарная модель для увеличения разрешения, а не смены стиля.',
      bestFor: 'Резкость, крупный экспорт, улучшение готовых картинок.',
      workflow: 'Загружайте уже удачное изображение и используйте её, когда нужна именно детализация.',
    },
  },
  'recraft/crisp-upscale': {
    en: {
      title: 'Recraft Crisp Upscale',
      summary: 'Upscaler focused on cleaner edges and crisp design output.',
      bestFor: 'Design assets, illustrations, cleaner contours.',
      workflow: 'Great for graphics and illustration-heavy material.',
    },
    ru: {
      title: 'Recraft Crisp Upscale',
      summary: 'Upscale-модель с акцентом на чистые края и дизайн-графику.',
      bestFor: 'Дизайн-ассеты, иллюстрации, чёткие контуры.',
      workflow: 'Особенно хорошо подходит для графики и иллюстраций.',
    },
  },
  'recraft/remove-background': {
    en: {
      title: 'Recraft Remove BG',
      summary: 'Background removal utility for clean cutouts.',
      bestFor: 'Products, people, thumbnails, compositing.',
      workflow: 'Upload a clear subject image and use it as a prep step before further editing.',
    },
    ru: {
      title: 'Recraft Remove BG',
      summary: 'Утилита для чистого удаления фона.',
      bestFor: 'Товары, люди, превью, композитинг.',
      workflow: 'Лучше использовать как подготовительный шаг перед дальнейшей обработкой.',
    },
  },
  'kling/v2-1-pro': {
    en: {
      title: 'Kling V2.1 Pro',
      summary: 'High-quality video model for cinematic motion and camera movement.',
      bestFor: 'Trailer-like shots, cinematic scenes, polished motion.',
      workflow: 'Describe subject, motion, camera and atmosphere in one sentence.',
    },
    ru: {
      title: 'Kling V2.1 Pro',
      summary: 'Сильная видео-модель для кинематографичного движения и камеры.',
      bestFor: 'Трейлерные кадры, кинематографичные сцены, polished motion.',
      workflow: 'В одном промпте лучше сразу описывать объект, движение, камеру и атмосферу.',
    },
  },
  'bytedance/v1-pro-text-to-video': {
    en: {
      title: 'Bytedance V1 Pro',
      summary: 'Balanced text-to-video option for solid general clips.',
      bestFor: 'General prompts, short scenes, broad video concepts.',
      workflow: 'Use it when you want dependable results without overcomplicating the prompt.',
    },
    ru: {
      title: 'Bytedance V1 Pro',
      summary: 'Сбалансированная text-to-video модель для хороших общих сцен.',
      bestFor: 'Обычные промпты, короткие сцены, широкие видео-концепты.',
      workflow: 'Подходит, когда нужен понятный и стабильный результат без сложного промпта.',
    },
  },
  'bytedance/seedance-1-5-pro': {
    en: {
      title: 'Bytedance Seedance 1.5 Pro',
      summary: 'Flexible Bytedance video model that can work from text or one to two input frames.',
      bestFor: 'Fast concept videos, ad drafts, motion from still frames.',
      workflow: 'Start with a clear motion prompt and add one or two key frames when composition matters.',
    },
    ru: {
      title: 'Bytedance Seedance 1.5 Pro',
      summary: 'Гибкая видео-модель Bytedance, которая умеет работать от текста или 1-2 входных кадров.',
      bestFor: 'Быстрые концепт-ролики, черновики рекламы, анимация от статичных кадров.',
      workflow: 'Лучше всего начинать с понятного описания движения и добавлять 1-2 ключевых кадра, если важна композиция.',
    },
  },
  'bytedance/v1-pro-image-to-video': {
    en: {
      title: 'Bytedance V1 Pro Image',
      summary: 'Higher-control image-to-video mode with stable camera options.',
      bestFor: 'Animating still art, products, portraits and controlled camera shots.',
      workflow: 'Use a strong starting frame and describe the motion, not just the scene.',
    },
    ru: {
      title: 'Bytedance V1 Pro Image',
      summary: 'Более управляемый image-to-video режим с контролем стабильности камеры.',
      bestFor: 'Оживление арта, товаров, портретов и спокойных проходов камеры.',
      workflow: 'Нужен сильный стартовый кадр и описание именно движения, а не только сцены.',
    },
  },
  'bytedance/v1-pro-fast-image-to-video': {
    en: {
      title: 'Bytedance V1 Pro Fast Image',
      summary: 'Fast image-to-video mode for short 720p clips.',
      bestFor: 'Quick previews, rapid iteration, short motion concepts.',
      workflow: 'Use it for speed-first drafts before switching to heavier models.',
    },
    ru: {
      title: 'Bytedance V1 Pro Fast Image',
      summary: 'Быстрый image-to-video режим для коротких роликов в 720p.',
      bestFor: 'Быстрые превью, быстрая итерация, короткие motion-концепты.',
      workflow: 'Подходит для скоростных черновиков до перехода на более тяжелые модели.',
    },
  },
  'bytedance/v1-lite-image-to-video': {
    en: {
      title: 'Bytedance V1 Lite Image',
      summary: 'Lightweight image-to-video with optional end frame guidance.',
      bestFor: 'Simple image animation, transitions between start and end frames.',
      workflow: 'Add an end frame when you want the motion to land in a specific composition.',
    },
    ru: {
      title: 'Bytedance V1 Lite Image',
      summary: 'Облегченный image-to-video с опциональным конечным кадром.',
      bestFor: 'Простая анимация изображения, переход между стартом и финалом.',
      workflow: 'Добавляйте конечный кадр, если хотите привести движение к конкретной композиции.',
    },
  },
  'bytedance/v1-lite-text-to-video': {
    en: {
      title: 'Bytedance V1 Lite Text',
      summary: 'Simpler lightweight text-to-video mode for quick output.',
      bestFor: 'Fast short scenes and prompt testing.',
      workflow: 'Keep prompts concise and direct.',
    },
    ru: {
      title: 'Bytedance V1 Lite Text',
      summary: 'Простой облегченный text-to-video режим для быстрого результата.',
      bestFor: 'Быстрые короткие сцены и тесты промптов.',
      workflow: 'Лучше всего работают короткие и прямые запросы.',
    },
  },
  'wan/2-2-a14b-text-to-video-turbo': {
    en: {
      title: 'Wan 2.2 Turbo',
      summary: 'Faster video model for iteration and idea testing.',
      bestFor: 'Fast checks, concept motion, quick prompt experiments.',
      workflow: 'Use shorter prompts and iterate quickly.',
    },
    ru: {
      title: 'Wan 2.2 Turbo',
      summary: 'Быстрая видео-модель для итераций и теста идей.',
      bestFor: 'Быстрые проверки, концепт-моушен, эксперименты с промптом.',
      workflow: 'Лучше использовать короткие промпты и быстро гонять варианты.',
    },
  },
  'wan/2-2-a14b-image-to-video-turbo': {
    en: {
      title: 'Wan 2.2 Image Turbo',
      summary: 'Turbo image-to-video mode focused on fast turnaround from one key frame.',
      bestFor: 'Quick motion drafts from a single still image.',
      workflow: 'Use one strong image and keep the motion request simple and specific.',
    },
    ru: {
      title: 'Wan 2.2 Image Turbo',
      summary: 'Турбо image-to-video режим для быстрого результата от одного ключевого кадра.',
      bestFor: 'Быстрые motion-черновики от одного статичного изображения.',
      workflow: 'Используйте один сильный кадр и коротко, но конкретно описывайте движение.',
    },
  },
  'wan/2-2-a14b-speech-to-video-turbo': {
    en: {
      title: 'Wan 2.2 Speech Turbo',
      summary: 'Speech-driven video model using one image plus one audio track.',
      bestFor: 'Talking portraits, avatar-like speech animation, narrated clips.',
      workflow: 'Pick a clean portrait or scene image and pair it with clear speech audio.',
    },
    ru: {
      title: 'Wan 2.2 Speech Turbo',
      summary: 'Видео-модель, которая строит результат из одного изображения и одной аудиодорожки.',
      bestFor: 'Говорящие портреты, аватар-подобная анимация речи, озвученные ролики.',
      workflow: 'Лучше брать чистый портрет или кадр сцены и соединять его с разборчивым голосом.',
    },
  },
  'wan/2-6-text-to-video': {
    en: {
      title: 'Wan 2.6 Text',
      summary: 'Balanced Wan 2.6 text-to-video workflow with clean duration and resolution presets.',
      bestFor: 'General short-form clips and stable prompt-to-video generation.',
      workflow: 'Use it as the standard Wan text mode when you want less technical setup.',
    },
    ru: {
      title: 'Wan 2.6 Text',
      summary: 'Сбалансированный Wan 2.6 text-to-video с понятными пресетами длительности и разрешения.',
      bestFor: 'Обычные короткие ролики и стабильная генерация из текста.',
      workflow: 'Это базовый текстовый режим Wan, когда нужен результат без лишней технастройки.',
    },
  },
  'wan/2-6-image-to-video': {
    en: {
      title: 'Wan 2.6 Image',
      summary: 'Reference-based Wan 2.6 workflow for animating a single image.',
      bestFor: 'Animating posters, illustrations and product stills.',
      workflow: 'Start with one strong frame and describe how the scene should move.',
    },
    ru: {
      title: 'Wan 2.6 Image',
      summary: 'Wan 2.6 от референса для анимации одного изображения.',
      bestFor: 'Оживление постеров, иллюстраций и продуктовых кадров.',
      workflow: 'Лучше работать от одного сильного кадра и описывать, как должна двигаться сцена.',
    },
  },
  'wan/2-6-video-to-video': {
    en: {
      title: 'Wan 2.6 Video',
      summary: 'Wan 2.6 workflow for transforming an existing source video.',
      bestFor: 'Restyling motion, changing mood, upgrading source clips.',
      workflow: 'Use a clear source clip and describe the desired transformation, not the original scene.',
    },
    ru: {
      title: 'Wan 2.6 Video',
      summary: 'Wan 2.6 для преобразования уже готового видео.',
      bestFor: 'Перестилизация движения, смена настроения, улучшение исходного клипа.',
      workflow: 'Лучше описывать желаемую трансформацию, а не повторять то, что уже есть в исходнике.',
    },
  },
  'wan/2-6-flash-image-to-video': {
    en: {
      title: 'Wan 2.6 Flash Image',
      summary: 'Fast Wan image-to-video mode for short output and quick checks.',
      bestFor: 'Rapid iterations, short ad ideas, quick motion previews.',
      workflow: 'Great for first-pass drafts before moving to heavier video models.',
    },
    ru: {
      title: 'Wan 2.6 Flash Image',
      summary: 'Быстрый Wan image-to-video режим для короткого результата и быстрых проверок.',
      bestFor: 'Быстрые итерации, короткие рекламные идеи, скоростные motion-превью.',
      workflow: 'Подходит как первый проход перед переходом на более тяжелые видео-модели.',
    },
  },
  'wan/2-6-flash-video-to-video': {
    en: {
      title: 'Wan 2.6 Flash Video',
      summary: 'Fast Wan video-to-video mode for lightweight source clip transformations.',
      bestFor: 'Quick edits, source clip experiments, fast alternate versions.',
      workflow: 'Use it when speed matters more than maximum polish.',
    },
    ru: {
      title: 'Wan 2.6 Flash Video',
      summary: 'Быстрый Wan video-to-video режим для легких преобразований исходного видео.',
      bestFor: 'Быстрые правки, эксперименты с клипом, быстрые альтернативные версии.',
      workflow: 'Выбирайте его, когда скорость важнее максимальной полировки.',
    },
  },
  'hailuo/2-3-image-to-video-standard': {
    en: {
      title: 'Hailuo V2.3 Standard',
      summary: 'More affordable Hailuo image-to-video mode with the same simple reference workflow.',
      bestFor: 'Everyday image animation and lower-cost drafts.',
      workflow: 'Use the same approach as Pro: one strong frame plus a motion description.',
    },
    ru: {
      title: 'Hailuo V2.3 Standard',
      summary: 'Более доступный Hailuo image-to-video режим с тем же простым workflow от референса.',
      bestFor: 'Повседневная анимация изображения и более бюджетные черновики.',
      workflow: 'Подход тот же, что и в Pro: один сильный кадр и описание движения.',
    },
  },
  'hailuo/02-text-to-video-pro': {
    en: {
      title: 'Hailuo 02 Text Pro',
      summary: 'Prompt-first Hailuo mode with provider-side prompt enhancement.',
      bestFor: 'Text-only video ideation with a cleaner starting point.',
      workflow: 'Write the core scene clearly and let prompt optimization help with polish.',
    },
    ru: {
      title: 'Hailuo 02 Text Pro',
      summary: 'Текстовый режим Hailuo с улучшением запроса на стороне провайдера.',
      bestFor: 'Генерация видео только из текста с более чистой стартовой интерпретацией.',
      workflow: 'Лучше ясно описать базовую сцену и при желании дать провайдеру доработать запрос.',
    },
  },
  'hailuo/02-image-to-video-pro': {
    en: {
      title: 'Hailuo 02 Image Pro',
      summary: 'Image-to-video Hailuo workflow with optional end-frame guidance.',
      bestFor: 'Guided motion between a start and optional target frame.',
      workflow: 'Use an end frame when you want to steer the clip toward a specific final pose or layout.',
    },
    ru: {
      title: 'Hailuo 02 Image Pro',
      summary: 'Image-to-video режим Hailuo с опциональным управлением через конечный кадр.',
      bestFor: 'Направленное движение между стартовым и опциональным финальным кадром.',
      workflow: 'Добавляйте конечный кадр, если хотите привести ролик к конкретной позе или композиции.',
    },
  },
  'runway/generate': {
    en: {
      title: 'Runway Generate',
      summary: 'Runway text-to-video workflow with optional reference frame support.',
      bestFor: 'Short polished clips, scene generation, motion concepts.',
      workflow: 'Write the scene and motion clearly, then add a reference frame only if composition matters.',
    },
    ru: {
      title: 'Runway Generate',
      summary: 'Runway text-to-video режим с опциональной поддержкой референсного кадра.',
      bestFor: 'Короткие аккуратные ролики, генерация сцен, motion-концепты.',
      workflow: 'Сначала ясно опишите сцену и движение, а референсный кадр добавляйте только если важна композиция.',
    },
  },
  'runway/extend': {
    en: {
      title: 'Runway Extend',
      summary: 'Extends an existing Runway result into a longer scene.',
      bestFor: 'Continuing clips, adding a second beat, extending narrative motion.',
      workflow: 'Best used when you already have a successful Runway task and want a continuation instead of a fresh take.',
    },
    ru: {
      title: 'Runway Extend',
      summary: 'Продолжает уже готовый Runway-ролик в более длинную сцену.',
      bestFor: 'Продолжение клипа, добавление второго бита, развитие движения в сцене.',
      workflow: 'Лучше использовать, когда у вас уже есть удачная Runway-задача и нужно именно продолжение, а не новая версия с нуля.',
    },
  },
  'runway/aleph-generate': {
    en: {
      title: 'Runway Aleph',
      summary: 'Runway video-to-video workflow for transforming an existing clip.',
      bestFor: 'Restyling footage, changing mood, altering the look of motion.',
      workflow: 'Treat it like a transformation model: feed a source clip and describe the new direction.',
    },
    ru: {
      title: 'Runway Aleph',
      summary: 'Runway video-to-video режим для преобразования уже готового ролика.',
      bestFor: 'Перестилизация footage, смена настроения, изменение характера движения.',
      workflow: 'Используйте как модель трансформации: дайте исходный клип и опишите новое направление.',
    },
  },
  'hailuo/2-3-image-to-video-pro': {
    en: {
      title: 'Hailuo V2.3 Pro',
      summary: 'Image-to-video model that starts from a strong reference frame.',
      bestFor: 'Bringing still art to life, poster animation, stylized movement.',
      workflow: 'Start from a clear visual reference and describe the motion direction.',
    },
    ru: {
      title: 'Hailuo V2.3 Pro',
      summary: 'Image-to-video модель, которая хорошо работает от сильного референс-кадра.',
      bestFor: 'Оживление арта, анимация постеров, стилизованное движение.',
      workflow: 'Нужен хороший референс и понятное описание направления движения.',
    },
  },
  'elevenlabs/text-to-speech-turbo-2-5': {
    en: {
      title: 'ElevenLabs Turbo 2.5',
      summary: 'Fast voice generation model for responsive TTS workflows.',
      bestFor: 'Short voiceovers, product demos, drafts, quick narration.',
      workflow: 'Great when you need fast previews and fast delivery.',
    },
    ru: {
      title: 'ElevenLabs Turbo 2.5',
      summary: 'Быстрая TTS-модель для оперативной генерации голоса.',
      bestFor: 'Короткие озвучки, демо, черновики, быстрая narration.',
      workflow: 'Подходит, когда важна скорость получения результата.',
    },
  },
  'elevenlabs/text-to-speech-multilingual-v2': {
    en: {
      title: 'ElevenLabs Multilingual V2',
      summary: 'Cleaner multilingual speech model with stronger voice quality.',
      bestFor: 'Narration, creator voiceovers, multilingual projects.',
      workflow: 'Use this when voice quality matters more than raw speed.',
    },
    ru: {
      title: 'ElevenLabs Multilingual V2',
      summary: 'Более качественная многоязычная модель речи.',
      bestFor: 'Нарратив, creator voiceover, мультиязычные проекты.',
      workflow: 'Лучше выбирать её, когда качество голоса важнее скорости.',
    },
  },
  'elevenlabs/text-to-dialogue-v3': {
    en: {
      title: 'ElevenLabs Dialogue V3',
      summary: 'Multi-speaker dialogue model for scenes and conversations.',
      bestFor: 'Character scenes, podcasts, scripted conversations.',
      workflow: 'Split each speaker into separate lines and keep emotions clear.',
    },
    ru: {
      title: 'ElevenLabs Dialogue V3',
      summary: 'Модель для мультиспикерных диалогов и сцен.',
      bestFor: 'Сцены с персонажами, подкасты, диалоги по сценарию.',
      workflow: 'Лучше разделять реплики по спикерам и явно писать эмоции/контекст.',
    },
  },
  'google/gemini-3-8-flash-tts': {
    en: {
      title: 'Gemini 3.8 Flash TTS',
      summary: 'Current Gemini dialogue TTS with expressive multi-speaker delivery.',
      bestFor: 'Fast narration, character dialogue and voice experiments.',
      workflow: 'Split the script into speaker lines and keep the direction concise.',
    },
    ru: {
      title: 'Gemini 3.8 Flash TTS',
      summary: 'Актуальная Gemini TTS-модель для выразительных диалогов с несколькими спикерами.',
      bestFor: 'Быстрая озвучка, диалоги персонажей и голосовые эксперименты.',
      workflow: 'Разделяйте сценарий на реплики спикеров и пишите короткие указания по подаче.',
    },
  },
  'google/gemini-3-8-flash-lite-tts': {
    en: {
      title: 'Gemini 3.8 Flash Lite TTS',
      summary: 'Lighter Gemini dialogue TTS path for quick, lower-latency drafts.',
      bestFor: 'Fast previews, short scripts and cost-conscious voice workflows.',
      workflow: 'Use short speaker turns when you need a quick draft.',
    },
    ru: {
      title: 'Gemini 3.8 Flash Lite TTS',
      summary: 'Более лёгкий путь Gemini TTS для быстрых черновиков с низкой задержкой.',
      bestFor: 'Быстрые превью, короткие сценарии и экономичная озвучка.',
      workflow: 'Используйте короткие реплики, когда нужен быстрый черновой результат.',
    },
  },
  'google/gemini-3-1-flash-tts': {
    en: {
      title: 'Gemini 3.1 Flash TTS',
      summary: 'Gemini dialogue TTS model for structured, expressive conversations.',
      bestFor: 'Scripted conversations, character scenes and narrated exchanges.',
      workflow: 'Keep speaker IDs consistent across the whole script.',
    },
    ru: {
      title: 'Gemini 3.1 Flash TTS',
      summary: 'Gemini TTS для структурированных и выразительных разговорных сцен.',
      bestFor: 'Сценарные диалоги, сцены персонажей и озвученные обмены репликами.',
      workflow: 'Сохраняйте одинаковые идентификаторы спикеров во всём сценарии.',
    },
  },
  'suno/v6': {
    en: {
      title: 'Suno V6',
      summary: 'Current Suno music model for the strongest overall arrangement and polish.',
      bestFor: 'Release-ready ideas, modern tracks and the best general result.',
      workflow: 'Describe genre, mood, instrumentation and energy in plain language.',
    },
    ru: {
      title: 'Suno V6',
      summary: 'Актуальная музыкальная модель Suno с лучшим общим качеством и аранжировкой.',
      bestFor: 'Сильные музыкальные идеи, современные треки и лучший универсальный результат.',
      workflow: 'Пишите жанр, настроение, инструменты и энергию обычным человеческим языком.',
    },
  },
  'suno/v6_mini': {
    en: {
      title: 'Suno V6 Mini',
      summary: 'Lighter current Suno mode for faster music iteration.',
      bestFor: 'Demos, quick concepts and rapid prompt iteration.',
      workflow: 'Use it to explore several directions before polishing the strongest idea.',
    },
    ru: {
      title: 'Suno V6 Mini',
      summary: 'Более лёгкий актуальный режим Suno для быстрой итерации музыки.',
      bestFor: 'Демо, быстрые концепты и перебор вариантов промпта.',
      workflow: 'Сначала переберите несколько направлений, а затем отполируйте лучшую идею.',
    },
  },
  'suno/v6_wild': {
    en: {
      title: 'Suno V6 Wild',
      summary: 'Experimental current Suno mode for less predictable musical ideas.',
      bestFor: 'Unexpected arrangements, bold concepts and creative exploration.',
      workflow: 'Give it a clear mood and constraints, then keep the best surprise.',
    },
    ru: {
      title: 'Suno V6 Wild',
      summary: 'Экспериментальный актуальный режим Suno для менее предсказуемых музыкальных идей.',
      bestFor: 'Необычные аранжировки, смелые концепты и творческий поиск.',
      workflow: 'Задайте настроение и ограничения, а затем выберите лучший неожиданный результат.',
    },
  },
  'suno/v5': {
    en: {
      title: 'Suno V5',
      summary: 'Best overall music model for quality and polished arrangement.',
      bestFor: 'Release-ready ideas, modern tracks, strongest overall quality.',
      workflow: 'Describe genre, mood, instrumentation and energy in plain language.',
    },
    ru: {
      title: 'Suno V5',
      summary: 'Лучшая универсальная музыкальная модель по качеству и аранжировке.',
      bestFor: 'Сильные музыкальные идеи, современные треки, лучший общий результат.',
      workflow: 'Пишите жанр, настроение, инструменты и энергию обычным человеческим языком.',
    },
  },
  'suno/v4_5plus': {
    en: {
      title: 'Suno V4.5+',
      summary: 'Longer-form music model for extended structure and development.',
      bestFor: 'Longer songs, evolving arrangements, more developed tracks.',
      workflow: 'Use it when track duration and progression matter.',
    },
    ru: {
      title: 'Suno V4.5+',
      summary: 'Модель для более длинных треков и развитой структуры.',
      bestFor: 'Длинные песни, развивающиеся аранжировки, более цельные треки.',
      workflow: 'Подходит, когда важны длительность и развитие композиции.',
    },
  },
  'suno/v4_5': {
    en: {
      title: 'Suno V4.5',
      summary: 'Balanced music model with good speed and strong song structure.',
      bestFor: 'Daily music generation, quick but polished ideas.',
      workflow: 'Good default pick if you want solid songs without the heaviest mode.',
    },
    ru: {
      title: 'Suno V4.5',
      summary: 'Сбалансированная музыкальная модель со скоростью и нормальной структурой.',
      bestFor: 'Повседневная генерация музыки, быстрые, но аккуратные идеи.',
      workflow: 'Хороший дефолт, если нужен достойный трек без самого тяжёлого режима.',
    },
  },
  'suno/v4': {
    en: {
      title: 'Suno V4',
      summary: 'Older Suno mode for simpler and lighter generations.',
      bestFor: 'Fast experiments, simpler songs, fallback generation.',
      workflow: 'Use it for lighter tests before moving to V5.',
    },
    ru: {
      title: 'Suno V4',
      summary: 'Более ранний режим Suno для простых и лёгких генераций.',
      bestFor: 'Быстрые эксперименты, простые песни, fallback-вариант.',
      workflow: 'Подходит для быстрых тестов перед переходом на V5.',
    },
  },
};

function normalizeModelKey(model: string | null | undefined) {
  return (model || '').trim().toLowerCase();
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getImageFamilyLabel(model: string, locale: SupportedLocale) {
  const normalized = normalizeModelKey(model);
  if (normalized.startsWith('flux-2/')) return 'Flux';
  if (normalized.includes('seedream')) return 'Seedream';
  if (normalized.startsWith('qwen/')) return 'Qwen';
  if (normalized.startsWith('ideogram/')) return 'Ideogram';
  if (normalized.startsWith('google/') || normalized.includes('banana')) return 'Google';
  if (normalized.startsWith('recraft/')) return 'Recraft';
  if (normalized.startsWith('topaz/')) return 'Topaz';
  if (normalized === 'z-image') return 'Z-Image';
  return locale === 'ru' ? 'Изображения' : 'Image';
}

function getAudioFamilyLabel(model: string, locale: SupportedLocale) {
  const normalized = normalizeModelKey(model);
  if (normalized.startsWith('suno/')) return 'Suno';
  if (normalized.startsWith('elevenlabs/')) return 'ElevenLabs';
  return locale === 'ru' ? 'Аудио' : 'Audio';
}

export function getModelFamilyLabel(model: string | null | undefined, category: string | null | undefined, locale: SupportedLocale) {
  const normalized = normalizeModelKey(model);
  if (!normalized) return getCategoryTitle(category, locale);

  if (category === 'video') {
    const videoModel = VIDEO_MODELS.find((entry) => entry.id.toLowerCase() === normalized);
    if (videoModel) {
      return videoModel.familyLabel[locale];
    }
  }

  if (category === 'audio') {
    return getAudioFamilyLabel(normalized, locale);
  }

  if (category === 'image' || category === 'images') {
    return getImageFamilyLabel(normalized, locale);
  }

  if (normalized.includes('/')) {
    return toTitleCase(normalized.split('/')[0].replace(/[-_]/g, ' '));
  }

  return getCategoryTitle(category, locale);
}

export function getModelWorkflowLabel(model: string | null | undefined, category: string | null | undefined, locale: SupportedLocale) {
  const normalized = normalizeModelKey(model);
  if (!normalized) return getCategoryTitle(category, locale);

  if (normalized.includes('motion-control')) return locale === 'ru' ? 'Motion Control' : 'Motion Control';
  if (normalized.includes('storyboard')) return locale === 'ru' ? 'Storyboard' : 'Storyboard';
  if (normalized.includes('avatar')) return locale === 'ru' ? 'Аватар' : 'Avatar';
  if (normalized.includes('speech-to-video')) return locale === 'ru' ? 'Speech-to-Video' : 'Speech-to-Video';
  if (normalized.includes('animate-move')) return locale === 'ru' ? 'Animate Move' : 'Animate Move';
  if (normalized.includes('animate-replace')) return locale === 'ru' ? 'Animate Replace' : 'Animate Replace';
  if (normalized.includes('video-to-video') || normalized.includes('aleph')) return locale === 'ru' ? 'Video-to-Video' : 'Video-to-Video';
  if (normalized.includes('image-to-video')) return locale === 'ru' ? 'Image-to-Video' : 'Image-to-Video';
  if (normalized.includes('text-to-video') || normalized.endsWith('/video') || normalized.includes('seedance')) return locale === 'ru' ? 'Text-to-Video' : 'Text-to-Video';
  if (normalized.includes('text-to-image')) return locale === 'ru' ? 'Text-to-Image' : 'Text-to-Image';
  if (normalized.includes('image-to-image') || normalized.includes('/edit') || normalized.includes('kontext') || normalized.includes('character')) return locale === 'ru' ? 'Image-to-Image' : 'Image-to-Image';
  if (normalized.includes('upscale')) return locale === 'ru' ? 'Upscale' : 'Upscale';
  if (normalized.includes('remove-background')) return locale === 'ru' ? 'Remove Background' : 'Remove Background';
  if (normalized.includes('text-to-speech')) return locale === 'ru' ? 'Text-to-Speech' : 'Text-to-Speech';
  if (normalized.includes('dialogue')) return locale === 'ru' ? 'Dialogue' : 'Dialogue';

  if (category === 'image' || category === 'images') {
    return locale === 'ru' ? 'Text-to-Image' : 'Text-to-Image';
  }

  return getCategoryTitle(category, locale);
}

export function getModelDisplayName(model: string | null | undefined) {
  const normalized = normalizeModelKey(model);
  const directGuide = MODEL_GUIDES[normalized];
  if (directGuide) return directGuide.en.title;
  const videoModel = VIDEO_MODELS.find((entry) => entry.id.toLowerCase() === normalized);
  if (videoModel) return videoModel.name;

  if (!model) return 'AI Model';
  if (model.startsWith('suno/')) {
    return model
      .replace('suno/', 'Suno ')
      .replace('V4_5PLUS', 'V4.5+')
      .replace('V4_5', 'V4.5')
      .replace('_', '.');
  }

  const tail = model.split('/').pop() || model;
  return tail
    .replace(/[-_]/g, ' ')
    .replace(/\btext to image\b/gi, '')
    .replace(/\bimage to image\b/gi, '')
    .replace(/\bv(\d)/gi, 'V$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getModelGuide(model: string | null | undefined, locale: SupportedLocale) {
  const normalized = normalizeModelKey(model);
  return MODEL_GUIDES[normalized]?.[locale] ?? {
    title: getModelDisplayName(model),
    summary: locale === 'ru' ? 'Универсальная модель для базовых сценариев генерации.' : 'General-purpose model for common generation workflows.',
    bestFor: locale === 'ru' ? 'Повседневные задачи и быстрые итерации.' : 'Everyday tasks and quick iterations.',
    workflow: locale === 'ru' ? 'Начните с простого промпта и постепенно добавляйте детали.' : 'Start with a simple prompt and add detail step by step.',
  };
}

export function getTaskPrompt(task: Pick<GenerationTask, 'input_url' | 'prompt'>) {
  const raw = task.prompt || task.input_url || '';
  if (!raw) return null;
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/')) return null;
  return raw;
}

export function getEditorCategory(category: string | null | undefined) {
  if (category === 'image' || category === 'images') return 'images';
  if (category === 'video') return 'video';
  if (category === 'audio') return 'audio';
  return 'catalog';
}

export function getCategoryTitle(category: string | null | undefined, locale: SupportedLocale) {
  if (category === 'image' || category === 'images') {
    return locale === 'ru' ? 'Генерация изображений' : 'Image Generation';
  }
  if (category === 'video') {
    return locale === 'ru' ? 'Генерация видео' : 'Video Generation';
  }
  if (category === 'audio') {
    return locale === 'ru' ? 'Генерация аудио' : 'Audio Generation';
  }
  return locale === 'ru' ? 'Генерация' : 'Generation';
}
