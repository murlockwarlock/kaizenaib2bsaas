export type ImageModel = {
    id: string;
    name: string;
    type: 'text-to-image' | 'image-to-image';
};

export type OutputFormat = 'jpg' | 'png' | 'jpeg';

export const IMAGE_MODELS: Array<{ group: string; models: ImageModel[] }> = [
    {
        group: 'Flux',
        models: [
            { id: 'flux-2/pro-text-to-image', name: 'Flux Pro (Text)', type: 'text-to-image' },
            { id: 'flux-2/pro-image-to-image', name: 'Flux Pro (Image)', type: 'image-to-image' },
            { id: 'flux-2/flex-text-to-image', name: 'Flux Flex (Text)', type: 'text-to-image' },
            { id: 'flux-2/flex-image-to-image', name: 'Flux Flex (Image)', type: 'image-to-image' },
        ]
    },
    {
        group: 'Seedream',
        models: [
            { id: 'bytedance/seedream-v4-text-to-image', name: 'Seedream V4 (Text)', type: 'text-to-image' },
            { id: 'bytedance/seedream-v4-edit', name: 'Seedream V4 Edit', type: 'image-to-image' },
            { id: 'seedream/4.5-text-to-image', name: 'Seedream 4.5 (Text)', type: 'text-to-image' },
            { id: 'bytedance/seedream', name: 'Seedream 3.0 (Text)', type: 'text-to-image' },
        ]
    },
    {
        group: 'Qwen',
        models: [
            { id: 'qwen/text-to-image', name: 'Qwen (Text)', type: 'text-to-image' },
            { id: 'qwen/image-to-image', name: 'Qwen (Image)', type: 'image-to-image' },
        ]
    },
    {
        group: 'Ideogram',
        models: [
            { id: 'ideogram/v3-text-to-image', name: 'Ideogram V3 (Text)', type: 'text-to-image' },
            { id: 'ideogram/character', name: 'Ideogram Character', type: 'image-to-image' },
        ]
    },
    {
        group: 'Google',
        models: [
            { id: 'google/nano-banana', name: 'Google Nano Banana', type: 'text-to-image' },
            { id: 'google/nano-banana-edit', name: 'Google Nano Banana Edit', type: 'image-to-image' },
            { id: 'nano-banana-2', name: 'Nano Banana 2', type: 'text-to-image' },
            { id: 'nano-banana-2-1', name: 'Nano Banana 2.1', type: 'text-to-image' },
            { id: 'nano-banana-2-lite', name: 'Nano Banana 2 Lite', type: 'text-to-image' },
            { id: 'nano-banana-pro', name: 'Nano Banana Pro', type: 'text-to-image' },
            { id: 'google/imagen4', name: 'Google Imagen 4', type: 'text-to-image' },
            { id: 'google/imagen4-fast', name: 'Google Imagen 4 Fast', type: 'text-to-image' },
            { id: 'google/imagen4-ultra', name: 'Google Imagen 4 Ultra', type: 'text-to-image' },
        ]
    },
    {
        group: 'Other',
        models: [
            { id: 'z-image', name: 'Z-Image (Text)', type: 'text-to-image' },
            { id: 'topaz/image-upscale', name: 'Topaz Upscale', type: 'image-to-image' },
            { id: 'recraft/crisp-upscale', name: 'Recraft Crisp Upscale', type: 'image-to-image' },
            { id: 'recraft/remove-background', name: 'Recraft Remove BG', type: 'image-to-image' },
        ]
    }
];

export const NANOBANANA_MODEL = 'nano-banana-2';
export const NANOBANANA_21_MODEL = 'nano-banana-2-1';
export const NANOBANANA_LITE_MODEL = 'nano-banana-2-lite';
export const NANOBANANA_PRO_MODEL = 'nano-banana-pro';
export const GOOGLE_NANO_BANANA_MODEL = 'google/nano-banana';
export const GOOGLE_NANO_BANANA_EDIT_MODEL = 'google/nano-banana-edit';
export const GOOGLE_IMAGEN_MODELS = ['google/imagen4', 'google/imagen4-fast', 'google/imagen4-ultra'];
export const DEFAULT_IMAGE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '3:4', '4:3'];
export const NANOBANANA_ASPECT_RATIOS = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '4:5', '5:4', '21:9', '3:2', '2:3', '1:4', '4:1', '1:8', '8:1'];
export const GOOGLE_NANO_ASPECT_RATIOS = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '4:5', '5:4', '21:9', '3:2', '2:3'];
export const GOOGLE_IMAGEN_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '3:4', '4:3'];
export const IMAGE_SIZE_MAPPING: Record<string, string> = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3'
};

export const MODEL_GROUP_STYLES: Record<string, { accent: string; badge: string }> = {
    Flux: {
        accent: 'from-fuchsia-500/18 via-pink-500/8 to-transparent',
        badge: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200'
    },
    Seedream: {
        accent: 'from-sky-500/18 via-cyan-500/8 to-transparent',
        badge: 'border-sky-400/25 bg-sky-500/10 text-sky-200'
    },
    Qwen: {
        accent: 'from-emerald-500/18 via-teal-500/8 to-transparent',
        badge: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
    },
    Ideogram: {
        accent: 'from-amber-500/18 via-orange-500/8 to-transparent',
        badge: 'border-amber-400/25 bg-amber-500/10 text-amber-200'
    },
    Google: {
        accent: 'from-pink-500/20 via-violet-500/10 to-transparent',
        badge: 'border-pink-400/25 bg-pink-500/10 text-pink-200'
    },
    Other: {
        accent: 'from-zinc-500/18 via-zinc-400/8 to-transparent',
        badge: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-200'
    }
};

export function usesImageSize(modelId: string) {
    return modelId.includes('seedream') || modelId.includes('qwen') || modelId.includes('ideogram');
}

export function getAspectRatioOptions(modelId: string) {
    if (modelId === NANOBANANA_MODEL || modelId === NANOBANANA_21_MODEL || modelId === NANOBANANA_LITE_MODEL) return NANOBANANA_ASPECT_RATIOS;
    if (modelId === NANOBANANA_PRO_MODEL || modelId === GOOGLE_NANO_BANANA_MODEL || modelId === GOOGLE_NANO_BANANA_EDIT_MODEL) return GOOGLE_NANO_ASPECT_RATIOS;
    if (GOOGLE_IMAGEN_MODELS.includes(modelId)) return GOOGLE_IMAGEN_ASPECT_RATIOS;
    return DEFAULT_IMAGE_ASPECT_RATIOS;
}

export function getResolutionOptions(modelId: string) {
    if (modelId === NANOBANANA_MODEL || modelId === NANOBANANA_21_MODEL || modelId === NANOBANANA_PRO_MODEL) return ['1K', '2K', '4K'];
    if (modelId.includes('flux') || modelId.includes('seedream-v4')) return ['1K', '2K'];
    return [];
}

export function supportsOutputFormat(modelId: string) {
    return [
        NANOBANANA_MODEL,
        NANOBANANA_21_MODEL,
        NANOBANANA_PRO_MODEL,
        GOOGLE_NANO_BANANA_MODEL,
        GOOGLE_NANO_BANANA_EDIT_MODEL,
    ].includes(modelId);
}

export function supportsGoogleSearch(modelId: string) {
    return modelId === NANOBANANA_MODEL;
}

export function getOutputFormatOptions(modelId: string): OutputFormat[] {
    if ([GOOGLE_NANO_BANANA_MODEL, GOOGLE_NANO_BANANA_EDIT_MODEL].includes(modelId)) return ['png', 'jpeg'];
    if ([NANOBANANA_MODEL, NANOBANANA_21_MODEL, NANOBANANA_PRO_MODEL].includes(modelId)) return ['jpg', 'png'];
    return [];
}

export function supportsMultipleReferences(modelId: string) {
    return [NANOBANANA_MODEL, NANOBANANA_21_MODEL, NANOBANANA_PRO_MODEL, GOOGLE_NANO_BANANA_EDIT_MODEL, NANOBANANA_LITE_MODEL].includes(modelId);
}

export function allowsOptionalReferences(modelId: string) {
    return [NANOBANANA_MODEL, NANOBANANA_21_MODEL, NANOBANANA_PRO_MODEL, NANOBANANA_LITE_MODEL].includes(modelId);
}

export function getMaxReferences(modelId: string) {
    if (modelId === NANOBANANA_MODEL) return 14;
    if (modelId === NANOBANANA_21_MODEL) return 10;
    if (modelId === NANOBANANA_LITE_MODEL) return 10;
    if (modelId === NANOBANANA_PRO_MODEL) return 8;
    if (modelId === GOOGLE_NANO_BANANA_EDIT_MODEL) return 10;
    return 1;
}

export function formatAspectRatioLabel(value: string) {
    return value === 'auto' ? 'Auto' : value;
}

export function supportsNegativePrompt(modelId: string) {
    return GOOGLE_IMAGEN_MODELS.includes(modelId);
}

export function supportsSeed(modelId: string) {
    return GOOGLE_IMAGEN_MODELS.includes(modelId);
}

export function supportsNumImages(modelId: string) {
    return modelId === 'google/imagen4-fast';
}

export function usesAspectRatioAsImageSize(modelId: string) {
    return [GOOGLE_NANO_BANANA_MODEL, GOOGLE_NANO_BANANA_EDIT_MODEL].includes(modelId);
}

export function getAspectIconClasses(value: string) {
    switch (value) {
        case 'auto':
            return 'h-4 w-6 border-dashed';
        case '1:1':
            return 'h-4 w-4';
        case '16:9':
        case '21:9':
        case '4:3':
        case '3:2':
        case '4:1':
        case '8:1':
            return 'h-3 w-6';
        case '9:16':
        case '3:4':
        case '2:3':
        case '1:4':
        case '1:8':
            return 'h-6 w-3';
        case '4:5':
            return 'h-5 w-4';
        case '5:4':
            return 'h-4 w-5';
        default:
            return 'h-4 w-4';
    }
}

export function splitAspectRatioOptions(options: string[]) {
    const primaryPriority = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '4:5', '5:4', '21:9', '3:2', '2:3'];
    const primary = primaryPriority.filter((value) => options.includes(value));
    const secondary = options.filter((value) => !primary.includes(value));
    return { primary, secondary };
}

export function getModelShortDescription(model: ImageModel, locale: 'ru' | 'en') {
    const ru =
        model.id === NANOBANANA_MODEL ? 'Большие кадры, несколько изображений и гибкая работа с форматом.'
        : model.id === NANOBANANA_21_MODEL ? 'Актуальная версия Nano Banana для новых генераций и редактирования.'
        : model.id === NANOBANANA_LITE_MODEL ? 'Быстрый режим с поддержкой нескольких референсов.'
        : model.id === NANOBANANA_PRO_MODEL ? 'Сильный режим для чистой картинки и крупных финальных кадров.'
        : model.id === GOOGLE_NANO_BANANA_MODEL ? 'Быстрый вариант для повседневных генераций.'
        : model.id === GOOGLE_NANO_BANANA_EDIT_MODEL ? 'Подходит, когда нужно заметно переделать уже готовый кадр.'
        : model.id === 'google/imagen4-fast' ? 'Быстрый способ получить сразу несколько вариантов.'
        : model.id === 'google/imagen4-ultra' ? 'Для чистых hero-кадров и более дорогого визуала.'
        : model.id === 'google/imagen4' ? 'Сбалансированный выбор для обычных задач.'
        : model.id === 'flux-2/pro-text-to-image' ? 'Сильная Flux-модель для детализированных изображений.'
        : model.id === 'flux-2/pro-image-to-image' ? 'Редактирование и заметная переработка изображения в стиле Flux Pro.'
        : model.id === 'flux-2/flex-text-to-image' ? 'Более гибкий и быстрый Flux для итераций.'
        : model.id === 'flux-2/flex-image-to-image' ? 'Гибкие правки и быстрые визуальные варианты.'
        : model.id === 'bytedance/seedream-v4-text-to-image' ? 'Для выразительных сцен и стилизованных кадров.'
        : model.id === 'bytedance/seedream-v4-edit' ? 'Для смелых переделок по свету, стилю и настроению.'
        : model.id === 'seedream/4.5-text-to-image' ? 'Для художественных и атмосферных изображений.'
        : model.id === 'bytedance/seedream' ? 'Универсальный выбор для креативных задач.'
        : model.id === 'qwen/text-to-image' ? 'Прямая генерация изображения по описанию.'
        : model.id === 'qwen/image-to-image' ? 'Переработка загруженного изображения через Qwen.'
        : model.id === 'ideogram/v3-text-to-image' ? 'Хорошо подходит для постеров и типографики.'
        : model.id === 'ideogram/character' ? 'Для персонажей и вариаций одного образа.'
        : model.id.includes('upscale') ? 'Повышает четкость и доводит картинку до чистого финала.'
        : model.id.includes('remove-background') ? 'Быстро убирает фон без ручной вырезки.'
        : 'Выберите модель под свой визуальный результат.';

    const en =
        model.id === NANOBANANA_MODEL ? 'Large outputs, multiple images and flexible framing.'
        : model.id === NANOBANANA_21_MODEL ? 'The current Nano Banana version for new generations and edits.'
        : model.id === NANOBANANA_LITE_MODEL ? 'A fast mode with support for multiple references.'
        : model.id === NANOBANANA_PRO_MODEL ? 'A stronger mode for cleaner visuals and larger finals.'
        : model.id === GOOGLE_NANO_BANANA_MODEL ? 'A fast option for everyday image generation.'
        : model.id === GOOGLE_NANO_BANANA_EDIT_MODEL ? 'Great when an existing frame needs a visible rewrite.'
        : model.id === 'google/imagen4-fast' ? 'A fast way to get several variants in one run.'
        : model.id === 'google/imagen4-ultra' ? 'Built for clean hero visuals and a more premium finish.'
        : model.id === 'google/imagen4' ? 'A balanced choice for general image work.'
        : model.id === 'flux-2/pro-text-to-image' ? 'A strong Flux model for detailed image generation.'
        : model.id === 'flux-2/pro-image-to-image' ? 'Edit and reshape an image with Flux Pro styling.'
        : model.id === 'flux-2/flex-text-to-image' ? 'A more flexible and faster Flux option for iteration.'
        : model.id === 'flux-2/flex-image-to-image' ? 'Flexible edits and quick visual variations.'
        : model.id === 'bytedance/seedream-v4-text-to-image' ? 'Made for expressive scenes and stylized visuals.'
        : model.id === 'bytedance/seedream-v4-edit' ? 'For bold rewrites in lighting, styling and mood.'
        : model.id === 'seedream/4.5-text-to-image' ? 'A good fit for artistic and atmospheric frames.'
        : model.id === 'bytedance/seedream' ? 'A general creative option for broad visual tasks.'
        : model.id === 'qwen/text-to-image' ? 'Direct image generation from a prompt.'
        : model.id === 'qwen/image-to-image' ? 'Transform an uploaded image with Qwen.'
        : model.id === 'ideogram/v3-text-to-image' ? 'Works especially well for posters and typography.'
        : model.id === 'ideogram/character' ? 'Made for characters and consistent identity work.'
        : model.id.includes('upscale') ? 'Sharpens and polishes an image into a cleaner final.'
        : model.id.includes('remove-background') ? 'Removes the background without manual cutout work.'
        : 'Pick the model that matches the visual result you want.';

    return locale === 'ru' ? ru : en;
}

export function getModelCapabilityTags(model: ImageModel, locale: 'ru' | 'en') {
    const tags: string[] = [model.type === 'image-to-image' ? (locale === 'ru' ? 'Правки' : 'Edit') : (locale === 'ru' ? 'Генерация' : 'Generate')];

    if (getResolutionOptions(model.id).includes('4K')) {
        tags.push('4K');
    }
    if (supportsMultipleReferences(model.id)) {
        tags.push(locale === 'ru' ? 'Рефы' : 'Refs');
    }
    if (supportsNegativePrompt(model.id)) {
        tags.push(locale === 'ru' ? 'Негатив' : 'Negative');
    }
    if (supportsNumImages(model.id)) {
        tags.push(locale === 'ru' ? 'Варианты' : 'Multi');
    }
    if (supportsGoogleSearch(model.id)) {
        tags.push('Web');
    }

    return tags;
}
