import 'server-only';

import type { FeaturedAudio, SiteSettings } from '@/lib/types';

const PUBLIC_API_BASE_URL = `${(process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/v1/public`;
const CATALOG_CONTENT_REVALIDATE_SECONDS = 300;

async function getCatalogJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/${path}`, {
      next: { revalidate: CATALOG_CONTENT_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getCatalogPageData(): Promise<{
  featuredAudio: FeaturedAudio[];
  settings: SiteSettings;
}> {
  const [settings, featuredAudio] = await Promise.all([
    getCatalogJson<SiteSettings>('settings', {}),
    getCatalogJson<FeaturedAudio[]>('featured-audio', []),
  ]);

  return { featuredAudio, settings };
}
