'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { trackGeneration } from '@/lib/generation-tracker';
import { selectBestPrice, type PublicPriceEntry } from '@/lib/pricing';
import { getPromptSafetyIssue } from '@/lib/prompt-safety';
import {
  getVideoFamilies,
  getVideoModelById,
  VIDEO_MODELS,
  type VideoFamilyId,
  type VideoModelDefinition,
} from '@/lib/video-models';
import { getVideoShowcaseByModelId } from '@/lib/video-showcase-examples';

const VideoShowcasePanel = dynamic(() => import('@/components/video/VideoShowcasePanel'));
const VideoWorkspacePanel = dynamic(() => import('@/components/video/VideoWorkspacePanel'));

type PriceEntry = PublicPriceEntry;
type ShotItem = { prompt: string; duration: number };
type StoryboardShot = { Scene: string; duration: number };

function parseCharacterIds(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTimestampRange(value: string) {
  const parts = value
    .split(',', 2)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;

  const start = Number(parts[0]);
  const end = Number(parts[1]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    return null;
  }

  return { start, end };
}

function VideoAIToolContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('Video');
  const alertsT = useTranslations('GenerationAlerts');
  const locale = useLocale() as 'ru' | 'en';
  const workspaceRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  const [family, setFamily] = useState<VideoFamilyId>(VIDEO_MODELS[0].family);
  const [model, setModel] = useState<VideoModelDefinition>(VIDEO_MODELS[0]);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [resolution, setResolution] = useState('1080p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);
  const [mode, setMode] = useState('pro');
  const [acceleration, setAcceleration] = useState('none');
  const [frameCount, setFrameCount] = useState(10);
  const [size, setSize] = useState('high');
  const [sound, setSound] = useState(false);
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [cfgScale, setCfgScale] = useState('0.5');
  const [seed, setSeed] = useState('');
  const [cameraFixed, setCameraFixed] = useState(false);
  const [fixedLens, setFixedLens] = useState(false);
  const [generateAudio, setGenerateAudio] = useState(false);
  const [safetyChecker, setSafetyChecker] = useState(true);
  const [promptOptimizer, setPromptOptimizer] = useState(true);
  const [enablePromptExpansion, setEnablePromptExpansion] = useState(true);
  const [audioFlag, setAudioFlag] = useState(false);
  const [numFrames, setNumFrames] = useState('80');
  const [framesPerSecond, setFramesPerSecond] = useState('16');
  const [guidanceScale, setGuidanceScale] = useState('3.5');
  const [inferenceSteps, setInferenceSteps] = useState('27');
  const [shift, setShift] = useState('5');
  const [watermarkText, setWatermarkText] = useState('');
  const [characterIdsText, setCharacterIdsText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [originTaskId, setOriginTaskId] = useState('');
  const [timestamps, setTimestamps] = useState('');
  const [characterUserName, setCharacterUserName] = useState('');
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [safetyInstruction, setSafetyInstruction] = useState('');
  const [multiShots, setMultiShots] = useState(false);
  const [multiPromptShots, setMultiPromptShots] = useState<ShotItem[]>([{ prompt: '', duration: 3 }]);
  const [storyboardShots, setStoryboardShots] = useState<StoryboardShot[]>([
    { Scene: '', duration: 7.5 },
  ]);
  const [klingElementsText, setKlingElementsText] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [uploads, setUploads] = useState<Record<string, string[]>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    apiClient
      .get<PriceEntry[]>('/public/prices')
      .then((response) => setPrices(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    const queryModel = searchParams.get('model');
    const queryFamily = searchParams.get('family');
    if (queryPrompt) setPrompt(decodeURIComponent(queryPrompt));
    if (queryModel) {
      const selectedModel = getVideoModelById(decodeURIComponent(queryModel));
      setModel(selectedModel);
      setFamily(selectedModel.family);
      return;
    }
    if (queryFamily) {
      const normalizedFamily = decodeURIComponent(queryFamily).toLowerCase() as VideoFamilyId;
      const familyModel = VIDEO_MODELS.find((item) => item.family === normalizedFamily);
      if (familyModel) {
        setFamily(familyModel.family);
        setModel(familyModel);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    setFamily(model.family);
    setResolution(model.resolutions?.[0] ?? '1080p');
    setAspectRatio(model.aspectRatios?.[0] ?? '16:9');
    setDuration(model.durationOptions?.[0] ?? 5);
    setMode(model.modeOptions?.[0] ?? 'pro');
    setAcceleration(model.accelerationOptions?.[0] ?? 'none');
    setFrameCount(model.frameOptions?.[0] ?? 10);
    setSize(model.sizeOptions?.[0] ?? 'high');
    setSound(false);
    setRemoveWatermark(false);
    setNegativePrompt('');
    setCfgScale('0.5');
    setSeed('');
    setCameraFixed(false);
    setFixedLens(false);
    setGenerateAudio(false);
    setSafetyChecker(true);
    setPromptOptimizer(true);
    setEnablePromptExpansion(true);
    setAudioFlag(false);
    setNumFrames('80');
    setFramesPerSecond('16');
    setGuidanceScale('3.5');
    setInferenceSteps('27');
    setShift('5');
    setWatermarkText('');
    setCharacterIdsText('');
    setVideoUrl('');
    setOriginTaskId('');
    setTimestamps('');
    setCharacterUserName('');
    setCharacterPrompt('');
    setSafetyInstruction('');
    setMultiShots(false);
    setMultiPromptShots([{ prompt: '', duration: 3 }]);
    setStoryboardShots([{ Scene: '', duration: 7.5 }]);
    setKlingElementsText('');
    setUploads({});
    setAdvancedOpen(false);
  }, [model.id]);

  const families = useMemo(() => getVideoFamilies(locale), [locale]);
  const activeModelShowcase = useMemo(() => getVideoShowcaseByModelId(model.id), [model.id]);
  const visibleModels = useMemo(
    () => VIDEO_MODELS.filter((item) => item.family === family),
    [family]
  );
  const hasAdvancedFields = Boolean(
    model.supportsNegativePrompt ||
      model.supportsCfgScale ||
      model.supportsSeed ||
      model.supportsCameraFixed ||
      model.supportsFixedLens ||
      model.supportsGenerateAudio ||
      model.supportsSafetyChecker ||
      model.supportsPromptOptimizer ||
      model.supportsEnablePromptExpansion ||
      model.supportsAudioFlag ||
      model.supportsRemoveWatermark ||
      model.supportsNumFrames ||
      model.supportsFramesPerSecond ||
      model.supportsGuidanceScale ||
      model.supportsInferenceSteps ||
      model.supportsShift ||
      model.supportsWatermarkText ||
      model.supportsCharacterIds ||
      model.supportsOriginTaskId ||
      model.supportsTimestamps ||
      model.supportsCharacterUserName ||
      model.supportsCharacterPrompt ||
      model.supportsSafetyInstruction ||
      model.supportsKlingElements
  );
  const hasResolutionChoice = (model.resolutions?.length ?? 0) > 1;
  const hasAspectRatioChoice = (model.aspectRatios?.length ?? 0) > 1;
  const hasDurationChoice = (model.durationOptions?.length ?? 0) > 1;
  const hasFrameChoice = (model.frameOptions?.length ?? 0) > 1;
  const hasModeChoice = (model.modeOptions?.length ?? 0) > 1;
  const hasAccelerationChoice = (model.accelerationOptions?.length ?? 0) > 1;
  const hasSizeChoice = (model.sizeOptions?.length ?? 0) > 1;
  const hasOutputSettings = Boolean(
    hasResolutionChoice ||
      hasAspectRatioChoice ||
      hasDurationChoice ||
      hasFrameChoice ||
      hasModeChoice ||
      hasAccelerationChoice ||
      hasSizeChoice ||
      model.supportsSound
  );

  const referenceCount = useMemo(
    () => Object.values(uploads).reduce((sum, urls) => sum + urls.length, 0),
    [uploads]
  );
  const hasReferenceInputs = Boolean((model.uploadSlots?.length ?? 0) > 0 || model.videoUrlInput);

  const computedCost = useMemo(() => {
    const generationMode =
      model.supportsMultiShots && multiShots
        ? 'multi-shot'
        : model.supportsMultiShotsToggle && multiShots
          ? 'multi-shot'
          : model.supportsMultiShotsToggle
            ? 'single-shot'
        : model.modeOptions?.length
          ? mode
          : model.sizeOptions?.length
            ? size
            : null;

    const pricing = selectBestPrice(prices, 'video', model.id, {
      resolution: model.resolutions?.length ? resolution : null,
      duration: model.durationOptions?.length ? duration : null,
      aspect_ratio: model.aspectRatios?.length ? aspectRatio : null,
      reference_count: referenceCount || null,
      generation_mode: generationMode,
      acceleration: model.accelerationOptions?.length ? acceleration : null,
      frame_count: model.frameOptions?.length ? frameCount : null,
      sound_enabled: model.supportsSound ? sound : null,
      remove_watermark: model.supportsRemoveWatermark ? removeWatermark : null,
    });
    return pricing?.cost ?? null;
  }, [
    acceleration,
    aspectRatio,
    duration,
    frameCount,
    mode,
    model,
    multiShots,
    prices,
    referenceCount,
    removeWatermark,
    resolution,
    size,
    sound,
  ]);
  const hasInsufficientCredits = Boolean(
    user &&
    computedCost !== null &&
    typeof user.balance === 'number' &&
    user.balance < computedCost
  );

  const uploadFile = async (slotKey: string, file: File, maxFiles: number) => {
    setUploadingKey(slotKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploads((current) => ({
        ...current,
        [slotKey]: [...(current[slotKey] || []), response.data.url].slice(0, maxFiles),
      }));
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(message || t('upload_error'));
    } finally {
      setUploadingKey(null);
    }
  };

  const removeUpload = (slotKey: string, index: number) => {
    setUploads((current) => ({
      ...current,
      [slotKey]: (current[slotKey] || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const buildInputs = () => {
    const inputs: Record<string, unknown> = {};

    if ((model.promptRequired || model.promptOptional) && (prompt.trim() || model.promptOptional)) {
      inputs.prompt = prompt.trim();
    }

    if (model.promptRequired && !prompt.trim() && !(model.supportsMultiShots && multiShots)) {
      throw new Error(t('error_prompt'));
    }

    for (const slot of model.uploadSlots || []) {
      const urls = uploads[slot.key] || [];
      if (!urls.length && slot.required !== false) {
        throw new Error(
          locale === 'ru'
            ? `Загрузите файл для поля «${slot.label}».`
            : `Upload a file for "${slot.label}".`
        );
      }
      if (!urls.length) continue;
      inputs[slot.key] =
        slot.key.endsWith('_url') && slot.maxFiles === 1 ? urls[0] : urls.slice(0, slot.maxFiles);
    }

    if (model.resolutions?.length) inputs.resolution = resolution;
    if (model.aspectRatios?.length) inputs.aspect_ratio = aspectRatio;
    if (model.durationOptions?.length) inputs.duration = String(duration);
    if (model.modeOptions?.length) inputs.mode = mode;
    if (model.accelerationOptions?.length) inputs.acceleration = acceleration;
    if (model.frameOptions?.length) inputs.n_frames = String(frameCount);
    if (model.sizeOptions?.length) inputs.size = size;
    if (model.supportsSound) inputs.sound = sound;
    if (model.supportsRemoveWatermark) inputs.remove_watermark = removeWatermark;
    if (model.supportsNegativePrompt && negativePrompt.trim()) inputs.negative_prompt = negativePrompt.trim();
    if (model.supportsCfgScale) inputs.cfg_scale = cfgScale;
    if (model.supportsSeed && seed.trim()) inputs.seed = seed.trim();
    if (model.supportsCameraFixed) inputs.camera_fixed = cameraFixed;
    if (model.supportsFixedLens) inputs.fixed_lens = fixedLens;
    if (model.supportsGenerateAudio) inputs.generate_audio = generateAudio;
    if (model.supportsSafetyChecker) inputs.enable_safety_checker = safetyChecker;
    if (model.supportsPromptOptimizer) inputs.prompt_optimizer = promptOptimizer;
    if (model.supportsEnablePromptExpansion) inputs.enable_prompt_expansion = enablePromptExpansion;
    if (model.supportsAudioFlag) inputs.audio = audioFlag;
    if (model.supportsNumFrames && numFrames.trim()) inputs.num_frames = numFrames.trim();
    if (model.supportsFramesPerSecond && framesPerSecond.trim()) inputs.frames_per_second = framesPerSecond.trim();
    if (model.supportsGuidanceScale && guidanceScale.trim()) inputs.guidance_scale = guidanceScale.trim();
    if (model.supportsInferenceSteps && inferenceSteps.trim()) inputs.num_inference_steps = inferenceSteps.trim();
    if (model.supportsShift && shift.trim()) inputs.shift = shift.trim();
    if (model.supportsWatermarkText && watermarkText.trim()) inputs.watermark_text = watermarkText.trim();

    if (model.supportsCharacterIds) {
      const ids = parseCharacterIds(characterIdsText);
      if (ids.length) inputs.character_id_list = ids;
    }

    if (model.videoUrlInput) {
      if (!videoUrl.trim()) throw new Error(t('error_video_url'));
      inputs.video_url = videoUrl.trim();
    }

    if (model.supportsMultiShots) {
      inputs.multi_shots = multiShots;
      if (multiShots) {
        const validShots = multiPromptShots
          .map((shot) => ({ prompt: shot.prompt.trim(), duration: Number(shot.duration) }))
          .filter((shot) => shot.prompt && Number.isFinite(shot.duration));
        if (!validShots.length) throw new Error(t('error_shots'));
        inputs.multi_prompt = validShots;
      }
    }

    if (model.supportsMultiShotsToggle && !model.supportsMultiShots) {
      inputs.multi_shots = multiShots;
    }

    if (model.supportsKlingElements && klingElementsText.trim()) {
      try {
        inputs.kling_elements = JSON.parse(klingElementsText);
      } catch {
        throw new Error(t('error_elements_json'));
      }
    }

    if (model.supportsStoryboardShots) {
      const validScenes = storyboardShots
        .map((shot) => ({ Scene: shot.Scene.trim(), duration: Number(shot.duration) }))
        .filter((shot) => shot.Scene && Number.isFinite(shot.duration));
      if (!validScenes.length) throw new Error(t('error_storyboard'));
      inputs.shots = validScenes;
    }

    if (model.supportsOriginTaskId) {
      if (!originTaskId.trim()) throw new Error(t('error_origin_task'));
      inputs.origin_task_id = originTaskId.trim();
    }

    if (model.supportsTimestamps) {
      if (!timestamps.trim()) throw new Error(t('error_timestamps'));
      inputs.timestamps = timestamps.trim();
    }

    if (model.supportsCharacterUserName && characterUserName.trim()) {
      inputs.character_user_name = characterUserName.trim();
    }

    if (model.supportsCharacterPrompt) {
      if (characterPrompt.trim()) inputs.character_prompt = characterPrompt.trim();
    }

    if (model.supportsSafetyInstruction && safetyInstruction.trim()) {
      inputs.safety_instruction = safetyInstruction.trim();
    }

    if (model.id === 'runway/generate' && resolution === '1080p' && duration === 10) {
      throw new Error(t('error_runway_quality'));
    }

    if (!model.promptRequired && model.promptOptional && !('prompt' in inputs)) {
      inputs.prompt = '';
    }

    return inputs;
  };

  const handleGenerate = async () => {
    if (hasInsufficientCredits) {
      toast.error(
        locale === 'ru'
          ? `Недостаточно кредитов. Нужно ${computedCost}, доступно ${user?.balance ?? 0}.`
          : `Not enough credits. ${computedCost} required, ${user?.balance ?? 0} available.`
      );
      return;
    }

    setLoading(true);
    try {
      if (prompt.trim()) {
        const promptIssue = getPromptSafetyIssue(prompt.trim(), locale);
        if (promptIssue) {
          throw new Error(`${promptIssue.message} ${promptIssue.suggestion}`.trim());
        }
      }
      const inputs = buildInputs();
      const response = await apiClient.post('/ai/generate', {
        category: 'video',
        model: model.id,
        inputs,
        resolution: model.resolutions?.length ? resolution : undefined,
        duration: model.durationOptions?.length ? duration : undefined,
        is_public: isPublic,
      });

      trackGeneration({ taskId: response.data.task_id, category: 'video', startedAt: Date.now() });
      toast.success(alertsT('queued_title'), { description: alertsT('queued_desc') });
    } catch (error: unknown) {
      const backendMessage =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      const message = error instanceof Error ? error.message : backendMessage;
      toast.error(message || t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const promptVisible = Boolean(model.promptRequired || model.promptOptional);
  const focusVideoWorkspace = () => {
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const applyVideoPreset = (modelId: string, promptText: string) => {
    const selectedModel = getVideoModelById(modelId);
    setFamily(selectedModel.family);
    setModel(selectedModel);
    setPrompt(promptText);
    focusVideoWorkspace();
  };

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_32%),#050816] text-white">
      <div className="mx-auto xl:grid xl:grid-cols-[minmax(0,56rem)_1fr] xl:items-start">
        <aside ref={workspaceRef} className="border-b border-white/10 xl:sticky xl:top-5 xl:self-start xl:border xl:border-white/8 xl:rounded-[2rem] xl:ml-5 xl:mt-5 xl:mr-3">
          <VideoWorkspacePanel
            locale={locale}
            family={family}
            families={families}
            model={model}
            visibleModels={visibleModels}
            prompt={prompt}
            promptVisible={promptVisible}
            uploads={uploads}
            uploadingKey={uploadingKey}
            videoUrl={videoUrl}
            storyboardShots={storyboardShots}
            multiShots={multiShots}
            multiPromptShots={multiPromptShots}
            hasOutputSettings={hasOutputSettings}
            hasResolutionChoice={hasResolutionChoice}
            hasAspectRatioChoice={hasAspectRatioChoice}
            hasDurationChoice={hasDurationChoice}
            hasFrameChoice={hasFrameChoice}
            hasModeChoice={hasModeChoice}
            hasAccelerationChoice={hasAccelerationChoice}
            hasSizeChoice={hasSizeChoice}
            hasAdvancedFields={hasAdvancedFields}
            advancedOpen={advancedOpen}
            resolution={resolution}
            aspectRatio={aspectRatio}
            duration={duration}
            mode={mode}
            acceleration={acceleration}
            frameCount={frameCount}
            size={size}
            sound={sound}
            isPublic={isPublic}
            negativePrompt={negativePrompt}
            cfgScale={cfgScale}
            seed={seed}
            cameraFixed={cameraFixed}
            fixedLens={fixedLens}
            generateAudio={generateAudio}
            safetyChecker={safetyChecker}
            promptOptimizer={promptOptimizer}
            enablePromptExpansion={enablePromptExpansion}
            audioFlag={audioFlag}
            removeWatermark={removeWatermark}
            numFrames={numFrames}
            framesPerSecond={framesPerSecond}
            guidanceScale={guidanceScale}
            inferenceSteps={inferenceSteps}
            shift={shift}
            watermarkText={watermarkText}
            characterIdsText={characterIdsText}
            originTaskId={originTaskId}
            timestamps={timestamps}
            characterUserName={characterUserName}
            characterPrompt={characterPrompt}
            safetyInstruction={safetyInstruction}
            klingElementsText={klingElementsText}
            computedCost={computedCost}
            hasInsufficientCredits={hasInsufficientCredits}
            userBalance={user?.balance ?? 0}
            referenceCount={referenceCount}
            hasReferenceInputs={hasReferenceInputs}
            loading={loading}
            onSelectFamily={(nextFamily) => {
              setFamily(nextFamily);
              const firstModel = VIDEO_MODELS.find((candidate) => candidate.family === nextFamily);
              if (firstModel) setModel(firstModel);
            }}
            onSelectModel={setModel}
            onPromptChange={setPrompt}
            onPickUpload={uploadFile}
            onRemoveUpload={removeUpload}
            onVideoUrlChange={setVideoUrl}
            onStoryboardShotsChange={setStoryboardShots}
            onMultiShotsChange={setMultiShots}
            onMultiPromptShotsChange={setMultiPromptShots}
            onResolutionChange={setResolution}
            onAspectRatioChange={setAspectRatio}
            onDurationChange={setDuration}
            onModeChange={setMode}
            onAccelerationChange={setAcceleration}
            onFrameCountChange={setFrameCount}
            onSizeChange={setSize}
            onSoundChange={setSound}
            onPublicChange={setIsPublic}
            onAdvancedOpenChange={setAdvancedOpen}
            onNegativePromptChange={setNegativePrompt}
            onCfgScaleChange={setCfgScale}
            onSeedChange={setSeed}
            onCameraFixedChange={setCameraFixed}
            onFixedLensChange={setFixedLens}
            onGenerateAudioChange={setGenerateAudio}
            onSafetyCheckerChange={setSafetyChecker}
            onPromptOptimizerChange={setPromptOptimizer}
            onEnablePromptExpansionChange={setEnablePromptExpansion}
            onAudioFlagChange={setAudioFlag}
            onRemoveWatermarkChange={setRemoveWatermark}
            onNumFramesChange={setNumFrames}
            onFramesPerSecondChange={setFramesPerSecond}
            onGuidanceScaleChange={setGuidanceScale}
            onInferenceStepsChange={setInferenceSteps}
            onShiftChange={setShift}
            onWatermarkTextChange={setWatermarkText}
            onCharacterIdsTextChange={setCharacterIdsText}
            onOriginTaskIdChange={setOriginTaskId}
            onTimestampsChange={setTimestamps}
            onCharacterUserNameChange={setCharacterUserName}
            onCharacterPromptChange={setCharacterPrompt}
            onSafetyInstructionChange={setSafetyInstruction}
            onKlingElementsTextChange={setKlingElementsText}
            onGenerate={handleGenerate}
          />
        </aside>

        <main className="px-5 py-8 sm:px-6 xl:px-8">
          <VideoShowcasePanel
            locale={locale}
            modelId={model.id}
            activeModelShowcase={activeModelShowcase}
            onApplyPreset={applyVideoPreset}
            onUsePrompt={(promptText) => {
              setPrompt(promptText);
              focusVideoWorkspace();
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default function VideoAITool() {
  return (
    <Suspense fallback={null}>
      <VideoAIToolContent />
    </Suspense>
  );
}
