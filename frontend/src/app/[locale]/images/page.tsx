'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { getPromptSafetyIssue } from '@/lib/prompt-safety';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';
import { trackGeneration } from '@/lib/generation-tracker';
import { localizeProviderError } from '@/lib/generation-alerts';
import { selectBestPrice, type PublicPriceEntry } from '@/lib/pricing';
import {
    allowsOptionalReferences,
    getAspectRatioOptions,
    getMaxReferences,
    getOutputFormatOptions,
    getResolutionOptions,
    GOOGLE_IMAGEN_MODELS,
    GOOGLE_NANO_BANANA_EDIT_MODEL,
    GOOGLE_NANO_BANANA_MODEL,
    IMAGE_MODELS,
    IMAGE_SIZE_MAPPING,
    NANOBANANA_MODEL,
    NANOBANANA_21_MODEL,
    NANOBANANA_LITE_MODEL,
    NANOBANANA_PRO_MODEL,
    supportsGoogleSearch,
    supportsMultipleReferences,
    supportsNegativePrompt,
    supportsNumImages,
    supportsOutputFormat,
    supportsSeed,
    type ImageModel,
    type OutputFormat,
    usesAspectRatioAsImageSize,
    usesImageSize,
} from '@/components/images/image-tool-config';

const ImageShowcasePanel = dynamic(() => import('@/components/images/ImageShowcasePanel'));
const LazyImageWorkspacePanel = dynamic(() => import('@/components/images/ImageWorkspacePanel'));

type PriceEntry = PublicPriceEntry;

export default function ImageAITool() {
    const { user } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const [modelObj, setModelObj] = useState(IMAGE_MODELS[0].models[0]);
    const [activeModelGroupName, setActiveModelGroupName] = useState(IMAGE_MODELS[0].group);
    const [modelBrowserOpen, setModelBrowserOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [resolution, setResolution] = useState('1K');
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg');
    const [googleSearch, setGoogleSearch] = useState(false);
    const [negativePrompt, setNegativePrompt] = useState('');
    const [seed, setSeed] = useState('');
    const [numImages, setNumImages] = useState('1');
    const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(false);
    const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
    const [prices, setPrices] = useState<PriceEntry[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settingsScrollRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const t = useTranslations('Images');
    const alertsT = useTranslations('GenerationAlerts');
    const locale = useLocale() as 'ru' | 'en';

    useEffect(() => {
        apiClient.get<PriceEntry[]>('/public/prices').then(r => setPrices(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        const queryPrompt = searchParams.get('prompt');
        const queryModel = searchParams.get('model');
        const decodedPrompt = queryPrompt ? decodeURIComponent(queryPrompt) : '';
        const decodedModel = queryModel ? decodeURIComponent(queryModel) : '';

        if (decodedPrompt) {
            setPrompt(decodedPrompt);
        }

        if (decodedModel) {
            const matchedModel = IMAGE_MODELS.flatMap((group) => group.models).find((model) => model.id === decodedModel);
            if (matchedModel) {
                setModelObj(matchedModel);
                const matchedGroup = IMAGE_MODELS.find((group) => group.models.some((model) => model.id === matchedModel.id));
                if (matchedGroup) {
                    setActiveModelGroupName(matchedGroup.group);
                }
            }
        }
    }, [searchParams]);

    useEffect(() => {
        const matchedGroup = IMAGE_MODELS.find((group) => group.models.some((model) => model.id === modelObj.id));
        if (matchedGroup) {
            setActiveModelGroupName(matchedGroup.group);
        }
    }, [modelObj.id]);

    useEffect(() => {
        const aspectOptions = getAspectRatioOptions(modelObj.id);
        if (!aspectOptions.includes(aspectRatio)) {
            setAspectRatio(modelObj.id === NANOBANANA_MODEL ? 'auto' : aspectOptions[0]);
        }

        const resolutionOptions = getResolutionOptions(modelObj.id);
        if (resolutionOptions.length > 0 && !resolutionOptions.includes(resolution)) {
            setResolution(resolutionOptions.includes('2K') ? '2K' : resolutionOptions[0]);
        }

        const outputFormatOptions = getOutputFormatOptions(modelObj.id);
        if (outputFormatOptions.length > 0 && !outputFormatOptions.includes(outputFormat)) {
            setOutputFormat(outputFormatOptions[0]);
        }
        if (outputFormatOptions.length === 0 && outputFormat !== 'jpg') {
            setOutputFormat('jpg');
        }

        if (!supportsGoogleSearch(modelObj.id)) {
            setGoogleSearch(false);
        }

        if (!supportsNegativePrompt(modelObj.id) && negativePrompt) {
            setNegativePrompt('');
        }

        if (!supportsSeed(modelObj.id) && seed) {
            setSeed('');
        }

        if (!supportsNumImages(modelObj.id) && numImages !== '1') {
            setNumImages('1');
        }

        if (!supportsMultipleReferences(modelObj.id) && uploadedImageUrls.length > 1) {
            setUploadedImageUrls((current) => current.slice(0, 1));
        }
    }, [aspectRatio, modelObj.id, resolution, outputFormat, negativePrompt, seed, numImages, uploadedImageUrls.length]);

    const computedCost = useMemo(() => {
        const hasResolutionPricing = getResolutionOptions(modelObj.id).length > 0;
        const pricing = selectBestPrice(prices, 'image', modelObj.id, {
            resolution: hasResolutionPricing ? resolution : null,
            aspect_ratio: aspectRatio || null,
            output_format: supportsOutputFormat(modelObj.id) ? outputFormat : null,
            num_images: supportsNumImages(modelObj.id) ? parseInt(numImages, 10) : null,
            google_search: supportsGoogleSearch(modelObj.id) ? googleSearch : null,
            reference_count: uploadedImageUrls.length || null,
        });
        return pricing?.cost ?? null;
    }, [prices, modelObj, resolution, aspectRatio, outputFormat, numImages, googleSearch, uploadedImageUrls.length]);
    const hasInsufficientCredits = Boolean(
        user &&
        computedCost !== null &&
        typeof user.balance === 'number' &&
        user.balance < computedCost
    );

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const maxReferences = getMaxReferences(modelObj.id);
        const availableSlots = Math.max(0, maxReferences - uploadedImageUrls.length);
        const filesToUpload = supportsMultipleReferences(modelObj.id) ? files.slice(0, availableSlots) : files.slice(0, 1);

        if (!filesToUpload.length) {
            toast.error(t('max_references_reached'));
            return;
        }

        setIsUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (const file of filesToUpload) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await apiClient.post('/files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrls.push(res.data.url);
            }

            setUploadedImageUrls((current) => supportsMultipleReferences(modelObj.id)
                ? [...current, ...uploadedUrls].slice(0, maxReferences)
                : uploadedUrls.slice(0, 1)
            );
        } catch (error: unknown) {
            const message = typeof error === 'object' && error !== null && 'response' in error
                ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
                : undefined;
            toast.error(message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

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
        if (!prompt) return toast.error(t('error_prompt'));
        if (modelObj.type === 'image-to-image' && uploadedImageUrls.length === 0) {
            return toast.error(t('error_reference'));
        }

        if (!user) {
            setShowAuthModal(true);
            return;
        }

        setLoading(true);
        try {
            const promptIssue = getPromptSafetyIssue(prompt.trim(), locale);
            if (promptIssue) {
                throw new Error(`${promptIssue.message} ${promptIssue.suggestion}`.trim());
            }
            const inputs: Record<string, unknown> = { prompt };
            const primaryReference = uploadedImageUrls[0];
            const hasReferences = uploadedImageUrls.length > 0;

            // Synchronize resolution/aspect ratio
            if (modelObj.id === NANOBANANA_MODEL || modelObj.id === NANOBANANA_21_MODEL || modelObj.id === NANOBANANA_PRO_MODEL) {
                if (hasReferences) {
                    inputs.image_input = uploadedImageUrls;
                }
                inputs.aspect_ratio = aspectRatio;
                inputs.resolution = resolution;
                inputs.output_format = outputFormat;
                if (modelObj.id === NANOBANANA_MODEL) {
                    inputs.google_search = googleSearch;
                }
            } else if (modelObj.id === NANOBANANA_LITE_MODEL) {
                if (hasReferences) {
                    inputs.image_urls = uploadedImageUrls;
                }
                inputs.aspect_ratio = aspectRatio;
            } else if (modelObj.id === GOOGLE_NANO_BANANA_MODEL) {
                inputs.image_size = aspectRatio;
                inputs.output_format = outputFormat;
            } else if (modelObj.id === GOOGLE_NANO_BANANA_EDIT_MODEL) {
                inputs.image_size = aspectRatio;
                inputs.output_format = outputFormat;
                inputs.image_urls = uploadedImageUrls;
            } else if (GOOGLE_IMAGEN_MODELS.includes(modelObj.id)) {
                inputs.aspect_ratio = aspectRatio;
                if (negativePrompt.trim()) {
                    inputs.negative_prompt = negativePrompt.trim();
                }
                if (seed.trim()) {
                    inputs.seed = seed.trim();
                }
                if (supportsNumImages(modelObj.id)) {
                    inputs.num_images = numImages;
                }
            } else if (usesImageSize(modelObj.id)) {
                inputs.image_size = IMAGE_SIZE_MAPPING[aspectRatio] || 'square_hd';
                if (modelObj.id.includes('seedream-v4')) {
                    inputs.image_resolution = resolution;
                }
            } else if (modelObj.id.includes('flux')) {
                inputs.aspect_ratio = aspectRatio;
                inputs.resolution = resolution;
            } else {
                if (aspectRatio.includes(':')) {
                    inputs.aspect_ratio = aspectRatio;
                }
            }

            // Map inputs for images based on the specific model
            if (modelObj.type === 'image-to-image' && modelObj.id !== GOOGLE_NANO_BANANA_EDIT_MODEL) {
                if (modelObj.id === 'topaz/image-upscale' || modelObj.id.includes('qwen')) {
                    inputs.image_url = primaryReference;
                } else if (modelObj.id.includes('flux')) {
                    inputs.input_urls = [primaryReference];
                } else if (modelObj.id.includes('recraft')) {
                    inputs.image = primaryReference;
                } else if (modelObj.id.includes('seedream') && modelObj.id.includes('edit')) {
                    inputs.image_urls = [primaryReference];
                } else if (modelObj.id.includes('ideogram')) {
                    inputs.reference_image_urls = [primaryReference];
                }
            }

            const response = await apiClient.post('/ai/generate', {
                category: 'image',
                model: modelObj.id,
                inputs,
                resolution: getResolutionOptions(modelObj.id).length > 0
                    ? resolution
                    : modelObj.id === NANOBANANA_LITE_MODEL
                        ? undefined
                    : usesAspectRatioAsImageSize(modelObj.id)
                        ? aspectRatio
                        : aspectRatio,
                is_public: isPublic
            });
            trackGeneration({ taskId: response.data.task_id, category: 'image', startedAt: Date.now() });
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

    const aspectRatioOptions = useMemo(() => getAspectRatioOptions(modelObj.id), [modelObj.id]);
    const resolutionOptions = useMemo(() => getResolutionOptions(modelObj.id), [modelObj.id]);
    const focusImageWorkspace = () => {
        setMobileSettingsOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        requestAnimationFrame(() => {
            settingsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };
    const applyImagePreset = (modelId: string, promptText: string) => {
        const matchedGroup = IMAGE_MODELS.find((group) => group.models.some((candidate) => candidate.id === modelId));
        const matchedModel = matchedGroup?.models.find((candidate) => candidate.id === modelId);
        if (!matchedGroup || !matchedModel) return;
        setActiveModelGroupName(matchedGroup.group);
        setModelBrowserOpen(false);
        setModelObj(matchedModel);
        setPrompt(promptText);
        focusImageWorkspace();
    };

    return (
        <div className="flex min-h-[100dvh] flex-col bg-transparent selection:bg-pink-500/30 md:flex-row md:items-start">
            <LazyImageWorkspacePanel
                t={t}
                locale={locale}
                modelObj={modelObj}
                activeModelGroupName={activeModelGroupName}
                modelBrowserOpen={modelBrowserOpen}
                prompt={prompt}
                aspectRatio={aspectRatio}
                resolution={resolution}
                outputFormat={outputFormat}
                googleSearch={googleSearch}
                negativePrompt={negativePrompt}
                seed={seed}
                numImages={numImages}
                uploadedImageUrls={uploadedImageUrls}
                isUploading={isUploading}
                isPublic={isPublic}
                loading={loading}
                computedCost={computedCost}
                hasInsufficientCredits={hasInsufficientCredits}
                mobileSettingsOpen={mobileSettingsOpen}
                userBalance={user?.balance}
                settingsScrollRef={settingsScrollRef}
                fileInputRef={fileInputRef}
                onCloseMobileSettings={() => setMobileSettingsOpen(false)}
                onOpenMobileSettings={() => setMobileSettingsOpen(true)}
                onToggleModelBrowser={() => setModelBrowserOpen((current) => !current)}
                onSelectGroup={setActiveModelGroupName}
                onSelectModel={(model) => {
                    setModelObj(model);
                    setModelBrowserOpen(false);
                }}
                onPromptChange={setPrompt}
                onAspectRatioChange={setAspectRatio}
                onResolutionChange={setResolution}
                onOutputFormatChange={setOutputFormat}
                onToggleGoogleSearch={() => setGoogleSearch((current) => !current)}
                onNegativePromptChange={setNegativePrompt}
                onSeedChange={setSeed}
                onNumImagesChange={setNumImages}
                onFileUpload={handleFileUpload}
                onRemoveUploadedImage={(url) => setUploadedImageUrls((current) => current.filter((currentUrl) => currentUrl !== url))}
                onToggleIsPublic={() => setIsPublic((current) => !current)}
                onGenerate={handleGenerate}
            />

            {/* Main Workspace (Examples Gallery) */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950/30 md:min-w-0">
                {/* Background effects */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="z-10 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent px-3 pb-24 pt-[4.5rem] sm:px-4 md:pl-5 md:pr-6 md:pt-10 md:pb-10 lg:pl-6 lg:pr-7 xl:pl-7 xl:pr-8">
                    <div className="mx-auto max-w-[88rem]">
                        <ImageShowcasePanel
                            locale={locale}
                            title={t('inspiration')}
                            onApplyPreset={applyImagePreset}
                            onUsePrompt={(promptText) => {
                                setPrompt(promptText);
                                focusImageWorkspace();
                            }}
                        />
                    </div>
                </div>
            </div>

            <AuthRequiredModal
                open={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}
