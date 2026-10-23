'use client';

import Image from 'next/image';
import {
  ChevronDown,
  Clapperboard,
  Film,
  Link2,
  Loader2,
  Music2,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Volume2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { UploadSlot, VideoFamilyId, VideoModelDefinition } from '@/lib/video-models';

type ShotItem = { prompt: string; duration: number };
type StoryboardShot = { Scene: string; duration: number };

function framePreviewClass(ratio: string) {
  if (ratio === '9:16' || ratio === 'portrait') return 'h-9 w-5';
  if (ratio === '1:1') return 'h-7 w-7';
  return 'h-5 w-9';
}

function formatAspectRatioLabel(ratio: string, locale: 'ru' | 'en') {
  if (ratio === 'portrait') return locale === 'ru' ? 'Вертикальный' : 'Portrait';
  if (ratio === 'landscape') return locale === 'ru' ? 'Горизонтальный' : 'Landscape';
  return ratio;
}

function getUploadAccept(kind: UploadSlot['kind']) {
  if (kind === 'audio') return 'audio/*';
  if (kind === 'video') return 'video/*';
  return 'image/*';
}

function FieldIntro({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-2.5">
      <div className="text-sm font-medium text-white">{title}</div>
      {description ? <div className="mt-1 text-xs leading-5 text-zinc-500">{description}</div> : null}
    </div>
  );
}

function UploadField({
  slot,
  urls,
  uploading,
  onPick,
  onRemove,
  locale,
}: {
  slot: UploadSlot;
  urls: string[];
  uploading: boolean;
  onPick: (file: File) => void;
  onRemove: (index: number) => void;
  locale: 'ru' | 'en';
}) {
  const isImageSlot = slot.kind === 'image';

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{slot.label}</h3>
          <p className="mt-1 text-xs text-zinc-500">{slot.help}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {slot.kind}
        </span>
      </div>

      <label className="flex min-h-28 w-full cursor-pointer items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06]">
        <input
          type="file"
          className="hidden"
          accept={getUploadAccept(slot.kind)}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = '';
          }}
          disabled={uploading || urls.length >= slot.maxFiles}
        />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            ) : slot.kind === 'audio' ? (
              <Music2 className="h-5 w-5 text-cyan-300" />
            ) : slot.kind === 'video' ? (
              <Film className="h-5 w-5 text-cyan-300" />
            ) : (
              <Upload className="h-5 w-5 text-cyan-300" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {locale === 'ru' ? 'Загрузить файл' : 'Upload file'}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {urls.length >= slot.maxFiles
                ? locale === 'ru'
                  ? 'Лимит достигнут'
                  : 'Limit reached'
                : locale === 'ru'
                  ? `До ${slot.maxFiles} файла`
                  : `Up to ${slot.maxFiles} file${slot.maxFiles > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </label>

      {urls.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {urls.map((url, index) => (
            <div
              key={`${slot.key}-${url}-${index}`}
              className="overflow-hidden rounded-[1.15rem] border border-white/10 bg-black/30"
            >
              {isImageSlot ? (
                <div className="relative aspect-video">
                  <Image
                    src={url}
                    alt={slot.label}
                    fill
                    unoptimized
                    loader={({ src }) => src}
                    sizes="(max-width: 1280px) 100vw, 640px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6">
                    {slot.kind === 'audio' ? (
                      <Volume2 className="h-4 w-4 text-cyan-300" />
                    ) : (
                      <Film className="h-4 w-4 text-cyan-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {url.split('/').pop()}
                    </div>
                    <div className="truncate text-xs text-zinc-500">{url}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                <span className="text-xs text-zinc-500">{slot.label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.06]"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-1 text-xs text-zinc-500">{description}</div>
      </div>
      <div className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-cyan-400' : 'bg-zinc-700')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </div>
    </button>
  );
}

function ShotEditor({
  title,
  description,
  shots,
  onChange,
  sceneLabel,
  storyboard,
}: {
  title: string;
  description: string;
  shots: StoryboardShot[] | ShotItem[];
  onChange: (shots: StoryboardShot[] | ShotItem[]) => void;
  sceneLabel: string;
  storyboard: boolean;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange(
              storyboard
                ? ([...(shots as StoryboardShot[]), { Scene: '', duration: 3 }] as StoryboardShot[])
                : ([...(shots as ShotItem[]), { prompt: '', duration: 3 }] as ShotItem[])
            )
          }
          className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200"
        >
          +
        </button>
      </div>

      <div className="space-y-3">
        {shots.map((shot, index) => (
          <div key={index} className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_auto]">
              <textarea
                value={'Scene' in shot ? shot.Scene : shot.prompt}
                onChange={(event) => {
                  if (storyboard) {
                    const next = [...(shots as StoryboardShot[])];
                    next[index] = { ...(shot as StoryboardShot), Scene: event.target.value };
                    onChange(next);
                  } else {
                    const next = [...(shots as ShotItem[])];
                    next[index] = { ...(shot as ShotItem), prompt: event.target.value };
                    onChange(next);
                  }
                }}
                placeholder={sceneLabel}
                className="min-h-24 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40"
              />
              <input
                type="number"
                min="0.1"
                max="15"
                step="0.1"
                value={shot.duration}
                onChange={(event) => {
                  const nextDuration = parseFloat(event.target.value || '0');
                  if (storyboard) {
                    const next = [...(shots as StoryboardShot[])];
                    next[index] = { ...(shot as StoryboardShot), duration: Number.isFinite(nextDuration) ? nextDuration : shot.duration };
                    onChange(next);
                  } else {
                    const next = [...(shots as ShotItem[])];
                    next[index] = { ...(shot as ShotItem), duration: Number.isFinite(nextDuration) ? nextDuration : shot.duration };
                    onChange(next);
                  }
                }}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
              />
              <button
                type="button"
                onClick={() =>
                  onChange(
                    storyboard
                      ? (shots.filter((_, shotIndex) => shotIndex !== index) as StoryboardShot[])
                      : (shots.filter((_, shotIndex) => shotIndex !== index) as ShotItem[])
                  )
                }
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-red-300 transition hover:bg-red-500/20"
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type VideoWorkspacePanelProps = {
  locale: 'ru' | 'en';
  family: VideoFamilyId;
  families: Array<{ id: VideoFamilyId; label: string }>;
  model: VideoModelDefinition;
  visibleModels: VideoModelDefinition[];
  prompt: string;
  promptVisible: boolean;
  uploads: Record<string, string[]>;
  uploadingKey: string | null;
  videoUrl: string;
  storyboardShots: StoryboardShot[];
  multiShots: boolean;
  multiPromptShots: ShotItem[];
  hasOutputSettings: boolean;
  hasResolutionChoice: boolean;
  hasAspectRatioChoice: boolean;
  hasDurationChoice: boolean;
  hasFrameChoice: boolean;
  hasModeChoice: boolean;
  hasAccelerationChoice: boolean;
  hasSizeChoice: boolean;
  hasAdvancedFields: boolean;
  advancedOpen: boolean;
  resolution: string;
  aspectRatio: string;
  duration: number;
  mode: string;
  acceleration: string;
  frameCount: number;
  size: string;
  sound: boolean;
  isPublic: boolean;
  negativePrompt: string;
  cfgScale: string;
  seed: string;
  cameraFixed: boolean;
  fixedLens: boolean;
  generateAudio: boolean;
  safetyChecker: boolean;
  promptOptimizer: boolean;
  enablePromptExpansion: boolean;
  audioFlag: boolean;
  removeWatermark: boolean;
  numFrames: string;
  framesPerSecond: string;
  guidanceScale: string;
  inferenceSteps: string;
  shift: string;
  watermarkText: string;
  characterIdsText: string;
  originTaskId: string;
  timestamps: string;
  characterUserName: string;
  characterPrompt: string;
  safetyInstruction: string;
  klingElementsText: string;
  computedCost: number | null;
  hasInsufficientCredits: boolean;
  userBalance: number;
  referenceCount: number;
  hasReferenceInputs: boolean;
  loading: boolean;
  onSelectFamily: (family: VideoFamilyId) => void;
  onSelectModel: (model: VideoModelDefinition) => void;
  onPromptChange: (value: string) => void;
  onPickUpload: (slotKey: string, file: File, maxFiles: number) => void;
  onRemoveUpload: (slotKey: string, index: number) => void;
  onVideoUrlChange: (value: string) => void;
  onStoryboardShotsChange: (shots: StoryboardShot[]) => void;
  onMultiShotsChange: (value: boolean) => void;
  onMultiPromptShotsChange: (shots: ShotItem[]) => void;
  onResolutionChange: (value: string) => void;
  onAspectRatioChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onModeChange: (value: string) => void;
  onAccelerationChange: (value: string) => void;
  onFrameCountChange: (value: number) => void;
  onSizeChange: (value: string) => void;
  onSoundChange: (value: boolean) => void;
  onPublicChange: (value: boolean) => void;
  onAdvancedOpenChange: (value: boolean) => void;
  onNegativePromptChange: (value: string) => void;
  onCfgScaleChange: (value: string) => void;
  onSeedChange: (value: string) => void;
  onCameraFixedChange: (value: boolean) => void;
  onFixedLensChange: (value: boolean) => void;
  onGenerateAudioChange: (value: boolean) => void;
  onSafetyCheckerChange: (value: boolean) => void;
  onPromptOptimizerChange: (value: boolean) => void;
  onEnablePromptExpansionChange: (value: boolean) => void;
  onAudioFlagChange: (value: boolean) => void;
  onRemoveWatermarkChange: (value: boolean) => void;
  onNumFramesChange: (value: string) => void;
  onFramesPerSecondChange: (value: string) => void;
  onGuidanceScaleChange: (value: string) => void;
  onInferenceStepsChange: (value: string) => void;
  onShiftChange: (value: string) => void;
  onWatermarkTextChange: (value: string) => void;
  onCharacterIdsTextChange: (value: string) => void;
  onOriginTaskIdChange: (value: string) => void;
  onTimestampsChange: (value: string) => void;
  onCharacterUserNameChange: (value: string) => void;
  onCharacterPromptChange: (value: string) => void;
  onSafetyInstructionChange: (value: string) => void;
  onKlingElementsTextChange: (value: string) => void;
  onGenerate: () => void;
};

export default function VideoWorkspacePanel(props: VideoWorkspacePanelProps) {
  const t = useTranslations('Video');
  const {
    locale,
    family,
    families,
    model,
    visibleModels,
    prompt,
    promptVisible,
    uploads,
    uploadingKey,
    videoUrl,
    storyboardShots,
    multiShots,
    multiPromptShots,
    hasOutputSettings,
    hasResolutionChoice,
    hasAspectRatioChoice,
    hasDurationChoice,
    hasFrameChoice,
    hasModeChoice,
    hasAccelerationChoice,
    hasSizeChoice,
    hasAdvancedFields,
    advancedOpen,
    resolution,
    aspectRatio,
    duration,
    mode,
    acceleration,
    frameCount,
    size,
    sound,
    isPublic,
    negativePrompt,
    cfgScale,
    seed,
    cameraFixed,
    fixedLens,
    generateAudio,
    safetyChecker,
    promptOptimizer,
    enablePromptExpansion,
    audioFlag,
    removeWatermark,
    numFrames,
    framesPerSecond,
    guidanceScale,
    inferenceSteps,
    shift,
    watermarkText,
    characterIdsText,
    originTaskId,
    timestamps,
    characterUserName,
    characterPrompt,
    safetyInstruction,
    klingElementsText,
    computedCost,
    hasInsufficientCredits,
    userBalance,
    referenceCount,
    hasReferenceInputs,
    loading,
    onSelectFamily,
    onSelectModel,
    onPromptChange,
    onPickUpload,
    onRemoveUpload,
    onVideoUrlChange,
    onStoryboardShotsChange,
    onMultiShotsChange,
    onMultiPromptShotsChange,
    onResolutionChange,
    onAspectRatioChange,
    onDurationChange,
    onModeChange,
    onAccelerationChange,
    onFrameCountChange,
    onSizeChange,
    onSoundChange,
    onPublicChange,
    onAdvancedOpenChange,
    onNegativePromptChange,
    onCfgScaleChange,
    onSeedChange,
    onCameraFixedChange,
    onFixedLensChange,
    onGenerateAudioChange,
    onSafetyCheckerChange,
    onPromptOptimizerChange,
    onEnablePromptExpansionChange,
    onAudioFlagChange,
    onRemoveWatermarkChange,
    onNumFramesChange,
    onFramesPerSecondChange,
    onGuidanceScaleChange,
    onInferenceStepsChange,
    onShiftChange,
    onWatermarkTextChange,
    onCharacterIdsTextChange,
    onOriginTaskIdChange,
    onTimestampsChange,
    onCharacterUserNameChange,
    onCharacterPromptChange,
    onSafetyInstructionChange,
    onKlingElementsTextChange,
    onGenerate,
  } = props;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6 xl:px-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.4rem] bg-cyan-400/10 text-cyan-300">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">{t('workspace_badge')}</div>
            <h1 className="text-2xl font-semibold text-white">{t('title')}</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-zinc-400">{t('description')}</p>
      </div>

      <div className="flex-1 px-5 py-5 sm:px-6 xl:px-8">
        <div className="space-y-5 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 xl:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              <Clapperboard className="h-4 w-4" />
              {t('model_family')}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {families.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectFamily(item.id)}
                  className={cn(
                    'whitespace-nowrap rounded-full px-4 py-2 text-sm transition',
                    family === item.id
                      ? 'bg-cyan-400 text-black'
                      : 'border border-white/10 bg-black/20 text-zinc-300 hover:border-cyan-400/30 hover:text-white'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 xl:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              <Settings2 className="h-4 w-4" />
              {t('model')}
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {visibleModels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModel(item)}
                  className={cn(
                    'rounded-[1.35rem] border p-4 text-left transition',
                    model.id === item.id
                      ? 'border-cyan-400/40 bg-cyan-400/[0.10] shadow-[0_0_0_1px_rgba(34,211,238,0.12)]'
                      : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">{item.name}</div>
                      <div className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{item.summary[locale]}</div>
                    </div>
                    {model.id === item.id ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
                        <span className="h-2 w-2 rounded-full bg-cyan-300" />
                        {locale === 'ru' ? 'Выбрано' : 'Selected'}
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-cyan-400/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03))] p-5">
            <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">{model.familyLabel[locale]}</div>
            <div className="text-xl font-semibold text-white">{model.name}</div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{model.summary[locale]}</p>
          </section>

          {promptVisible ? (
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                <Sparkles className="h-4 w-4" />
                {t('prompt_label')}
              </div>
              <textarea
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                placeholder={model.promptOptional && !model.promptRequired ? t('prompt_optional_placeholder') : t('placeholder')}
                className="min-h-40 w-full rounded-[1.4rem] border border-white/10 bg-black/30 px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40"
              />
            </section>
          ) : null}

          {(model.uploadSlots || []).map((slot) => (
            <div key={slot.key}>
              <UploadField
                slot={slot}
                urls={uploads[slot.key] || []}
                uploading={uploadingKey === slot.key}
                onPick={(file) => onPickUpload(slot.key, file, slot.maxFiles)}
                onRemove={(index) => onRemoveUpload(slot.key, index)}
                locale={locale}
              />
            </div>
          ))}

          {model.videoUrlInput ? (
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                <Link2 className="h-4 w-4" />
                {t('video_url')}
              </div>
              <input
                value={videoUrl}
                onChange={(event) => onVideoUrlChange(event.target.value)}
                placeholder="https://example.com/video.mp4"
                className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40"
              />
            </section>
          ) : null}

          {model.supportsStoryboardShots ? (
            <ShotEditor
              title={t('storyboard_title')}
              description={t('storyboard_desc')}
              shots={storyboardShots}
              onChange={(shots) => onStoryboardShotsChange(shots as StoryboardShot[])}
              sceneLabel={t('storyboard_scene_placeholder')}
              storyboard={true}
            />
          ) : null}

          {model.supportsMultiShots || model.supportsMultiShotsToggle ? (
            <>
              <div>
                <ToggleRow
                  label={t('multi_shot')}
                  description={t('multi_shot_desc')}
                  checked={multiShots}
                  onChange={() => onMultiShotsChange(!multiShots)}
                />
              </div>
              {model.supportsMultiShots && multiShots ? (
                <ShotEditor
                  title={t('shots_title')}
                  description={t('shots_desc')}
                  shots={multiPromptShots}
                  onChange={(shots) => onMultiPromptShotsChange(shots as ShotItem[])}
                  sceneLabel={t('shot_prompt_placeholder')}
                  storyboard={false}
                />
              ) : null}
            </>
          ) : null}

          {hasOutputSettings ? (
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                <Film className="h-4 w-4" />
                {t('output_settings')}
              </div>

              <div className="space-y-4">
                {hasResolutionChoice ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-white">{t('resolution')}</div>
                    <div className="flex flex-wrap gap-2">
                      {model.resolutions!.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onResolutionChange(value)}
                          className={cn('rounded-full px-4 py-2 text-sm transition', resolution === value ? 'bg-cyan-400 text-black' : 'border border-white/10 bg-black/20 text-zinc-300 hover:border-white/20')}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasAspectRatioChoice ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-white">{t('aspect_ratio')}</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {model.aspectRatios!.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onAspectRatioChange(value)}
                          className={cn('flex items-center gap-3 rounded-[1.2rem] border px-4 py-3 text-left transition', aspectRatio === value ? 'border-cyan-400/40 bg-cyan-400/[0.10]' : 'border-white/10 bg-black/20 hover:border-white/20')}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6">
                            <span className={cn('rounded-md border border-cyan-300/80', framePreviewClass(value))} />
                          </span>
                          <span className="text-sm font-medium text-white">{formatAspectRatioLabel(value, locale)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasDurationChoice ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-white">{t('duration')}</div>
                    <div className="flex flex-wrap gap-2">
                      {model.durationOptions!.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onDurationChange(value)}
                          className={cn('rounded-full px-4 py-2 text-sm transition', duration === value ? 'bg-cyan-400 text-black' : 'border border-white/10 bg-black/20 text-zinc-300 hover:border-white/20')}
                        >
                          {value}s
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasFrameChoice ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-white">{t('frame_count')}</div>
                    <div className="flex flex-wrap gap-2">
                      {model.frameOptions!.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onFrameCountChange(value)}
                          className={cn('rounded-full px-4 py-2 text-sm transition', frameCount === value ? 'bg-cyan-400 text-black' : 'border border-white/10 bg-black/20 text-zinc-300 hover:border-white/20')}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasModeChoice ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-white">{t('mode')}</div>
                    <div className="flex flex-wrap gap-2">
                      {model.modeOptions!.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onModeChange(value)}
                          className={cn('rounded-full px-4 py-2 text-sm transition', mode === value ? 'bg-cyan-400 text-black' : 'border border-white/10 bg-black/20 text-zinc-300 hover:border-white/20')}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasAccelerationChoice ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-white">{t('acceleration')}</div>
                    <div className="flex flex-wrap gap-2">
                      {model.accelerationOptions!.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onAccelerationChange(value)}
                          className={cn('rounded-full px-4 py-2 text-sm transition', acceleration === value ? 'bg-cyan-400 text-black' : 'border border-white/10 bg-black/20 text-zinc-300 hover:border-white/20')}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasSizeChoice ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-white">{t('quality_mode')}</div>
                    <div className="flex flex-wrap gap-2">
                      {model.sizeOptions!.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onSizeChange(value)}
                          className={cn('rounded-full px-4 py-2 text-sm transition', size === value ? 'bg-cyan-400 text-black' : 'border border-white/10 bg-black/20 text-zinc-300 hover:border-white/20')}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {model.supportsSound ? (
                  <ToggleRow label={t('sound')} description={t('sound_desc')} checked={sound} onChange={() => onSoundChange(!sound)} />
                ) : null}
              </div>
            </section>
          ) : null}

          {hasAdvancedFields ? (
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 xl:col-span-2">
              <button type="button" onClick={() => onAdvancedOpenChange(!advancedOpen)} className="flex w-full items-center justify-between">
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{t('advanced')}</div>
                  <div className="mt-1 text-xs text-zinc-500">{t('advanced_desc')}</div>
                </div>
                <ChevronDown className={cn('h-5 w-5 text-zinc-400 transition', advancedOpen && 'rotate-180')} />
              </button>

              {advancedOpen ? (
                <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2">
                  {model.supportsCameraFixed ? <div className="md:col-span-2"><ToggleRow label={t('camera_fixed')} description={t('camera_fixed_desc')} checked={cameraFixed} onChange={() => onCameraFixedChange(!cameraFixed)} /></div> : null}
                  {model.supportsFixedLens ? <div className="md:col-span-2"><ToggleRow label={t('fixed_lens')} description={t('fixed_lens_desc')} checked={fixedLens} onChange={() => onFixedLensChange(!fixedLens)} /></div> : null}
                  {model.supportsGenerateAudio ? <div className="md:col-span-2"><ToggleRow label={t('generate_audio')} description={t('generate_audio_desc')} checked={generateAudio} onChange={() => onGenerateAudioChange(!generateAudio)} /></div> : null}
                  {model.supportsSafetyChecker ? <div className="md:col-span-2"><ToggleRow label={t('safety_checker')} description={t('safety_checker_desc')} checked={safetyChecker} onChange={() => onSafetyCheckerChange(!safetyChecker)} /></div> : null}
                  {model.supportsPromptOptimizer ? <div className="md:col-span-2"><ToggleRow label={t('prompt_optimizer')} description={t('prompt_optimizer_desc')} checked={promptOptimizer} onChange={() => onPromptOptimizerChange(!promptOptimizer)} /></div> : null}
                  {model.supportsEnablePromptExpansion ? <div className="md:col-span-2"><ToggleRow label={t('prompt_expansion')} description={t('prompt_expansion_desc')} checked={enablePromptExpansion} onChange={() => onEnablePromptExpansionChange(!enablePromptExpansion)} /></div> : null}
                  {model.supportsAudioFlag ? <div className="md:col-span-2"><ToggleRow label={t('audio_flag')} description={t('audio_flag_desc')} checked={audioFlag} onChange={() => onAudioFlagChange(!audioFlag)} /></div> : null}
                  {model.supportsRemoveWatermark ? <div className="md:col-span-2"><ToggleRow label={t('remove_watermark')} description={t('remove_watermark_desc')} checked={removeWatermark} onChange={() => onRemoveWatermarkChange(!removeWatermark)} /></div> : null}

                  {model.supportsNegativePrompt ? <div><FieldIntro title={t('negative_prompt')} description={t('negative_prompt_desc')} /><textarea value={negativePrompt} onChange={(event) => onNegativePromptChange(event.target.value)} className="min-h-28 w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" placeholder={t('negative_prompt_placeholder')} /></div> : null}
                  {model.supportsCfgScale ? <div><FieldIntro title={t('cfg_scale')} description={t('cfg_scale_desc')} /><input value={cfgScale} onChange={(event) => onCfgScaleChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" placeholder="0.5" /></div> : null}
                  {model.supportsSeed ? <div><FieldIntro title={t('seed_value')} description={t('seed_value_desc')} /><input value={seed} onChange={(event) => onSeedChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" placeholder="12345" /></div> : null}
                  {model.supportsNumFrames ? <div><FieldIntro title={t('num_frames')} description={t('num_frames_desc')} /><input value={numFrames} onChange={(event) => onNumFramesChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsFramesPerSecond ? <div><FieldIntro title={t('fps')} description={t('fps_desc')} /><input value={framesPerSecond} onChange={(event) => onFramesPerSecondChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsGuidanceScale ? <div><FieldIntro title={t('guidance_scale')} description={t('guidance_scale_desc')} /><input value={guidanceScale} onChange={(event) => onGuidanceScaleChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsInferenceSteps ? <div><FieldIntro title={t('inference_steps')} description={t('inference_steps_desc')} /><input value={inferenceSteps} onChange={(event) => onInferenceStepsChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsShift ? <div><FieldIntro title={t('shift')} description={t('shift_desc')} /><input value={shift} onChange={(event) => onShiftChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsWatermarkText ? <div><FieldIntro title={t('watermark_text')} description={t('watermark_text_desc')} /><input value={watermarkText} onChange={(event) => onWatermarkTextChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsCharacterIds ? <div><FieldIntro title={t('character_ids')} description={t('character_ids_desc')} /><input value={characterIdsText} onChange={(event) => onCharacterIdsTextChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" placeholder="example_123, example_456" /></div> : null}
                  {model.supportsOriginTaskId ? <div><FieldIntro title={t('origin_task_id')} description={t('origin_task_id_desc')} /><input value={originTaskId} onChange={(event) => onOriginTaskIdChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsTimestamps ? <div><FieldIntro title={t('timestamps')} description={t('timestamps_desc')} /><input value={timestamps} onChange={(event) => onTimestampsChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" placeholder="3.55,5.55" /></div> : null}
                  {model.supportsCharacterUserName ? <div><FieldIntro title={t('character_user_name')} description={t('character_user_name_desc')} /><input value={characterUserName} onChange={(event) => onCharacterUserNameChange(event.target.value)} className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsCharacterPrompt ? <div><FieldIntro title={t('character_prompt')} description={t('character_prompt_desc')} /><textarea value={characterPrompt} onChange={(event) => onCharacterPromptChange(event.target.value)} className="min-h-28 w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsSafetyInstruction ? <div><FieldIntro title={t('safety_instruction')} description={t('safety_instruction_desc')} /><textarea value={safetyInstruction} onChange={(event) => onSafetyInstructionChange(event.target.value)} className="min-h-28 w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" /></div> : null}
                  {model.supportsKlingElements ? <div className="md:col-span-2"><FieldIntro title={t('kling_elements')} description={t('kling_elements_desc')} /><textarea value={klingElementsText} onChange={(event) => onKlingElementsTextChange(event.target.value)} className="min-h-32 w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40" placeholder='[{"name":"element_dog","description":"dog","element_input_urls":["https://..."]}]' /></div> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="xl:col-span-2">
            <ToggleRow label={t('make_public')} description={t('make_public_tooltip')} checked={isPublic} onChange={() => onPublicChange(!isPublic)} />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 sm:px-6 xl:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{t('cost')}</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {computedCost ?? '—'} <span className="text-sm text-zinc-400">{t('credits')}</span>
            </div>
            {hasInsufficientCredits ? (
              <div className="mt-2 text-xs font-medium text-rose-300">
                {locale === 'ru' ? `Недостаточно кредитов: ${userBalance} из ${computedCost ?? '—'}` : `Not enough credits: ${userBalance} of ${computedCost ?? '—'}`}
              </div>
            ) : null}
          </div>
          {hasReferenceInputs && referenceCount > 0 ? (
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              {referenceCount} {t('references_count')}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || hasInsufficientCredits}
          className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-cyan-400 px-5 py-4 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              {t('button')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
