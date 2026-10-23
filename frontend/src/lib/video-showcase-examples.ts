const localExample = (path: string) => encodeURI(path);

export type VideoShowcaseExample = {
  modelId: string;
  href: string;
  videoSrc: string;
  title: { ru: string; en: string };
  description: { ru: string; en: string };
  prompt: { ru: string; en: string };
  chips: { ru: string[]; en: string[] };
};

export const VIDEO_SHOWCASE_EXAMPLES: VideoShowcaseExample[] = [
  {
    modelId: 'bytedance/seedance-1-5-pro',
    href: '/video?model=bytedance%2Fseedance-1-5-pro',
    videoSrc: localExample('/examples/Bytedance Seedance 1.5 Pro/example.mp4'),
    title: { ru: 'Bytedance Seedance 1.5 Pro', en: 'Bytedance Seedance 1.5 Pro' },
    description: {
      ru: 'Универсальный cinematic-кейс для коротких рекламных и fashion-сцен.',
      en: 'A flexible cinematic case for short commercial and fashion scenes.',
    },
    prompt: {
      ru: 'A stylish product-commercial scene: a young woman in a red coat walks through a glossy neon-lit city street, strong reflections, elegant body motion, confident expression, smooth cinematic camera movement, premium advertising look, realistic detail.',
      en: 'A stylish product-commercial scene: a young woman in a red coat walks through a glossy neon-lit city street, strong reflections, elegant body motion, confident expression, smooth cinematic camera movement, premium advertising look, realistic detail.',
    },
    chips: {
      ru: ['Bytedance', '8-10 сек', 'Cinematic ad'],
      en: ['Bytedance', '8-10 sec', 'Cinematic ad'],
    },
  },
  {
    modelId: 'hailuo/02-text-to-video-pro',
    href: '/video?model=hailuo%2F02-text-to-video-pro',
    videoSrc: localExample('/examples/Hailuo 02 Text Pro/example.mp4'),
    title: { ru: 'Hailuo 02 Text Pro', en: 'Hailuo 02 Text Pro' },
    description: {
      ru: 'Чистый пример короткой Hailuo-сцены с аккуратным движением и polished look.',
      en: 'A clean Hailuo short-form scene with polished motion and a refined look.',
    },
    prompt: {
      ru: 'A polished commercial shot of a fashion model walking through a modern architectural space, elegant body movement, soft directional light, controlled camera glide, luxury mood, realistic motion, high detail.',
      en: 'A polished commercial shot of a fashion model walking through a modern architectural space, elegant body movement, soft directional light, controlled camera glide, luxury mood, realistic motion, high detail.',
    },
    chips: {
      ru: ['Hailuo', 'Text-to-video', 'Polished motion'],
      en: ['Hailuo', 'Text-to-video', 'Polished motion'],
    },
  },
  {
    modelId: 'hailuo/02-text-to-video-standard',
    href: '/video?model=hailuo%2F02-text-to-video-standard',
    videoSrc: localExample('/examples/hailuo02-text-to-video-standard/ai-video-59.mp4'),
    title: { ru: 'Hailuo 02 Text Standard', en: 'Hailuo 02 Text Standard' },
    description: {
      ru: 'Более доступный Hailuo-кейс для быстрых коротких текстовых сцен.',
      en: 'A more affordable Hailuo example for quick short text-driven scenes.',
    },
    prompt: {
      ru: 'A clean cinematic street scene at sunset, a woman in a beige coat walks toward camera, soft wind, premium fashion mood, controlled motion, elegant lighting, realistic detail.',
      en: 'A clean cinematic street scene at sunset, a woman in a beige coat walks toward camera, soft wind, premium fashion mood, controlled motion, elegant lighting, realistic detail.',
    },
    chips: {
      ru: ['Hailuo', '6 сек', 'Quick test'],
      en: ['Hailuo', '6 sec', 'Quick test'],
    },
  },
  {
    modelId: 'kling-2.6/text-to-video',
    href: '/video?model=kling-2.6%2Ftext-to-video',
    videoSrc: localExample('/examples/Kling2.6 Text to video/example.mp4'),
    title: { ru: 'Kling 2.6 Text', en: 'Kling 2.6 Text' },
    description: {
      ru: 'Классический Kling-кейс для динамичной текстовой сцены с уверенной камерой.',
      en: 'A classic Kling text-to-video case with dynamic scene direction and confident camera work.',
    },
    prompt: {
      ru: 'A cinematic medium shot of a woman in a red trench coat walking through a rainy neon street at night, strong reflections in puddles, soft wind moving her hair and coat, subtle head turn toward camera, slow dolly-in, shallow depth of field, realistic motion, film lighting, highly detailed.',
      en: 'A cinematic medium shot of a woman in a red trench coat walking through a rainy neon street at night, strong reflections in puddles, soft wind moving her hair and coat, subtle head turn toward camera, slow dolly-in, shallow depth of field, realistic motion, film lighting, highly detailed.',
    },
    chips: {
      ru: ['Kling', 'Text-to-video', '5-10 сек'],
      en: ['Kling', 'Text-to-video', '5-10 sec'],
    },
  },
  {
    modelId: 'kling-2.6/image-to-video',
    href: '/video?model=kling-2.6%2Fimage-to-video',
    videoSrc: localExample('/examples/kling-2.6image-to-video/example.mp4'),
    title: { ru: 'Kling 2.6 Image', en: 'Kling 2.6 Image' },
    description: {
      ru: 'Пример анимации одного кадра в короткий клип с мягким движением.',
      en: 'A still-image animation example turned into a short clip with smooth motion.',
    },
    prompt: {
      ru: 'Preserve the uploaded image identity and composition. The subject slowly steps forward, hair and clothing move in the wind, subtle blinking, slight head turn, slow cinematic camera push-in, realistic motion, stable face, clean hands, high detail.',
      en: 'Preserve the uploaded image identity and composition. The subject slowly steps forward, hair and clothing move in the wind, subtle blinking, slight head turn, slow cinematic camera push-in, realistic motion, stable face, clean hands, high detail.',
    },
    chips: {
      ru: ['Kling', 'Image-to-video', 'Stable face'],
      en: ['Kling', 'Image-to-video', 'Stable face'],
    },
  },
  {
    modelId: 'kling/v2-5-turbo-text-to-video-pro',
    href: '/video?model=kling%2Fv2-5-turbo-text-to-video-pro',
    videoSrc: localExample('/examples/klingv2-5-turbo-text-to-video-pro/example.mp4'),
    title: { ru: 'Kling V2.5 Turbo Pro', en: 'Kling V2.5 Turbo Pro' },
    description: {
      ru: 'Быстрый Kling-режим для энергичной текстовой сцены и понятного результата.',
      en: 'A fast Kling mode for energetic text-driven scenes and dependable output.',
    },
    prompt: {
      ru: 'A fast cinematic scene of a stylish woman crossing a wet city street at night, neon reflections, dramatic backlight, confident walk, realistic motion, crisp details, premium fashion mood.',
      en: 'A fast cinematic scene of a stylish woman crossing a wet city street at night, neon reflections, dramatic backlight, confident walk, realistic motion, crisp details, premium fashion mood.',
    },
    chips: {
      ru: ['Kling', 'Turbo', 'Fast cinematic'],
      en: ['Kling', 'Turbo', 'Fast cinematic'],
    },
  },
  {
    modelId: 'kling/ai-avatar-standard',
    href: '/video?model=kling%2Fai-avatar-standard',
    videoSrc: localExample('/examples/klingai-avatar-standard/example.mp4'),
    title: { ru: 'Kling AI Avatar Standard', en: 'Kling AI Avatar Standard' },
    description: {
      ru: 'Talking-avatar пример: фото плюс аудио с естественной мимикой.',
      en: 'A talking-avatar example using an image plus audio with natural facial motion.',
    },
    prompt: {
      ru: 'Natural talking portrait, realistic lip sync, subtle blinking, gentle head movement, calm confident expression, soft studio lighting, stable identity, clean skin detail, believable human motion.',
      en: 'Natural talking portrait, realistic lip sync, subtle blinking, gentle head movement, calm confident expression, soft studio lighting, stable identity, clean skin detail, believable human motion.',
    },
    chips: {
      ru: ['Avatar', 'Фото + аудио', 'Lip sync'],
      en: ['Avatar', 'Image + audio', 'Lip sync'],
    },
  },
  {
    modelId: 'kling/ai-avatar-pro',
    href: '/video?model=kling%2Fai-avatar-pro',
    videoSrc: localExample('/examples/klingai-avatar-pro/example.mp4'),
    title: { ru: 'Kling AI Avatar Pro', en: 'Kling AI Avatar Pro' },
    description: {
      ru: 'Более сильный talking-avatar кейс для студийного speaking portrait.',
      en: 'A stronger talking-avatar case for studio-style speaking portraits.',
    },
    prompt: {
      ru: 'Natural talking portrait, realistic lip sync, subtle blinking, soft head movement, calm confident expression, stable identity, clean facial detail, studio lighting, believable human motion.',
      en: 'Natural talking portrait, realistic lip sync, subtle blinking, soft head movement, calm confident expression, stable identity, clean facial detail, studio lighting, believable human motion.',
    },
    chips: {
      ru: ['Avatar Pro', 'Speaking portrait', 'Studio light'],
      en: ['Avatar Pro', 'Speaking portrait', 'Studio light'],
    },
  },
  {
    modelId: 'kling-3.0/video',
    href: '/video?model=kling-3.0%2Fvideo',
    videoSrc: localExample('/examples/kling-3.0video/example.mp4'),
    title: { ru: 'Kling 3.0 Video', en: 'Kling 3.0 Video' },
    description: {
      ru: 'Флагманский Kling-кейс для более режиссируемых и эффектных сцен.',
      en: 'A flagship Kling case for more directed, high-impact scenes.',
    },
    prompt: {
      ru: 'A high-end cinematic scene with strong camera direction: a lone character crossing a futuristic street at night, holographic signs, drifting fog, passing lights, confident movement, dynamic but realistic camera motion, premium film look, dramatic lighting, crisp detail.',
      en: 'A high-end cinematic scene with strong camera direction: a lone character crossing a futuristic street at night, holographic signs, drifting fog, passing lights, confident movement, dynamic but realistic camera motion, premium film look, dramatic lighting, crisp detail.',
    },
    chips: {
      ru: ['Kling 3.0', 'Directed scene', 'Premium look'],
      en: ['Kling 3.0', 'Directed scene', 'Premium look'],
    },
  },
  {
    modelId: 'wan/2-6-text-to-video',
    href: '/video?model=wan%2F2-6-text-to-video',
    videoSrc: localExample('/examples/Wan 2.6 Text/example.mp4'),
    title: { ru: 'Wan 2.6 Text', en: 'Wan 2.6 Text' },
    description: {
      ru: 'Реалистичный Wan-кейс для спокойной короткой сцены с натуральной атмосферой.',
      en: 'A realistic Wan case for a calmer short-form scene with natural atmosphere.',
    },
    prompt: {
      ru: 'A realistic documentary-style shot of a fisherman standing on a foggy lake at sunrise, soft wind on the water, subtle body motion, slow camera drift, natural lighting, high realism, calm atmosphere, highly detailed.',
      en: 'A realistic documentary-style shot of a fisherman standing on a foggy lake at sunrise, soft wind on the water, subtle body motion, slow camera drift, natural lighting, high realism, calm atmosphere, highly detailed.',
    },
    chips: {
      ru: ['Wan', 'Realism', 'Natural scene'],
      en: ['Wan', 'Realism', 'Natural scene'],
    },
  },
];

export const VIDEO_SHOWCASE_FEATURED_MODEL_IDS = [
  'bytedance/seedance-1-5-pro',
  'kling-3.0/video',
  'kling/ai-avatar-pro',
  'wan/2-6-text-to-video',
] as const;

export function getVideoShowcaseByModelId(modelId: string | null | undefined) {
  return VIDEO_SHOWCASE_EXAMPLES.find((item) => item.modelId === modelId) ?? null;
}
