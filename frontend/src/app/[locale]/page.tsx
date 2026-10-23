import HomePageClient from '@/components/home/HomePageClient';
import { getHomePageData } from '@/lib/server/public-content';

export const revalidate = 300;

export default async function HomePage() {
  const data = await getHomePageData();

  return <HomePageClient {...data} />;
}
