import 'server-only';

import { buildImageDirectory, buildVideoDirectory } from '@/lib/home-model-directory';
import { getModelGuide } from '@/lib/model-presenter';

type SupportedLocale = 'ru' | 'en';

export type HeaderDropdownCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image?: string | null;
};

const IMAGE_DROPDOWN_PRIORITY = ['google/nano-banana', 'google/nano-banana-edit', 'nano-banana-2', 'nano-banana-pro'];
const VIDEO_DROPDOWN_PRIORITY = ['kling-2.6/text-to-video', 'kling-2.6/image-to-video', 'kling-3/motion-control', 'kling/ai-avatar-pro', 'kling/ai-avatar-standard'];

function prioritizeDropdownCards<T extends { id: string }>(items: T[], priority: string[]) {
  const priorityRank = new Map(priority.map((id, index) => [id, index]));
  return [...items].sort((left, right) => {
    const leftRank = priorityRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = priorityRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return 0;
  });
}

export function buildDesktopTopNavData(locale: SupportedLocale) {
  const imageDropdownCards: HeaderDropdownCard[] = prioritizeDropdownCards(
    buildImageDirectory(locale).flatMap((group) => group.cards),
    IMAGE_DROPDOWN_PRIORITY,
  )
    .slice(0, 6)
    .map((card) => {
      const guide = getModelGuide(card.id, locale);
      return { id: card.id, title: guide.title, description: guide.summary, href: card.href, image: card.image };
    });

  const videoDropdownCards: HeaderDropdownCard[] = prioritizeDropdownCards(
    buildVideoDirectory(locale).flatMap((group) => group.cards),
    VIDEO_DROPDOWN_PRIORITY,
  )
    .slice(0, 6)
    .map((card) => {
      const guide = getModelGuide(card.id, locale);
      return { id: card.id, title: guide.title, description: guide.summary, href: card.href, image: card.image };
    });

  const audioDropdownCards: HeaderDropdownCard[] =
    locale === 'ru'
      ? [
          { id: 'suno-v6', title: 'Suno V6', description: 'Актуальный старт для треков, демо и музыкальных идей.', href: '/audio?model=suno%2FV6', image: null },
          { id: 'suno-v6-mini', title: 'Suno V6 Mini', description: 'Более лёгкий режим для быстрых музыкальных итераций.', href: '/audio?model=suno%2FV6_MINI', image: null },
          { id: 'el-tts', title: 'ElevenLabs Turbo', description: 'Озвучка, дикторский голос и короткие voice-over ролики.', href: '/audio?model=elevenlabs%2Ftext-to-speech-turbo-2-5', image: null },
          { id: 'el-dialogue', title: 'ElevenLabs Dialogue', description: 'Диалоги и сценки с несколькими голосами.', href: '/audio?model=elevenlabs%2Ftext-to-dialogue-v3', image: null },
        ]
      : [
          { id: 'suno-v6', title: 'Suno V6', description: 'Current starting point for tracks, demos and music concepts.', href: '/audio?model=suno%2FV6', image: null },
          { id: 'suno-v6-mini', title: 'Suno V6 Mini', description: 'A lighter mode for fast music iteration.', href: '/audio?model=suno%2FV6_MINI', image: null },
          { id: 'el-tts', title: 'ElevenLabs Turbo', description: 'Voice-over, narration and polished spoken audio.', href: '/audio?model=elevenlabs%2Ftext-to-speech-turbo-2-5', image: null },
          { id: 'el-dialogue', title: 'ElevenLabs Dialogue', description: 'Dialogue scenes with multiple voices.', href: '/audio?model=elevenlabs%2Ftext-to-dialogue-v3', image: null },
        ];

  return {
    imageDropdownCards,
    videoDropdownCards,
    audioDropdownCards,
  };
}
