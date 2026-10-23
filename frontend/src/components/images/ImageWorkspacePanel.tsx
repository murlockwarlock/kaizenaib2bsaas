'use client';

import Image from 'next/image';
import React, { type RefObject, useMemo } from 'react';
import { Globe, Loader2, Settings2, Sparkles, Upload, Wand2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    allowsOptionalReferences,
    formatAspectRatioLabel,
    getAspectIconClasses,
    getAspectRatioOptions,
    getMaxReferences,
    getModelCapabilityTags,
    getModelShortDescription,
    getOutputFormatOptions,
    getResolutionOptions,
    IMAGE_MODELS,
    MODEL_GROUP_STYLES,
    splitAspectRatioOptions,
    supportsGoogleSearch,
    supportsMultipleReferences,
    supportsNegativePrompt,
    supportsNumImages,
    supportsOutputFormat,
    supportsSeed,
    type ImageModel,
    type OutputFormat,
} from './image-tool-config';

type ImageWorkspacePanelProps = {
    t: (key: string) => string;
    locale: 'ru' | 'en';
    modelObj: ImageModel;
    activeModelGroupName: string;
    modelBrowserOpen: boolean;
    prompt: string;
    aspectRatio: string;
    resolution: string;
    outputFormat: OutputFormat;
    googleSearch: boolean;
    negativePrompt: string;
    seed: string;
    numImages: string;
    uploadedImageUrls: string[];
    isUploading: boolean;
    isPublic: boolean;
    loading: boolean;
    computedCost: number | null;
    hasInsufficientCredits: boolean;
    mobileSettingsOpen: boolean;
    userBalance?: number;
    settingsScrollRef: RefObject<HTMLDivElement | null>;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onCloseMobileSettings: () => void;
    onOpenMobileSettings: () => void;
    onToggleModelBrowser: () => void;
    onSelectGroup: (groupName: string) => void;
    onSelectModel: (model: ImageModel) => void;
    onPromptChange: (value: string) => void;
    onAspectRatioChange: (value: string) => void;
    onResolutionChange: (value: string) => void;
    onOutputFormatChange: (value: OutputFormat) => void;
    onToggleGoogleSearch: () => void;
    onNegativePromptChange: (value: string) => void;
    onSeedChange: (value: string) => void;
    onNumImagesChange: (value: string) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveUploadedImage: (url: string) => void;
    onToggleIsPublic: () => void;
    onGenerate: () => void;
};

export default function ImageWorkspacePanel({
    t,
    locale,
    modelObj,
    activeModelGroupName,
    modelBrowserOpen,
    prompt,
    aspectRatio,
    resolution,
    outputFormat,
    googleSearch,
    negativePrompt,
    seed,
    numImages,
    uploadedImageUrls,
    isUploading,
    isPublic,
    loading,
    computedCost,
    hasInsufficientCredits,
    mobileSettingsOpen,
    userBalance,
    settingsScrollRef,
    fileInputRef,
    onCloseMobileSettings,
    onOpenMobileSettings,
    onToggleModelBrowser,
    onSelectGroup,
    onSelectModel,
    onPromptChange,
    onAspectRatioChange,
    onResolutionChange,
    onOutputFormatChange,
    onToggleGoogleSearch,
    onNegativePromptChange,
    onSeedChange,
    onNumImagesChange,
    onFileUpload,
    onRemoveUploadedImage,
    onToggleIsPublic,
    onGenerate,
}: ImageWorkspacePanelProps) {
    const aspectRatioOptions = useMemo(() => getAspectRatioOptions(modelObj.id), [modelObj.id]);
    const resolutionOptions = useMemo(() => getResolutionOptions(modelObj.id), [modelObj.id]);
    const activeModelGroup = useMemo(
        () => IMAGE_MODELS.find((group) => group.models.some((model) => model.id === modelObj.id)),
        [modelObj.id]
    );
    const visibleModelGroup = useMemo(
        () => IMAGE_MODELS.find((group) => group.group === activeModelGroupName) || IMAGE_MODELS[0],
        [activeModelGroupName]
    );
    const activeGroupStyle = activeModelGroup ? MODEL_GROUP_STYLES[activeModelGroup.group] : MODEL_GROUP_STYLES.Other;
    const modelTags = useMemo(() => getModelCapabilityTags(modelObj, locale), [locale, modelObj]);
    const aspectRatioSections = useMemo(() => splitAspectRatioOptions(aspectRatioOptions), [aspectRatioOptions]);

    return (
        <>
            {mobileSettingsOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onCloseMobileSettings} />
            )}

            <div className={`${mobileSettingsOpen ? 'flex' : 'hidden'} md:flex fixed md:sticky bottom-0 inset-x-0 md:top-5 md:ml-5 md:mt-5 md:self-start z-50 md:z-20 w-full sm:mx-auto sm:max-w-[32rem] md:w-[40rem] lg:w-[42rem] xl:w-[44rem] 2xl:w-[46rem] border-t md:border border-zinc-800/60 bg-zinc-950/95 md:bg-zinc-950/88 backdrop-blur-2xl flex-col max-h-[88dvh] md:h-auto md:max-h-none rounded-t-3xl md:rounded-[2rem] shadow-2xl shadow-black/50`}>
                <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-pink-400" />
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{t('options')}</h3>
                    </div>
                    <button onClick={onCloseMobileSettings} className="p-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div ref={settingsScrollRef} className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent md:overflow-visible md:p-7">
                    <div className="hidden md:flex items-center gap-2 mb-6">
                        <Settings2 className="w-4 h-4 text-pink-400" />
                        <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{t('options')}</h2>
                    </div>

                    <div className="space-y-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                        <div className="rounded-[1.8rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.18),transparent_38%),linear-gradient(180deg,rgba(18,18,24,0.98),rgba(12,12,16,0.94))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:col-span-2">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-pink-200">
                                        <Wand2 className="h-3.5 w-3.5" />
                                        {t('model')}
                                    </div>
                                    <div className="mt-4 text-xl font-semibold tracking-tight text-white">{modelObj.name}</div>
                                    <p className="mt-2 text-sm leading-6 text-zinc-400">{getModelShortDescription(modelObj, locale)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onToggleModelBrowser}
                                    className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-xs font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
                                >
                                    {modelBrowserOpen ? t('model_browser_close') : t('model_browser_open')}
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${activeGroupStyle.badge}`}>
                                    {activeModelGroup?.group || t('model_family_fallback')}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                    {modelObj.type === 'image-to-image' ? t('model_mode_edit') : t('model_mode_text')}
                                </span>
                                {modelTags.map((tag) => (
                                    <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {modelBrowserOpen && (
                                <div className="overflow-hidden">
                                    <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-black/20 p-3.5">
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {IMAGE_MODELS.map((group) => {
                                                const selected = group.group === activeModelGroupName;
                                                const groupStyle = MODEL_GROUP_STYLES[group.group] || MODEL_GROUP_STYLES.Other;
                                                return (
                                                    <button
                                                        key={group.group}
                                                        type="button"
                                                        onClick={() => onSelectGroup(group.group)}
                                                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${selected
                                                            ? `${groupStyle.badge} shadow-[0_0_0_1px_rgba(255,255,255,0.04)]`
                                                            : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                                                            }`}
                                                    >
                                                        {group.group}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mb-3 text-xs text-zinc-500">{visibleModelGroup.models.length} {t('models_count')}</div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {visibleModelGroup.models.map((model) => {
                                                const selected = model.id === modelObj.id;
                                                return (
                                                    <button
                                                        key={model.id}
                                                        type="button"
                                                        onClick={() => onSelectModel(model)}
                                                        className={`rounded-[1.1rem] border p-3 text-left transition-all ${selected
                                                            ? 'border-pink-500/35 bg-pink-500/10 shadow-[0_0_0_1px_rgba(236,72,153,0.12)]'
                                                            : 'border-white/8 bg-black/20 hover:border-white/15 hover:bg-white/[0.04]'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-semibold text-white">{model.name}</div>
                                                                <div className="mt-1 text-xs leading-5 text-zinc-400">{getModelShortDescription(model, locale)}</div>
                                                            </div>
                                                            <div className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${selected
                                                                ? 'border-pink-400/30 bg-pink-500/15 text-pink-200'
                                                                : 'border-white/10 bg-white/[0.03] text-zinc-500'
                                                                }`}>
                                                                {model.type === 'image-to-image' ? t('model_mode_edit_short') : t('model_mode_text_short')}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-[1.6rem] border border-white/8 bg-zinc-950/55 p-5">
                            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                <Sparkles className="h-3.5 w-3.5" />
                                {t('prompt_label')}
                            </div>
                            <p className="mb-4 text-sm leading-6 text-zinc-500">
                                {t('prompt_help')}
                            </p>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 rounded-[1.4rem] bg-gradient-to-b from-pink-500/20 to-violet-500/20 blur opacity-0 transition duration-500 group-focus-within:opacity-100" />
                                <textarea
                                    placeholder={t('placeholder')}
                                    className="relative min-h-[180px] w-full resize-y rounded-[1.4rem] border border-zinc-800/80 bg-zinc-950/85 p-4 text-sm leading-relaxed text-zinc-100 outline-none transition-all duration-300 placeholder:text-zinc-600 group-focus-within:border-pink-500/50"
                                    value={prompt}
                                    onChange={(e) => onPromptChange(e.target.value)}
                                />
                            </div>
                        </div>

                        {(modelObj.type === 'image-to-image' || allowsOptionalReferences(modelObj.id)) && (
                            <div>
                                <div className="rounded-[1.6rem] border border-white/8 bg-zinc-950/55 p-5">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            {supportsMultipleReferences(modelObj.id) ? t('reference_images') : t('reference_image')}
                                        </div>
                                        {supportsMultipleReferences(modelObj.id) && uploadedImageUrls.length > 0 && (
                                            <span className="text-[10px] text-zinc-500">{uploadedImageUrls.length}/{getMaxReferences(modelObj.id)}</span>
                                        )}
                                    </div>
                                    <p className="mb-4 text-sm leading-6 text-zinc-500">
                                        {modelObj.type === 'image-to-image'
                                            ? t('reference_desc_edit')
                                            : t('reference_desc_optional')}
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple={supportsMultipleReferences(modelObj.id)}
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={onFileUpload}
                                    />
                                    {uploadedImageUrls.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className={`grid gap-3 ${uploadedImageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                {uploadedImageUrls.map((url, index) => (
                                                    <div key={url} className="relative aspect-video overflow-hidden rounded-[1.25rem] border border-zinc-800 bg-zinc-950">
                                                        <Image
                                                            src={url}
                                                            alt={`Reference ${index + 1}`}
                                                            fill
                                                            unoptimized
                                                            loader={({ src }) => src}
                                                            sizes="(max-width: 768px) 100vw, 384px"
                                                            className="object-contain"
                                                        />
                                                        <div className="absolute right-3 top-3">
                                                            <button
                                                                onClick={() => onRemoveUploadedImage(url)}
                                                                className="rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-red-500/90"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {(supportsMultipleReferences(modelObj.id) && uploadedImageUrls.length < getMaxReferences(modelObj.id)) && (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="w-full rounded-[1.2rem] border border-dashed border-zinc-800 bg-black/10 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-pink-500/40 hover:text-white"
                                                >
                                                    {t('add_reference')}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="flex h-36 w-full flex-col items-center justify-center gap-3 rounded-[1.35rem] border-2 border-dashed border-zinc-800 bg-black/10 transition-all duration-300 hover:border-pink-500/40 hover:bg-pink-500/5"
                                        >
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 transition-colors">
                                                {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-pink-400" /> : <Upload className="h-5 w-5 text-zinc-500" />}
                                            </div>
                                            <div className="text-sm font-medium text-zinc-300">{t('click_upload')}</div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="rounded-[1.6rem] border border-white/8 bg-zinc-950/55 p-5">
                            <div className="mb-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('output_title')}</div>
                                <p className="mt-2 text-sm leading-6 text-zinc-500">
                                    {t('output_desc')}
                                </p>
                            </div>

                            {resolutionOptions.length > 0 && (
                                <div className="mb-5">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('resolution')}</div>
                                    <div className={`grid gap-2 ${resolutionOptions.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                        {resolutionOptions.map((res) => (
                                            <button
                                                key={res}
                                                onClick={() => onResolutionChange(res)}
                                                className={`flex min-h-[3.25rem] items-center justify-center rounded-2xl border px-3 py-3 text-center text-sm font-semibold leading-none transition-all duration-300 ${resolution === res
                                                    ? 'border-pink-500/50 bg-pink-500/10 text-pink-300 font-semibold shadow-[0_0_15px_rgba(236,72,153,0.1)]'
                                                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                                                    }`}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('aspect_ratio')}</div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {aspectRatioSections.primary.map((ratio) => (
                                        <button
                                            key={ratio}
                                            onClick={() => onAspectRatioChange(ratio)}
                                            className={`rounded-[1.25rem] border p-3 text-xs transition-all duration-300 ${aspectRatio === ratio
                                                ? 'border-pink-500/50 bg-pink-500/10 text-pink-300 font-semibold shadow-[0_0_15px_rgba(236,72,153,0.1)]'
                                                : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                                                }`}
                                        >
                                            <span className="flex flex-col items-center gap-2">
                                                <span className="flex h-12 w-full items-center justify-center rounded-xl border border-current/15 bg-black/10">
                                                    <span className={`block rounded-[3px] border border-current ${getAspectIconClasses(ratio)}`} />
                                                </span>
                                                <span className="text-center leading-tight whitespace-normal break-words">{formatAspectRatioLabel(ratio)}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {aspectRatioSections.secondary.length > 0 && (
                                    <details className="mt-3 rounded-[1.2rem] border border-white/8 bg-black/10 px-3 py-2">
                                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-zinc-500 leading-tight whitespace-normal break-words">
                                            {t('extra_formats')}
                                        </summary>
                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {aspectRatioSections.secondary.map((ratio) => (
                                                <button
                                                    key={ratio}
                                                    onClick={() => onAspectRatioChange(ratio)}
                                                    className={`flex min-h-[3rem] items-center justify-center rounded-xl border px-3 py-2 text-center text-xs leading-tight whitespace-normal transition-all duration-300 ${aspectRatio === ratio
                                                        ? 'border-pink-500/50 bg-pink-500/10 text-pink-300 font-semibold'
                                                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                                                        }`}
                                                >
                                                    <span className="block max-w-full break-words">{formatAspectRatioLabel(ratio)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        </div>

                        {(supportsOutputFormat(modelObj.id) || supportsGoogleSearch(modelObj.id) || supportsNegativePrompt(modelObj.id) || supportsSeed(modelObj.id) || supportsNumImages(modelObj.id)) && (
                            <details className="rounded-[1.6rem] border border-white/8 bg-zinc-950/55 px-5 py-4 md:col-span-2">
                                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {t('advanced_controls')}
                                </summary>
                                <div className="mt-4 space-y-4">
                                    {supportsOutputFormat(modelObj.id) && (
                                        <div>
                                            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                                {t('output_format')}
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {getOutputFormatOptions(modelObj.id).map((format) => (
                                                    <button
                                                        key={format}
                                                        onClick={() => onOutputFormatChange(format)}
                                                        className={`rounded-xl border py-2 text-xs uppercase transition-all duration-300 ${outputFormat === format
                                                            ? 'border-pink-500/50 bg-pink-500/10 text-pink-300 font-semibold'
                                                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                                                            }`}
                                                    >
                                                        {format}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {supportsGoogleSearch(modelObj.id) && (
                                        <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 transition-colors hover:bg-zinc-800/50">
                                            <div>
                                                <div className="text-sm font-medium text-zinc-300">{t('google_search')}</div>
                                                <div className="mt-1 text-xs text-zinc-500">{t('google_search_tooltip')}</div>
                                            </div>
                                            <div
                                                className={`relative h-6 w-10 rounded-full transition-colors duration-300 ${googleSearch ? 'bg-gradient-to-r from-pink-500 to-violet-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'bg-zinc-700'}`}
                                                onClick={(e) => { e.preventDefault(); onToggleGoogleSearch(); }}
                                            >
                                                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-300 ${googleSearch ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </div>
                                        </label>
                                    )}

                                    {supportsNegativePrompt(modelObj.id) && (
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('negative_prompt')}</label>
                                            <textarea
                                                value={negativePrompt}
                                                onChange={(e) => onNegativePromptChange(e.target.value)}
                                                rows={3}
                                                placeholder={t('negative_prompt_placeholder')}
                                                className="w-full resize-none rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 text-sm text-zinc-200 outline-none transition-colors focus:border-pink-500/40"
                                            />
                                        </div>
                                    )}

                                    {(supportsSeed(modelObj.id) || supportsNumImages(modelObj.id)) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {supportsSeed(modelObj.id) && (
                                                <label className="flex flex-col gap-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('seed_label')}</span>
                                                    <input
                                                        value={seed}
                                                        onChange={(e) => onSeedChange(e.target.value)}
                                                        placeholder={t('seed_placeholder')}
                                                        className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200 outline-none transition-colors focus:border-pink-500/40"
                                                    />
                                                    <span className="text-xs leading-5 text-zinc-500">{t('seed_hint')}</span>
                                                </label>
                                            )}
                                            {supportsNumImages(modelObj.id) && (
                                                <label className="flex flex-col gap-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('num_images')}</span>
                                                    <select
                                                        value={numImages}
                                                        onChange={(e) => onNumImagesChange(e.target.value)}
                                                        className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200 outline-none transition-colors focus:border-pink-500/40"
                                                    >
                                                        {['1', '2', '3', '4'].map((value) => (
                                                            <option key={value} value={value}>{value}</option>
                                                        ))}
                                                    </select>
                                                    <span className="text-xs leading-5 text-zinc-500">{t('num_images_hint')}</span>
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                </div>

                <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950/95 p-6">
                    <TooltipProvider delayDuration={150}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <label className="mb-4 flex cursor-pointer items-center justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.06]">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isPublic ? 'bg-cyan-400/12 text-cyan-300' : 'bg-zinc-900 text-zinc-500'}`}>
                                            <Globe className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-white">{t('make_public')}</div>
                                            <div className="text-xs text-zinc-500">{t('public_feed_desc')}</div>
                                        </div>
                                    </div>
                                    <div
                                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${isPublic ? 'bg-cyan-400' : 'bg-zinc-700'}`}
                                        onClick={(e) => { e.preventDefault(); onToggleIsPublic(); }}
                                    >
                                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="border-zinc-800 bg-zinc-900 text-zinc-300">
                                <p className="text-xs">{t('make_public_tooltip')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('cost')}</span>
                        <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1">
                            <Sparkles className="w-3 h-3 text-pink-400" />
                            <span className="text-[11px] font-bold text-zinc-300">{computedCost !== null ? computedCost : '—'} {t('credits')}</span>
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
                        disabled={loading || !prompt || (modelObj.type === 'image-to-image' && uploadedImageUrls.length === 0) || hasInsufficientCredits}
                        className="group relative w-full overflow-hidden rounded-[1.35rem] bg-zinc-100 py-4 text-sm font-bold text-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
                    >
                        {loading && (
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500" />
                        )}
                        <span className={`relative flex items-center justify-center gap-2 z-10 ${loading ? 'text-white' : ''}`}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('generating')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    {t('button')}
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </div>

            <button
                className="md:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-pink-500/30 active:scale-95 transition-all sm:bottom-6 sm:right-6 sm:px-5 sm:py-3.5"
                onClick={onOpenMobileSettings}
            >
                <Sparkles className="w-4 h-4" />
                {t('button')}
            </button>
        </>
    );
}
