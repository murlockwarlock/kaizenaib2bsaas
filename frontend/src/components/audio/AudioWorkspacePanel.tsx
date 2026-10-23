'use client';

import React from 'react';
import { AudioWaveform, ChevronLeft, Globe, Loader2, Plus, Settings2, Sparkles, Trash2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Switch from '@/components/ui/switch';
import ElasticSlider from '@/components/ui/elastic-slider';
import ModelGuideInline from '@/components/ui/model-guide-inline';
import type { SupportedLocale } from '@/lib/model-presenter';
import {
  AUDIO_MODELS,
  DEFAULT_DIALOGUE,
  SUNO_MODEL_IDS,
  VOICES,
  type AudioModel,
  type DialogueLine,
  type SunoModel,
} from './audio-tool-config';

type SelectedModelGuide = {
  title: string;
  summary: string;
  bestFor: string;
  workflow: string;
};

type AudioWorkspacePanelProps = {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  locale: SupportedLocale;
  tab: 'tts' | 'music';
  modelObj: AudioModel;
  sunoModel: SunoModel;
  prompt: string;
  sunoPrompt: string;
  sunoInstrumental: boolean;
  sunoStyle: string;
  sunoIntensity: number;
  sunoIntensityDescriptor: string;
  sunoTitle: string;
  voice: string;
  dialogues: DialogueLine[];
  isPublic: boolean;
  loading: boolean;
  mobileSettingsOpen: boolean;
  computedCost: number | null;
  hasInsufficientCredits: boolean;
  readyToGenerate: boolean;
  userBalance?: number;
  selectedModelName: string;
  selectedModelGuide: SelectedModelGuide;
  onCloseMobileSettings: () => void;
  onOpenMobileSettings: () => void;
  onSetTab: (value: 'tts' | 'music') => void;
  onSetModelObj: (value: AudioModel) => void;
  onSetSunoModel: (value: SunoModel) => void;
  onSetPrompt: (value: string) => void;
  onSetSunoPrompt: (value: string) => void;
  onSetSunoInstrumental: (value: boolean) => void;
  onSetSunoStyle: (value: string) => void;
  onSetSunoIntensity: (value: number) => void;
  onSetSunoTitle: (value: string) => void;
  onSetVoice: (value: string) => void;
  onSetDialogues: (value: DialogueLine[]) => void;
  onSetIsPublic: (value: boolean) => void;
  onGenerate: () => void;
};

export default function AudioWorkspacePanel({
  t,
  locale,
  tab,
  modelObj,
  sunoModel,
  prompt,
  sunoPrompt,
  sunoInstrumental,
  sunoStyle,
  sunoIntensity,
  sunoIntensityDescriptor,
  sunoTitle,
  voice,
  dialogues,
  isPublic,
  loading,
  mobileSettingsOpen,
  computedCost,
  hasInsufficientCredits,
  readyToGenerate,
  userBalance,
  selectedModelName,
  selectedModelGuide,
  onCloseMobileSettings,
  onOpenMobileSettings,
  onSetTab,
  onSetModelObj,
  onSetSunoModel,
  onSetPrompt,
  onSetSunoPrompt,
  onSetSunoInstrumental,
  onSetSunoStyle,
  onSetSunoIntensity,
  onSetSunoTitle,
  onSetVoice,
  onSetDialogues,
  onSetIsPublic,
  onGenerate,
}: AudioWorkspacePanelProps) {
  return (
    <>
      {mobileSettingsOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" onClick={onCloseMobileSettings} />
      )}

      <aside className={`${mobileSettingsOpen ? 'flex' : 'hidden'} panel-surface-strong fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] w-full flex-col rounded-t-[2rem] border-t border-white/10 sm:mx-auto sm:max-w-[34rem] md:sticky md:top-5 md:z-20 md:flex md:h-auto md:max-h-none md:w-[42rem] lg:w-[44rem] md:max-w-none md:rounded-[2rem] md:border md:border-white/8`}>
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[#ffd166]" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-300">{t('options')}</h3>
          </div>
          <button onClick={onCloseMobileSettings} className="rounded-xl border border-white/8 bg-white/[0.04] p-1.5 text-zinc-400 transition-colors hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:overflow-visible md:p-6">
          <div className="mb-5 hidden items-center gap-2 md:flex">
            <Settings2 className="h-4 w-4 text-[#ffd166]" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-300">{t('options')}</h2>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-1.5">
            <button
              onClick={() => onSetTab('tts')}
              className={`rounded-[1.1rem] px-4 py-3 text-sm font-semibold transition-all ${tab === 'tts' ? 'bg-[linear-gradient(135deg,rgba(255,107,74,0.18),rgba(34,199,184,0.14))] text-white shadow-[0_14px_32px_rgba(0,0,0,0.22)]' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {t('tab_tts')}
            </button>
            <button
              onClick={() => onSetTab('music')}
              className={`rounded-[1.1rem] px-4 py-3 text-sm font-semibold transition-all ${tab === 'music' ? 'bg-[linear-gradient(135deg,rgba(255,107,74,0.18),rgba(34,199,184,0.14))] text-white shadow-[0_14px_32px_rgba(0,0,0,0.22)]' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {t('tab_music')}
            </button>
          </div>

          <div className="space-y-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {tab === 'tts' ? (
              <>
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('model')}</label>
                  <div className="space-y-2">
                    {AUDIO_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => onSetModelObj(model)}
                        className={`flex w-full items-center justify-between rounded-[1.15rem] border px-3.5 py-3 text-left text-sm transition-all ${modelObj.id === model.id ? 'border-white/12 bg-[linear-gradient(135deg,rgba(255,107,74,0.18),rgba(34,199,184,0.14))] text-white' : 'border-white/6 bg-black/10 text-zinc-400 hover:border-white/10 hover:text-white'}`}
                      >
                        <span className="truncate">{model.name}</span>
                        {modelObj.id === model.id && <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <ModelGuideInline
                      title={selectedModelGuide.title}
                      summary={selectedModelGuide.summary}
                      bestFor={selectedModelGuide.bestFor}
                      workflow={selectedModelGuide.workflow}
                      badgeLabel={t('guide_badge')}
                      bestForLabel={t('guide_best_for')}
                      workflowLabel={t('guide_how_to_use')}
                      expandLabel={t('guide_expand')}
                      collapseLabel={t('guide_collapse')}
                      accentClassName="border-[#ffd166]/20 bg-[#ffd166]/[0.06]"
                      defaultExpanded={true}
                      collapsible={false}
                    />
                  </div>
                </div>

                {modelObj.type === 'text-to-speech' ? (
                  <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('voice')}</label>
                    <div className="relative mb-4">
                      <select
                        value={voice}
                        onChange={(event) => onSetVoice(event.target.value)}
                        className="w-full appearance-none rounded-[1.1rem] border border-white/8 bg-black/15 p-3 text-sm text-zinc-200 outline-none transition-colors focus:border-white/16"
                      >
                        {VOICES.map((voiceOption) => (
                          <option key={voiceOption.value} value={voiceOption.value}>{voiceOption.label}</option>
                        ))}
                      </select>
                      <ChevronLeft className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 -rotate-90 text-zinc-500" />
                    </div>

                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('prompt')}</label>
                    <textarea
                      placeholder={t('prompt_placeholder')}
                      value={prompt}
                      onChange={(event) => onSetPrompt(event.target.value)}
                      className="h-36 w-full resize-none rounded-[1.2rem] border border-white/8 bg-black/15 p-4 text-sm leading-relaxed text-white outline-none transition-colors focus:border-white/16"
                    />
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('dialogues')}</label>
                    <div className="space-y-3">
                      {dialogues.map((line, index) => (
                        <div key={`${line.voice}-${index}`} className="relative rounded-[1.2rem] border border-white/8 bg-black/15 p-3">
                          <select
                            value={line.voice}
                            onChange={(event) => {
                              const nextDialogues = [...dialogues];
                              nextDialogues[index].voice = event.target.value;
                              onSetDialogues(nextDialogues);
                            }}
                            className="mb-2 w-full rounded-[0.95rem] border border-white/8 bg-black/20 p-2.5 text-xs text-zinc-200 outline-none transition-colors focus:border-white/16"
                          >
                            {VOICES.map((voiceOption) => (
                              <option key={voiceOption.value} value={voiceOption.value}>{voiceOption.label}</option>
                            ))}
                          </select>
                          <textarea
                            placeholder={t('speaker_text', { num: index + 1 })}
                            value={line.text}
                            onChange={(event) => {
                              const nextDialogues = [...dialogues];
                              nextDialogues[index].text = event.target.value;
                              onSetDialogues(nextDialogues);
                            }}
                            className="h-20 w-full resize-none rounded-[0.95rem] border border-white/8 bg-black/20 p-3 text-sm text-white outline-none transition-colors focus:border-white/16"
                          />
                          {dialogues.length > 1 && (
                            <button
                              onClick={() => onSetDialogues(dialogues.filter((_, dialogueIndex) => dialogueIndex !== index))}
                              className="absolute right-3 top-3 rounded-xl border border-red-500/20 bg-red-500/10 p-1.5 text-red-300 transition-colors hover:bg-red-500/16"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => onSetDialogues([...dialogues, { voice: VOICES[0].value, text: '' }])}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.03] py-3 text-sm font-medium text-zinc-400 transition-all hover:border-white/18 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                      {t('add_line')}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-4 rounded-[1.35rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,107,74,0.14),rgba(34,199,184,0.12))] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('music_generation')}</div>
                        <div className="mt-2 text-lg font-semibold text-white">{selectedModelName}</div>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/15">
                        <AudioWaveform className="h-5 w-5 text-[#ffd166]" />
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                      {sunoPrompt.trim() || t('music_prompt_placeholder')}
                    </p>
                  </div>

                  <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('model')}</label>
                  <div className="space-y-2">
                    {SUNO_MODEL_IDS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => onSetSunoModel(model)}
                        className={`w-full rounded-[1.15rem] border px-3.5 py-3 text-left transition-all ${sunoModel.id === model.id ? 'border-white/12 bg-[linear-gradient(135deg,rgba(255,107,74,0.18),rgba(34,199,184,0.14))] text-white' : 'border-white/6 bg-black/10 text-zinc-400 hover:border-white/10 hover:text-white'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">{model.name}</span>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{t(model.descKey)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <ModelGuideInline
                      title={selectedModelGuide.title}
                      summary={selectedModelGuide.summary}
                      bestFor={selectedModelGuide.bestFor}
                      workflow={selectedModelGuide.workflow}
                      badgeLabel={t('guide_badge')}
                      bestForLabel={t('guide_best_for')}
                      workflowLabel={t('guide_how_to_use')}
                      expandLabel={t('guide_expand')}
                      collapseLabel={t('guide_collapse')}
                      accentClassName="border-[#ffd166]/20 bg-[#ffd166]/[0.06]"
                      defaultExpanded={true}
                      collapsible={false}
                    />
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('music_title')}</label>
                      <input
                        type="text"
                        placeholder={t('music_title_placeholder')}
                        value={sunoTitle}
                        onChange={(event) => onSetSunoTitle(event.target.value)}
                        className="w-full rounded-[1.1rem] border border-white/8 bg-black/15 p-3 text-sm text-white outline-none transition-colors focus:border-white/16"
                      />
                    </div>
                    <div>
                      <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('music_prompt')}</label>
                      <textarea
                        placeholder={t('music_prompt_placeholder')}
                        value={sunoPrompt}
                        onChange={(event) => onSetSunoPrompt(event.target.value)}
                        className="h-32 w-full resize-none rounded-[1.2rem] border border-white/8 bg-black/15 p-4 text-sm leading-relaxed text-white outline-none transition-colors focus:border-white/16"
                      />
                    </div>
                    <div>
                      <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('music_style')}</label>
                      <input
                        type="text"
                        placeholder={t('music_style_placeholder')}
                        value={sunoStyle}
                        onChange={(event) => onSetSunoStyle(event.target.value)}
                        className="w-full rounded-[1.1rem] border border-white/8 bg-black/15 p-3 text-sm text-white outline-none transition-colors focus:border-white/16"
                      />
                    </div>
                    <div className="rounded-[1.15rem] border border-white/8 bg-black/10 px-3.5 py-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('music_intensity')}</div>
                          <p className="mt-1 text-sm text-zinc-300">{sunoIntensityDescriptor}</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                          {sunoIntensity}
                        </div>
                      </div>
                      <ElasticSlider
                        value={sunoIntensity}
                        onChange={onSetSunoIntensity}
                        minValue={0}
                        maxValue={100}
                        stepSize={1}
                        isStepped={false}
                        showValue={false}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-white/8 bg-black/10 px-3.5 py-3">
                      <span className="text-sm text-zinc-300">{t('music_instrumental')}</span>
                      <Switch
                        checked={sunoInstrumental}
                        onCheckedChange={onSetSunoInstrumental}
                        accentClassName="bg-[linear-gradient(135deg,#22c7b8,#58e4d7)]"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 md:col-span-2">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-white/8 bg-black/10 px-3.5 py-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <Globe className="h-4 w-4 text-[#22c7b8]" />
                          {t('make_public')}
                        </div>
                      </div>
                      <Switch
                        checked={isPublic}
                        onCheckedChange={onSetIsPublic}
                        accentClassName="bg-[linear-gradient(135deg,#22c7b8,#58e4d7)]"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="border-white/10 bg-[#0d1117] text-zinc-300">
                    <p className="text-xs">{t('make_public_tooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 px-5 py-5 md:px-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{t('cost')}</span>
            <div className="accent-pill rounded-full px-3 py-1.5 text-xs font-semibold text-white">
              {computedCost !== null ? computedCost : '—'} {t('credits')}
            </div>
          </div>
          {hasInsufficientCredits ? (
            <div className="mb-4 text-sm font-medium text-rose-300">
              {locale === 'ru'
                ? `Недостаточно кредитов: ${userBalance ?? 0} из ${computedCost ?? '—'}`
                : `Not enough credits: ${userBalance ?? 0} of ${computedCost ?? '—'}`}
            </div>
          ) : null}
          <button
            onClick={onGenerate}
            disabled={loading || !readyToGenerate || hasInsufficientCredits}
            className="relative w-full overflow-hidden rounded-[1.3rem] bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-5 py-4 text-sm font-bold text-white shadow-[0_22px_48px_rgba(255,107,74,0.22)] transition-all hover:translate-y-[-1px] hover:shadow-[0_28px_64px_rgba(255,107,74,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {t('generate')}
                </>
              )}
            </span>
          </button>
        </div>
      </aside>

      <button
        onClick={onOpenMobileSettings}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,#ff6b4a,#ff8d68_42%,#22c7b8)] px-4 py-3 text-sm font-bold text-white shadow-[0_22px_44px_rgba(255,107,74,0.26)] transition-all active:scale-95 sm:bottom-6 sm:right-6 sm:px-5 sm:py-3.5 md:hidden"
      >
        <Sparkles className="h-4 w-4" />
        {t('generate')}
      </button>
    </>
  );
}
