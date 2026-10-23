import 'server-only';

import type {
  Banner,
  FAQ,
  FeaturedAudio,
  GenerationExample,
  GenerationTask,
  SiteSettings,
} from '@/lib/types';

const PUBLIC_API_BASE_URL = `${(process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/v1/public`;
const PUBLIC_CONTENT_REVALIDATE_SECONDS = 300;

type HomePageData = {
  banners: Banner[];
  faqs: FAQ[];
  examples: GenerationExample[];
  featuredAudio: FeaturedAudio[];
  settings: SiteSettings;
  tasks: GenerationTask[];
};

async function getPublicJson<T>(path: string, fallback: T, fresh: boolean = false): Promise<T> {
  try {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/${path}`, {
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS } }),
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getPublicSettings(): Promise<SiteSettings> {
  return getPublicJson<SiteSettings>('settings', {});
}

export async function getHomePageData(): Promise<HomePageData> {
  const [banners, faqs, rawExamples, settings, rawTasks, featuredAudio] = await Promise.all([
    getPublicJson<Banner[]>('banners', []),
    getPublicJson<FAQ[]>('faqs', []),
    getPublicJson<GenerationExample[]>('examples', [], true),
    getPublicSettings(),
    getPublicJson<GenerationTask[]>('tasks', [], true),
    getPublicJson<FeaturedAudio[]>('featured-audio', []),
  ]);

  return {
    banners,
    faqs,
    examples: rawExamples.filter((example) => example.category !== 'audio'),
    featuredAudio,
    settings,
    tasks: rawTasks.filter((task) => task.category !== 'audio'),
  };
}
