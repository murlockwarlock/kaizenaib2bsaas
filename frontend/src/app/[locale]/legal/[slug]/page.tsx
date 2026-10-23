import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import GooeyFooter from '@/components/GooeyFooter';
import { getLegalDocumentContent, getLegalDocumentTitle, getLegalTypeFromSlug } from '@/lib/legal';
import { getPublicSettings } from '@/lib/server/public-content';

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const documentType = getLegalTypeFromSlug(slug);

  if (!documentType) {
    notFound();
  }

  const settings = await getPublicSettings();
  const title = getLegalDocumentTitle(locale, documentType);
  const content = getLegalDocumentContent(settings, locale, documentType);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-3 pb-10 pt-20 sm:px-4 md:px-6 md:pb-14 md:pt-12">
      <section className="home-flat-surface overflow-hidden rounded-[2rem] border border-white/8 px-5 py-6 sm:px-6 md:rounded-[2.4rem] md:px-8 md:py-8">
        <div className="accent-pill inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/88">
          Legal
        </div>
        <h1 className="section-title mt-5 text-[clamp(2.2rem,6vw,4.2rem)] leading-[0.98] text-white">{title}</h1>
        <div className="mt-8 rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,16,22,0.94),rgba(8,10,14,0.9))] p-5 sm:p-6">
          <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-300 sm:text-[15px]">{content}</div>
        </div>
      </section>

      <div className="mt-10">
        <GooeyFooter settings={settings} />
      </div>
    </div>
  );
}
