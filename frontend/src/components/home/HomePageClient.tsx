import { getLocale } from 'next-intl/server';
import DesktopHomeLanding from '@/components/home/DesktopHomeLanding';
import { buildHomeViewModel } from '@/components/home/home-presenter';
import type { Banner, FAQ, GenerationExample, GenerationTask, SiteSettings } from '@/lib/types';

type HomePageClientProps = {
  banners: Banner[];
  faqs: FAQ[];
  examples: GenerationExample[];
  settings: SiteSettings;
  tasks: GenerationTask[];
};

export default async function HomePageClient({
  banners,
  faqs,
  examples,
  settings,
  tasks,
}: HomePageClientProps) {
  const locale = (await getLocale()) as 'ru' | 'en';
  const homeView = buildHomeViewModel({
    locale,
    examples,
    settings,
    tasks,
  });

  return (
    <DesktopHomeLanding
      locale={locale}
      banners={banners}
      faqs={faqs}
      settings={settings}
      {...homeView}
    />
  );
}
