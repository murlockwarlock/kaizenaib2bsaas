'use client';

import Image from 'next/image';
import { AudioWaveform, Copy, Globe, Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

import AudioPremiumShowcase from '@/components/AudioPremiumShowcase';
import { AUDIO_COVER_PATHS } from '@/lib/audio-covers';
import type { FeaturedAudio } from '@/lib/types';

export type AudioMode = 'tts' | 'music' | 'dialogue';

export type DialogueLine = {
  voice: string;
  text: string;
};

export type AudioExample = {
  url: string;
  prompt: string;
  mode: AudioMode;
  voice?: string;
  dialogues?: DialogueLine[];
};

type MusicPreset = {
  modelId: string;
  title: string;
  prompt: string;
  style: string;
  instrumental: boolean;
  intensity: number;
};

type TtsPreset = {
  modelId: string;
  prompt: string;
  voice: string;
};

type DialoguePreset = {
  modelId: string;
  dialogues: DialogueLine[];
};

const EXAMPLES: AudioExample[] = [
  {
    url: AUDIO_COVER_PATHS[2],
    prompt: 'A calm, professional voice-over for a luxury travel documentary about Swiss Alps.',
    mode: 'tts',
    voice: 'Roger',
  },
  {
    url: AUDIO_COVER_PATHS[0],
    prompt: 'Energetic and upbeat radio anthem for a new summer music festival with crowd chants and bright synths.',
    mode: 'music',
  },
  {
    url: AUDIO_COVER_PATHS[3],
    prompt: 'Two characters arguing about a missing map in a dark, mysterious forest.',
    mode: 'dialogue',
    dialogues: [
      { voice: 'Brian', text: 'The map was here an hour ago. Tell me you did not lose it.' },
      { voice: 'Lily', text: 'I did not lose it. Something moved in the trees, and then it was gone.' },
    ],
  },
  {
    url: AUDIO_COVER_PATHS[1],
    prompt: 'Atmospheric indie synth track for a rainy night drive through a futuristic city.',
    mode: 'music',
  },
  {
    url: AUDIO_COVER_PATHS[4],
    prompt: 'Warm podcast intro voice with confident pacing and a premium modern brand tone.',
    mode: 'tts',
    voice: 'Roger',
  },
];

export default function AudioShowcasePanel({
  featuredAudio,
  onApplyMusicPreset,
  onApplyTtsPreset,
  onApplyDialoguePreset,
  onApplyExample,
}: {
  featuredAudio: FeaturedAudio[];
  onApplyMusicPreset: (preset: MusicPreset) => void;
  onApplyTtsPreset: (preset: TtsPreset) => void;
  onApplyDialoguePreset: (preset: DialoguePreset) => void;
  onApplyExample: (example: AudioExample) => void;
}) {
  const t = useTranslations('Audio');

  const premiumCases = [
    {
      id: 'lyrics',
      icon: Music,
      title: t('premium_case_lyrics_title'),
      description: t('premium_case_lyrics_desc'),
      image: AUDIO_COVER_PATHS[0],
      chips: [t('premium_case_lyrics_chip_1'), t('premium_case_lyrics_chip_2'), t('premium_case_lyrics_chip_3')],
      promptPreview: t('premium_case_lyrics_prompt'),
      apply: () =>
        onApplyMusicPreset({
          modelId: 'suno/V6',
          title: t('premium_case_lyrics_seed'),
          prompt: t('premium_case_lyrics_prompt'),
          style: 'anthemic pop, emotional build, bright female topline',
          instrumental: false,
          intensity: 74,
        }),
    },
    {
      id: 'sfx',
      icon: AudioWaveform,
      title: t('premium_case_sfx_title'),
      description: t('premium_case_sfx_desc'),
      image: AUDIO_COVER_PATHS[1],
      chips: [t('premium_case_sfx_chip_1'), t('premium_case_sfx_chip_2'), t('premium_case_sfx_chip_3')],
      promptPreview: t('premium_case_sfx_prompt'),
      apply: () =>
        onApplyMusicPreset({
          modelId: 'suno/V6_MINI',
          title: '',
          prompt: t('premium_case_sfx_prompt'),
          style: 'cinematic impacts, whooshes, metallic hits, tension risers',
          instrumental: true,
          intensity: 68,
        }),
    },
    {
      id: 'tts',
      icon: Globe,
      title: t('premium_case_tts_title'),
      description: t('premium_case_tts_desc'),
      image: AUDIO_COVER_PATHS[2],
      chips: [t('premium_case_tts_chip_1'), t('premium_case_tts_chip_2'), t('premium_case_tts_chip_3')],
      promptPreview: t('premium_case_tts_prompt'),
      apply: () =>
        onApplyTtsPreset({
          modelId: 'elevenlabs/text-to-speech-turbo-2-5',
          prompt: t('premium_case_tts_prompt'),
          voice: 'Roger',
        }),
    },
    {
      id: 'cover',
      icon: Copy,
      title: t('premium_case_cover_title'),
      description: t('premium_case_cover_desc'),
      image: AUDIO_COVER_PATHS[4],
      chips: [t('premium_case_cover_chip_1'), t('premium_case_cover_chip_2'), t('premium_case_cover_chip_3')],
      promptPreview: t('premium_case_cover_prompt'),
      apply: () =>
        onApplyMusicPreset({
          modelId: 'suno/V6',
          title: t('premium_case_cover_seed'),
          prompt: t('premium_case_cover_prompt'),
          style: 'synthwave cover, glossy drums, nostalgic female tone',
          instrumental: false,
          intensity: 62,
        }),
    },
  ];

  return (
    <>
      <section className="grid gap-6">
        <AudioPremiumShowcase
          badge={t('premium_badge')}
          title={t('title')}
          description={t('description')}
          items={premiumCases.map((item) => ({
            id: item.id,
            icon: item.icon,
            title: item.title,
            description: item.description,
            image: item.image,
            chips: item.chips,
            promptPreview: item.promptPreview,
            onClick: item.apply,
          }))}
          featuredAudio={featuredAudio.slice(0, 4)}
          featuredLabel={t('featured_demos_badge')}
          featuredTitle={t('featured_demos_title')}
          featuredDescription={t('featured_demos_desc')}
          cardTagLabel={t('premium_card_tag')}
          cardCtaLabel={t('premium_try_free')}
          usePromptLabel={t('use_text')}
          playLabel={t('featured_play')}
          pauseLabel={t('featured_pause')}
          promptLabel={t('featured_prompt')}
        />
      </section>

      <section className="panel-surface rounded-[2rem] p-6 md:p-7">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('examples_badge')}</div>
            <h2 className="section-title mt-3 text-3xl text-white md:text-4xl">{t('examples_title')}</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400">{t('examples_desc')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
          {EXAMPLES.map((example, index) => (
            <article
              key={`${example.mode}-${index}`}
              onClick={() => {
                if (example.mode === 'dialogue' && example.dialogues?.length) {
                  onApplyDialoguePreset({
                    modelId: 'elevenlabs/text-to-dialogue-v3',
                    dialogues: example.dialogues,
                  });
                  return;
                }
                onApplyExample(example);
              }}
              className="group mesh-card cursor-pointer overflow-hidden rounded-[1.8rem] border border-white/8"
            >
              <div className="relative aspect-[4/4.4] overflow-hidden">
                <Image
                  src={example.url}
                  alt={example.prompt}
                  fill
                  unoptimized
                  loader={({ src }) => src}
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,10,0.12)_0%,rgba(4,6,10,0.42)_42%,rgba(4,6,10,0.96)_100%)]" />
                <div className="absolute left-5 top-5 accent-pill rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
                  {example.mode === 'music' ? t('tab_music') : example.mode === 'dialogue' ? t('dialogues') : t('tab_tts')}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="mb-4 text-sm font-medium leading-relaxed text-white/92">{example.prompt}</p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (example.mode === 'dialogue' && example.dialogues?.length) {
                        onApplyDialoguePreset({
                          modelId: 'elevenlabs/text-to-dialogue-v3',
                          dialogues: example.dialogues,
                        });
                        return;
                      }
                      onApplyExample(example);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/16"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {t('use_text')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
