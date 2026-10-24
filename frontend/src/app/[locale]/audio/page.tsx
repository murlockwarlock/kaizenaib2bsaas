'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getPromptSafetyIssue } from '@/lib/prompt-safety';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';
import { trackGeneration } from '@/lib/generation-tracker';
import { localizeProviderError } from '@/lib/generation-alerts';
import type { AudioExample, DialogueLine } from '@/components/audio/AudioShowcasePanel';
import { getModelGuide, type SupportedLocale } from '@/lib/model-presenter';
import type { FeaturedAudio } from '@/lib/types';
import {
  AUDIO_MODELS,
  DEFAULT_DIALOGUE,
  SUNO_MODEL_IDS,
  VOICES,
} from '@/components/audio/audio-tool-config';

const AudioShowcasePanelLazy = dynamic(() => import('@/components/audio/AudioShowcasePanel'));
const AudioWorkspacePanelLazy = dynamic(() => import('@/components/audio/AudioWorkspacePanel'));

type PriceEntry = {
  category: string;
  is_active: boolean;
  model_name?: string | null;
  cost: number | null;
};

function AudioAIToolContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('Audio');
  const alertsT = useTranslations('GenerationAlerts');
  const locale = useLocale() as SupportedLocale;

  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [tab, setTab] = useState<'tts' | 'music'>('music');
  const [modelObj, setModelObj] = useState(AUDIO_MODELS[0]);
  const [sunoModel, setSunoModel] = useState(SUNO_MODEL_IDS[0]);
  const [prompt, setPrompt] = useState('');
  const [sunoPrompt, setSunoPrompt] = useState('');
  const [sunoInstrumental, setSunoInstrumental] = useState(false);
  const [sunoStyle, setSunoStyle] = useState('');
  const [sunoIntensity, setSunoIntensity] = useState(58);
  const [sunoTitle, setSunoTitle] = useState('');
  const [voice, setVoice] = useState(VOICES[0].value);
  const [dialogues, setDialogues] = useState<DialogueLine[]>(DEFAULT_DIALOGUE);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [featuredAudio, setFeaturedAudio] = useState<FeaturedAudio[]>([]);

  useEffect(() => {
    apiClient.get<PriceEntry[]>('/public/prices').then((response) => setPrices(response.data)).catch(() => {});
    apiClient.get<FeaturedAudio[]>('/public/featured-audio').then((response) => setFeaturedAudio(response.data)).catch(() => {});
  }, []);

  const selectedModelId = tab === 'music' ? sunoModel.id : modelObj.id;
  const selectedModelName = tab === 'music' ? sunoModel.name : modelObj.name;
  const selectedModelGuide = useMemo(() => getModelGuide(selectedModelId, locale), [locale, selectedModelId]);

  const computedCost = useMemo(() => {
    const categoryPrices = prices.filter((price) => price.category === 'audio' && price.is_active);
    if (!categoryPrices.length) return null;

    const normalizedId = selectedModelId.toLowerCase();
    const normalizedName = selectedModelName.toLowerCase();
    const matchingPrice = categoryPrices.find((price) => {
      const priceName = (price.model_name || '').toLowerCase();
      return priceName === normalizedId || priceName === normalizedName;
    });

    return matchingPrice?.cost ?? null;
  }, [prices, selectedModelId, selectedModelName]);
  const hasInsufficientCredits = Boolean(
    user &&
    computedCost !== null &&
    typeof user.balance === 'number' &&
    user.balance < computedCost
  );

  const readyToGenerate = useMemo(() => {
    if (tab === 'music') return Boolean(sunoPrompt.trim());
    if (modelObj.type === 'text-to-speech') return Boolean(prompt.trim());
    return dialogues.every((line) => line.text.trim());
  }, [dialogues, modelObj.type, prompt, sunoPrompt, tab]);

  const sunoIntensityDescriptor = useMemo(() => {
    if (sunoIntensity < 20) return 'delicate, airy, restrained dynamics';
    if (sunoIntensity < 40) return 'smooth, mellow, soft pulse';
    if (sunoIntensity < 60) return 'balanced, polished, moderate energy';
    if (sunoIntensity < 80) return 'driving, punchy, high-energy arrangement';
    return 'explosive, festival-sized, maximum impact';
  }, [sunoIntensity]);

  const focusComposer = () => {
    setMobileSettingsOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyExample = (example: AudioExample) => {
    if (example.mode === 'music') {
      setTab('music');
      setSunoModel(SUNO_MODEL_IDS[0]);
      setSunoPrompt(example.prompt);
      setSunoStyle('');
      setSunoIntensity(64);
    } else if (example.mode === 'dialogue') {
      const dialogueModel = AUDIO_MODELS.find((model) => model.type === 'text-to-dialogue');
      if (dialogueModel) setModelObj(dialogueModel);
      setTab('tts');
      setDialogues(example.dialogues && example.dialogues.length ? example.dialogues : DEFAULT_DIALOGUE);
      setPrompt('');
    } else {
      setTab('tts');
      setModelObj(AUDIO_MODELS[0]);
      setPrompt(example.prompt);
      setVoice(example.voice || VOICES[0].value);
    }

    focusComposer();
  };

  const applyMusicPreset = ({
    modelId,
    title,
    prompt: nextPrompt,
    style,
    instrumental,
    intensity,
  }: {
    modelId: string;
    title: string;
    prompt: string;
    style: string;
    instrumental: boolean;
    intensity: number;
  }) => {
    setTab('music');
    setSunoModel(SUNO_MODEL_IDS.find((model) => model.id === modelId) || SUNO_MODEL_IDS[0]);
    setSunoTitle(title);
    setSunoPrompt(nextPrompt);
    setSunoStyle(style);
    setSunoInstrumental(instrumental);
    setSunoIntensity(intensity);
    focusComposer();
  };

  const applyTtsPreset = ({
    modelId,
    prompt: nextPrompt,
    voice: nextVoice,
  }: {
    modelId: string;
    prompt: string;
    voice: string;
  }) => {
    setTab('tts');
    setModelObj(AUDIO_MODELS.find((model) => model.id === modelId) || AUDIO_MODELS[0]);
    setVoice(nextVoice);
    setPrompt(nextPrompt);
    setDialogues(DEFAULT_DIALOGUE);
    focusComposer();
  };

  const applyDialoguePreset = ({
    modelId,
    dialogues: nextDialogues,
  }: {
    modelId: string;
    dialogues: DialogueLine[];
  }) => {
    setTab('tts');
    setModelObj(
      AUDIO_MODELS.find((model) => model.id === modelId && model.type === 'text-to-dialogue') ||
        AUDIO_MODELS.find((model) => model.type === 'text-to-dialogue') ||
        AUDIO_MODELS[0]
    );
    setDialogues(nextDialogues);
    setPrompt('');
    focusComposer();
  };

  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    const queryModel = searchParams.get('model');
    const decodedPrompt = queryPrompt ? decodeURIComponent(queryPrompt) : '';
    const decodedModel = queryModel ? decodeURIComponent(queryModel) : '';

    const matchedAudioModel = AUDIO_MODELS.find((model) => model.id === decodedModel);
    const matchedMusicModel = SUNO_MODEL_IDS.find((model) => model.id === decodedModel);

    if (matchedMusicModel) {
      setTab('music');
      setSunoModel(matchedMusicModel);
      if (decodedPrompt) setSunoPrompt(decodedPrompt);
      return;
    }

    if (matchedAudioModel) {
      setTab('tts');
      setModelObj(matchedAudioModel);
      if (matchedAudioModel.type === 'text-to-dialogue' && decodedPrompt) {
        setDialogues([{ voice: VOICES[0].value, text: decodedPrompt }]);
      } else if (decodedPrompt) {
        setPrompt(decodedPrompt);
      }
      return;
    }

    if (decodedPrompt) {
      setPrompt(decodedPrompt);
      setSunoPrompt(decodedPrompt);
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    setMobileSettingsOpen(false);

    if (hasInsufficientCredits) {
      toast.error(
        locale === 'ru'
          ? `Недостаточно кредитов. Нужно ${computedCost}, доступно ${user?.balance ?? 0}.`
          : `Not enough credits. ${computedCost} required, ${user?.balance ?? 0} available.`
      );
      return;
    }

    if (tab === 'music') {
      if (!sunoPrompt.trim()) return toast.error(t('error_prompt'));
    } else {
      if (modelObj.type === 'text-to-speech' && !prompt.trim()) return toast.error(t('error_prompt'));
      if (modelObj.type === 'text-to-dialogue' && dialogues.some((line) => !line.text.trim())) return toast.error(t('error_dialogue'));
    }

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    try {
      if (tab === 'music') {
        const promptIssue = getPromptSafetyIssue(sunoPrompt.trim(), locale);
        if (promptIssue) {
          throw new Error(`${promptIssue.message} ${promptIssue.suggestion}`.trim());
        }
        const combinedStyle = [sunoStyle.trim(), sunoIntensityDescriptor].filter(Boolean).join(', ');
        const response = await apiClient.post('/ai/generate', {
          category: 'audio',
          model: sunoModel.id,
          duration: 15,
          inputs: {
            prompt: sunoPrompt,
            instrumental: sunoInstrumental,
            ...(combinedStyle ? { style: combinedStyle } : {}),
            ...(sunoTitle.trim() ? { title: sunoTitle.trim() } : {}),
          },
          is_public: isPublic,
        });
        trackGeneration({ taskId: response.data.task_id, category: 'audio', startedAt: Date.now() });
      } else {
        const inputs: Record<string, unknown> = {};
        if (modelObj.type === 'text-to-speech') {
          const promptIssue = getPromptSafetyIssue(prompt.trim(), locale);
          if (promptIssue) {
            throw new Error(`${promptIssue.message} ${promptIssue.suggestion}`.trim());
          }
          inputs.text = prompt;
          inputs.voice = voice;
        } else {
          for (const line of dialogues) {
            const promptIssue = getPromptSafetyIssue(String(line.text || '').trim(), locale);
            if (promptIssue) {
              throw new Error(`${promptIssue.message} ${promptIssue.suggestion}`.trim());
            }
          }
          inputs.dialogue = dialogues;
        }

        const response = await apiClient.post('/ai/generate', {
          category: 'audio',
          model: modelObj.id,
          inputs,
          is_public: isPublic,
        });
        trackGeneration({ taskId: response.data.task_id, category: 'audio', startedAt: Date.now() });
      }
      toast.success(alertsT('queued_title'), { description: alertsT('queued_desc') });
    } catch (error: unknown) {
      const message = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      toast.error(localizeProviderError(message, locale) || t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] overflow-hidden md:h-auto md:items-start md:overflow-visible">
      <AudioWorkspacePanelLazy
        t={t}
        locale={locale}
        tab={tab}
        modelObj={modelObj}
        sunoModel={sunoModel}
        prompt={prompt}
        sunoPrompt={sunoPrompt}
        sunoInstrumental={sunoInstrumental}
        sunoStyle={sunoStyle}
        sunoIntensity={sunoIntensity}
        sunoIntensityDescriptor={sunoIntensityDescriptor}
        sunoTitle={sunoTitle}
        voice={voice}
        dialogues={dialogues}
        isPublic={isPublic}
        loading={loading}
        mobileSettingsOpen={mobileSettingsOpen}
        computedCost={computedCost}
        hasInsufficientCredits={hasInsufficientCredits}
        readyToGenerate={readyToGenerate}
        userBalance={user?.balance}
        selectedModelName={selectedModelName}
        selectedModelGuide={selectedModelGuide}
        onCloseMobileSettings={() => setMobileSettingsOpen(false)}
        onOpenMobileSettings={() => setMobileSettingsOpen(true)}
        onSetTab={setTab}
        onSetModelObj={setModelObj}
        onSetSunoModel={setSunoModel}
        onSetPrompt={setPrompt}
        onSetSunoPrompt={setSunoPrompt}
        onSetSunoInstrumental={setSunoInstrumental}
        onSetSunoStyle={setSunoStyle}
        onSetSunoIntensity={setSunoIntensity}
        onSetSunoTitle={setSunoTitle}
        onSetVoice={setVoice}
        onSetDialogues={setDialogues}
        onSetIsPublic={setIsPublic}
        onGenerate={handleGenerate}
      />

      <main className="flex-1 overflow-y-auto px-3 pb-24 pt-[4.5rem] sm:px-4 md:px-6 md:pb-8 md:pt-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <AudioShowcasePanelLazy
            featuredAudio={featuredAudio}
            onApplyMusicPreset={applyMusicPreset}
            onApplyTtsPreset={applyTtsPreset}
            onApplyDialoguePreset={applyDialoguePreset}
            onApplyExample={applyExample}
          />
        </div>
      </main>

      <AuthRequiredModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

export default function AudioAITool() {
  return (
    <Suspense fallback={null}>
      <AudioAIToolContent />
    </Suspense>
  );
}
