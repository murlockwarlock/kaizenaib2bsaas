'use client';

import { type CSSProperties, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useVisualEffects } from '@/components/VisualEffectsContext';
import type { SiteSettings } from '@/lib/types';
import { Sparkles, Compass, Coins, Video, Music, ImageIcon } from 'lucide-react';
import { FaDiscord, FaInstagram, FaTelegram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import styles from './GooeyFooter.module.css';

type ParticleStyle = CSSProperties & {
  '--dim': string;
  '--lift': string;
  '--pos-x': string;
  '--dur': string;
  '--delay': string;
  '--particle-color': string;
};

type InternalItem = {
  type: 'internal';
  label: string;
  href: string;
  icon: ReactNode;
};

type ExternalItem = {
  type: 'external';
  label: string;
  href: string;
  icon: ReactNode;
};

type FooterItem = InternalItem | ExternalItem;

const makeInternalItem = (label: string, href: string, icon: ReactNode): InternalItem => ({
  type: 'internal',
  label,
  href,
  icon,
});

const makeExternalItem = (label: string, href: string, icon: ReactNode): ExternalItem => ({
  type: 'external',
  label,
  href,
  icon,
});

const PARTICLES: ParticleStyle[] = Array.from({ length: 18 }, (_, index) => {
  const dim = 2.5 + ((index * 19) % 28) / 10;
  const lift = 2.8 + ((index * 17) % 22) / 10;
  const posX = 4 + ((index * 29) % 92);
  const dur = 3.2 + ((index * 11) % 16) / 10;
  const delay = -1 * (((index * 13) % 18) / 2.2);
  const particleColor = index % 3 === 0 ? '#ff8b63' : index % 2 === 0 ? '#22c7b8' : '#ff6b4a';

  return {
    '--dim': `${dim}rem`,
    '--lift': `${lift}rem`,
    '--pos-x': `${Math.min(posX, 97)}%`,
    '--dur': `${dur}s`,
    '--delay': `${delay}s`,
    '--particle-color': particleColor,
  };
});

export default function GooeyFooter({ settings }: { settings: SiteSettings }) {
  const t = useTranslations('Index');
  const navT = useTranslations('Navigation');
  const authT = useTranslations('Auth');
  const { liquidChromeEnabled } = useVisualEffects();

  const socialItems: ExternalItem[] = [];

  if (settings.telegram) {
    socialItems.push(makeExternalItem('Telegram', settings.telegram, <FaTelegram className="h-4 w-4" />));
  }

  if (settings.instagram) {
    socialItems.push(makeExternalItem('Instagram', settings.instagram, <FaInstagram className="h-4 w-4" />));
  }

  if (settings.twitter) {
    socialItems.push(makeExternalItem('X / Twitter', settings.twitter, <FaXTwitter className="h-4 w-4" />));
  }

  if (settings.discord) {
    socialItems.push(makeExternalItem('Discord', settings.discord, <FaDiscord className="h-4 w-4" />));
  }

  const columns: Array<{ title: string; items: FooterItem[] }> = [
    {
      title: t('footer_product'),
      items: [
        makeInternalItem(navT('pricing'), '/pricing', <Coins className="h-4 w-4" />),
        makeInternalItem(navT('ai_effects'), '/catalog', <Sparkles className="h-4 w-4" />),
        makeInternalItem(navT('explore'), '/explore', <Compass className="h-4 w-4" />),
      ],
    },
    {
      title: t('footer_create'),
      items: [
        makeInternalItem(navT('video'), '/video', <Video className="h-4 w-4" />),
        makeInternalItem(navT('audio'), '/audio?model=suno%2FV5', <Music className="h-4 w-4" />),
        makeInternalItem(navT('images'), '/images', <ImageIcon className="h-4 w-4" />),
      ],
    },
    {
      title: t('footer_social'),
      items: socialItems,
    },
  ].filter((column) => column.items.length > 0);

  return (
    <footer className={styles.footer}>
      <svg className={styles.svgDefs} aria-hidden="true" focusable="false">
        <defs>
          <filter id="gooey-footer-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey"
            />
          </filter>
        </defs>
      </svg>

      <div className={styles.gooeyBand} aria-hidden="true">
        <div className={`${styles.gooeyTrack} ${liquidChromeEnabled ? styles.gooeyTrackAnimated : ''}`}>
          <div className={`${styles.gooeyPlate} ${!liquidChromeEnabled ? styles.gooeyPlateStatic : ''}`} />
          {liquidChromeEnabled
            ? PARTICLES.map((style, index) => <span key={index} className={styles.particle} style={style} />)
            : null}
        </div>
      </div>

      <div className={styles.shell}>
        <div className={styles.layout}>
          {columns.map((column) => (
            <div key={column.title} className={styles.column}>
              <h3 className={styles.columnTitle}>{column.title}</h3>
              <div className={styles.linkList}>
                {column.items.map((item) => (
                  item.type === 'internal' ? (
                    <Link key={`${column.title}-${item.href}`} href={item.href} className={styles.linkItem}>
                      <span className={styles.linkIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <a
                      key={`${column.title}-${item.href}`}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.linkItem}
                    >
                      <span className={styles.linkIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.legalRow}>
            <Link href="/legal/terms" className={styles.legalChip}>
              {authT('terms_link')}
            </Link>
            <Link href="/legal/privacy" className={styles.legalChip}>
              {authT('privacy_link')}
            </Link>
            <Link href="/legal/cookies" className={styles.legalChip}>
              {authT('cookies_link')}
            </Link>
            <Link href="/legal/refund" className={styles.legalChip}>
              {authT('refund_link')}
            </Link>
          </div>
          <p className={styles.copy}>{t('footer_rights')}</p>
        </div>
      </div>
    </footer>
  );
}
