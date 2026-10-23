import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/components/AuthContext';
import { VisualEffectsProvider } from '@/components/VisualEffectsContext';
import DeferredGlobalEnhancements from '@/components/DeferredGlobalEnhancements';
import DeferredToaster from '@/components/DeferredToaster';
import UTMTracker from '@/components/UTMTracker';
import { buildDesktopTopNavData } from '@/components/sidebar/desktop-top-nav-data';
import { Manrope, Prata } from 'next/font/google';
import "./globals.css";

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
});

const prata = Prata({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-prata',
  weight: '400',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata = {
  title: "KaizenAI — Create Stunning AI Visual Content",
  description: "Professional-grade AI tools for video, audio, and image generation. Create stunning visual content with the power of AI.",
};
import Script from 'next/script';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
  const desktopTopNavData = buildDesktopTopNavData(locale === 'ru' ? 'ru' : 'en');

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <Script id="strip-extension-hydration-attrs" strategy="beforeInteractive">
          {`
            (function () {
              var ATTRIBUTES = ['bis_skin_checked', 'data-new-gr-c-s-check-loaded', 'data-gr-ext-installed'];

              function stripAttrs(root) {
                if (!root || !root.querySelectorAll) return;
                for (var i = 0; i < ATTRIBUTES.length; i += 1) {
                  var attr = ATTRIBUTES[i];
                  if (root.hasAttribute && root.hasAttribute(attr)) {
                    root.removeAttribute(attr);
                  }
                  var nodes = root.querySelectorAll('[' + attr + ']');
                  for (var j = 0; j < nodes.length; j += 1) {
                    nodes[j].removeAttribute(attr);
                  }
                }
              }

              stripAttrs(document.documentElement);

              var observer = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i += 1) {
                  var mutation = mutations[i];
                  if (mutation.type === 'attributes' && mutation.target) {
                    stripAttrs(mutation.target);
                  }
                  if (mutation.type === 'childList') {
                    for (var j = 0; j < mutation.addedNodes.length; j += 1) {
                      var node = mutation.addedNodes[j];
                      if (node && node.nodeType === 1) {
                        stripAttrs(node);
                      }
                    }
                  }
                }
              });

              observer.observe(document.documentElement, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ATTRIBUTES
              });

              window.addEventListener('load', function () {
                window.setTimeout(function () {
                  observer.disconnect();
                }, 4000);
              });
            })();
          `}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={`${manrope.variable} ${prata.variable} min-h-screen bg-[#06070a] text-zinc-100 antialiased m-0 p-0 selection:bg-[#ff6b4a]/30 selection:text-white`}
      >
        <div className="app-shell-grid" />
        <div className="app-shell-glow app-shell-glow--one" />
        <div className="app-shell-glow app-shell-glow--two" />
        <DeferredToaster />
        <AuthProvider>
          <VisualEffectsProvider>
            <NextIntlClientProvider messages={messages}>
              <UTMTracker />
              <DeferredGlobalEnhancements />
              <Sidebar desktopTopNavData={desktopTopNavData}>
                {children}
              </Sidebar>
            </NextIntlClientProvider>
          </VisualEffectsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
