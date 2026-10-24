'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Activity, Image as ImageIcon, Music, Plus, Trash2, Check, X,
    Video, Coins, ShieldCheck, Search, MoreVertical, Upload, Link2,
    HelpCircle, FileText, Edit2, Sparkles, ChevronDown, ChevronUp, Bug,
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getModelDisplayName } from '@/lib/model-presenter';
import { DEFAULT_LEGAL_CONTENT } from '@/lib/legal';
import { VIDEO_ACCELERATION_OPTIONS, VIDEO_MODEL_OPTIONS, VIDEO_PRICING_GENERATION_MODES } from '@/lib/video-models';
import type { AdminLogEntry, Banner, BillingPayment, BillingSubscription, FAQ, FeaturedAudio, GenerationExample, GenerationTask, ModelPricing, PlanInvite, PricingPlan, PromoCode, UTMTrackingLink } from '@/lib/types';

// All models available per category — must match generation pages
const CATEGORY_MODELS: Record<string, { id: string; name: string }[]> = {
    image: [
        { id: 'flux-2/pro-text-to-image', name: 'Flux Pro (Текст → Изображение)' },
        { id: 'flux-2/pro-image-to-image', name: 'Flux Pro (Изображение → Изображение)' },
        { id: 'flux-2/flex-text-to-image', name: 'Flux Flex (Текст → Изображение)' },
        { id: 'flux-2/flex-image-to-image', name: 'Flux Flex (Изображение → Изображение)' },
        { id: 'google/nano-banana', name: 'Google Nano Banana' },
        { id: 'google/nano-banana-edit', name: 'Google Nano Banana Edit' },
        { id: 'nano-banana-2', name: 'Nano Banana 2' },
        { id: 'nano-banana-2-1', name: 'Nano Banana 2.1' },
        { id: 'nano-banana-2-lite', name: 'Nano Banana 2 Lite' },
        { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
        { id: 'bytedance/seedream-v4-text-to-image', name: 'Seedream V4 (Текст)' },
        { id: 'bytedance/seedream-v4-edit', name: 'Seedream V4 Edit' },
        { id: 'seedream/4.5-text-to-image', name: 'Seedream 4.5 (Текст)' },
        { id: 'bytedance/seedream', name: 'Seedream 3.0 (Текст)' },
        { id: 'qwen/text-to-image', name: 'Qwen (Текст)' },
        { id: 'qwen/image-to-image', name: 'Qwen (Изображение)' },
        { id: 'ideogram/v3-text-to-image', name: 'Ideogram V3 (Текст)' },
        { id: 'ideogram/character', name: 'Ideogram Character' },
        { id: 'z-image', name: 'Z-Image (Текст)' },
        { id: 'google/imagen4', name: 'Google Imagen 4' },
        { id: 'google/imagen4-fast', name: 'Google Imagen 4 Fast' },
        { id: 'google/imagen4-ultra', name: 'Google Imagen 4 Ultra' },
        { id: 'topaz/image-upscale', name: 'Topaz Upscale' },
        { id: 'recraft/crisp-upscale', name: 'Recraft Crisp Upscale' },
        { id: 'recraft/remove-background', name: 'Recraft Remove BG' },
    ],
    video: [
        ...VIDEO_MODEL_OPTIONS,
    ],
    audio: [
        { id: 'elevenlabs/text-to-speech-turbo-2-5', name: 'ElevenLabs Turbo 2.5' },
        { id: 'elevenlabs/text-to-speech-multilingual-v2', name: 'ElevenLabs Multilingual V2' },
        { id: 'elevenlabs/text-to-dialogue-v3', name: 'ElevenLabs Dialogue V3' },
        { id: 'suno/V6', name: 'Suno V6' },
        { id: 'suno/V6_MINI', name: 'Suno V6 Mini' },
        { id: 'suno/V6_WILD', name: 'Suno V6 Wild' },
        { id: 'google/gemini-3-8-flash-tts', name: 'Gemini 3.8 Flash TTS' },
        { id: 'google/gemini-3-8-flash-lite-tts', name: 'Gemini 3.8 Flash Lite TTS' },
        { id: 'google/gemini-3-1-flash-tts', name: 'Gemini 3.1 Flash TTS' },
    ],
};

const CATEGORY_RESOLUTIONS: Record<string, string[]> = {
    image: ['1K', '2K', '4K'],
    video: ['720p', '1080p', '4k'],
    audio: [],
};

const CATEGORY_ASPECT_RATIOS: Record<string, string[]> = {
    image: ['1:1', '16:9', '9:16', '4:3', '3:4', '4:5', '5:4', '21:9', '3:2', '2:3', 'auto'],
    video: ['16:9', '9:16', '1:1', 'landscape', 'portrait'],
    audio: [],
};

const IMAGE_OUTPUT_FORMATS = ['jpg', 'png', 'jpeg'];
const VIDEO_FRAME_OPTIONS = ['10', '15', '25'];

type PricingFormState = {
    model_name: string;
    resolution: string;
    duration: string;
    aspect_ratio: string;
    output_format: string;
    num_images: string;
    google_search: string;
    reference_count: string;
    generation_mode: string;
    acceleration: string;
    frame_count: string;
    sound_enabled: string;
    remove_watermark: string;
    cost: string;
};

const EMPTY_PRICING_FORM_STATE: PricingFormState = {
    model_name: '',
    resolution: '',
    duration: '',
    aspect_ratio: '',
    output_format: '',
    num_images: '',
    google_search: '',
    reference_count: '',
    generation_mode: '',
    acceleration: '',
    frame_count: '',
    sound_enabled: '',
    remove_watermark: '',
    cost: '',
};

function parseOptionalInteger(value: string) {
    return value ? parseInt(value, 10) : null;
}

function parseOptionalBoolean(value: string) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
}

function buildPricingPayload(category: string, data: PricingFormState | Partial<ModelPricing>) {
    const source = data as Record<string, unknown>;
    return {
        category,
        model_name: String(source.model_name || ''),
        duration: source.duration === null || source.duration === undefined
            ? null
            : typeof source.duration === 'number'
                ? source.duration
                : parseOptionalInteger(String(source.duration || '')),
        resolution: String(source.resolution || '') || null,
        aspect_ratio: String(source.aspect_ratio || '') || null,
        output_format: String(source.output_format || '') || null,
        num_images: source.num_images === null || source.num_images === undefined
            ? null
            : typeof source.num_images === 'number'
                ? source.num_images
                : parseOptionalInteger(String(source.num_images || '')),
        google_search: typeof source.google_search === 'boolean'
            ? source.google_search
            : parseOptionalBoolean(String(source.google_search || '')),
        reference_count: source.reference_count === null || source.reference_count === undefined
            ? null
            : typeof source.reference_count === 'number'
                ? source.reference_count
                : parseOptionalInteger(String(source.reference_count || '')),
        generation_mode: String(source.generation_mode || '') || null,
        acceleration: String(source.acceleration || '') || null,
        frame_count: source.frame_count === null || source.frame_count === undefined
            ? null
            : typeof source.frame_count === 'number'
                ? source.frame_count
                : parseOptionalInteger(String(source.frame_count || '')),
        sound_enabled: typeof source.sound_enabled === 'boolean'
            ? source.sound_enabled
            : parseOptionalBoolean(String(source.sound_enabled || '')),
        remove_watermark: typeof source.remove_watermark === 'boolean'
            ? source.remove_watermark
            : parseOptionalBoolean(String(source.remove_watermark || '')),
        cost: typeof source.cost === 'number' ? source.cost : parseFloat(String(source.cost || '0')),
    };
}

function getPricingFilterBadges(price: Partial<ModelPricing>) {
    const badges: string[] = [];
    if (price.aspect_ratio) badges.push(`Формат: ${price.aspect_ratio}`);
    if (price.output_format) badges.push(`Выход: ${price.output_format}`);
    if (price.num_images) badges.push(`Вариантов: ${price.num_images}`);
    if (price.google_search !== null && price.google_search !== undefined) badges.push(`Веб-поиск: ${price.google_search ? 'вкл' : 'выкл'}`);
    if (price.reference_count) badges.push(`Референсов: ${price.reference_count}`);
    if (price.generation_mode) badges.push(`Режим: ${price.generation_mode}`);
    if (price.acceleration) badges.push(`Ускорение: ${price.acceleration}`);
    if (price.frame_count) badges.push(`Кадров: ${price.frame_count}`);
    if (price.sound_enabled !== null && price.sound_enabled !== undefined) badges.push(`Звук: ${price.sound_enabled ? 'вкл' : 'выкл'}`);
    if (price.remove_watermark !== null && price.remove_watermark !== undefined) badges.push(`Без водяного знака: ${price.remove_watermark ? 'да' : 'нет'}`);
    return badges;
}

type PricingPlanFormState = {
    name_ru: string;
    name_en: string;
    description_ru: string;
    description_en: string;
    badge_ru: string;
    badge_en: string;
    billing_period_ru: string;
    billing_period_en: string;
    cta_label_ru: string;
    cta_label_en: string;
    cta_url: string;
    features_ru: string;
    features_en: string;
    currency_symbol: string;
    price: string;
    credits: string;
    is_recurring: boolean;
    recurring_days: string;
    is_featured: boolean;
    is_active: boolean;
    sort_order: string;
};

type PromoFormState = {
    code: string;
    description: string;
    discount_percent: string;
    max_total_uses: string;
    max_uses_per_user: string;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
};

const EMPTY_PRICING_PLAN_FORM: PricingPlanFormState = {
    name_ru: '',
    name_en: '',
    description_ru: '',
    description_en: '',
    badge_ru: '',
    badge_en: '',
    billing_period_ru: '',
    billing_period_en: '',
    cta_label_ru: '',
    cta_label_en: '',
    cta_url: '',
    features_ru: '',
    features_en: '',
    currency_symbol: '₽',
    price: '',
    credits: '',
    is_recurring: false,
    recurring_days: '30',
    is_featured: false,
    is_active: true,
    sort_order: '0',
};

const EMPTY_PROMO_FORM: PromoFormState = {
    code: '',
    description: '',
    discount_percent: '',
    max_total_uses: '',
    max_uses_per_user: '1',
    valid_from: '',
    valid_until: '',
    is_active: true,
};

type AdminStats = {
    total_users: number;
    total_tasks: number;
    total_credits_spent: number;
    total_revenue: number;
    kie_remaining_credits: number | null;
    tasks_by_category?: Record<string, number>;
};

type AdminAnalytics = {
    periods: Record<string, {
        revenue_amount: number;
        buyers_count: number;
        registrations_count: number;
        conversion_rate: number;
    }>;
    top_utm_links: Array<{
        code: string;
        registrations_count: number;
        purchases_count: number;
        buyers_count: number;
        revenue_amount: number;
    }>;
};

type AdminUser = {
    id: number;
    email: string;
    display_name?: string | null;
    avatar_url?: string | null;
    moderation_notice?: string | null;
    moderation_required?: boolean;
    is_superuser: boolean;
    balance: number;
};

type AdminPlanGrant = {
    id: number;
    user_id: number;
    user_email: string | null;
    pricing_plan_id: number;
    plan_name_ru: string | null;
    plan_name_en: string | null;
    source_invite_id: number | null;
    is_active: boolean;
    granted_at: string | null;
    expires_at: string | null;
};

type AdminUserDetail = {
    user: {
        id: number;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
        balance: number;
        is_active: boolean;
        is_verified: boolean;
        is_superuser: boolean;
        utm_code: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        moderation_notice: string | null;
        moderation_required: boolean;
        created_at: string | null;
    };
    stats: {
        total_spent: number;
        payments_count: number;
        tasks_count: number;
        successful_tasks_count: number;
    };
    payments: Array<{
        id: number;
        public_id: string;
        status: string;
        amount: number;
        currency: string;
        credits: number;
        product_type: string;
        created_at: string | null;
    }>;
    subscriptions: Array<{
        id: number;
        public_id: string;
        status: string;
        amount: number;
        currency: string;
        credits: number;
        interval_days: number;
        next_charge_at: string | null;
    }>;
    invites: PlanInvite[];
    grants: AdminPlanGrant[];
    tasks: Array<{
        id: number;
        category: string;
        model: string;
        status: string;
        cost: number;
        created_at: string | null;
    }>;
};

type AdminAudioTask = {
    id: number;
    output_url: string | null;
    model: string | null;
    created_at: string;
};

type PlanInviteFormState = {
    pricing_plan_id: string;
    expires_in_days: string;
    emails_text: string;
};

const EMPTY_PLAN_INVITE_FORM: PlanInviteFormState = {
    pricing_plan_id: '',
    expires_in_days: '',
    emails_text: '',
};

type UTMFormState = {
    code: string;
    target_path: string;
    note: string;
};

const EMPTY_UTM_FORM: UTMFormState = {
    code: '',
    target_path: '/ru/register',
    note: '',
};

type PaymentFiltersState = {
    user_email: string;
    status: string;
    plan_id: string;
    utm_code: string;
    date_from: string;
    date_to: string;
};

const EMPTY_PAYMENT_FILTERS: PaymentFiltersState = {
    user_email: '',
    status: '',
    plan_id: '',
    utm_code: '',
    date_from: '',
    date_to: '',
};

type InviteFiltersState = {
    email: string;
    status: string;
    plan_id: string;
};

const EMPTY_INVITE_FILTERS: InviteFiltersState = {
    email: '',
    status: '',
    plan_id: '',
};

type GrantFiltersState = {
    user_email: string;
    status: string;
    plan_id: string;
};

const EMPTY_GRANT_FILTERS: GrantFiltersState = {
    user_email: '',
    status: '',
    plan_id: '',
};

export default function AdminDashboard() {
    const pricingPlansSectionRef = useRef<HTMLDivElement | null>(null);
    const pricingModelSectionRef = useRef<HTMLDivElement | null>(null);
    const invitesSectionRef = useRef<HTMLDivElement | null>(null);
    const utmSectionRef = useRef<HTMLDivElement | null>(null);
    const grantsSectionRef = useRef<HTMLDivElement | null>(null);
    const paymentsSectionRef = useRef<HTMLDivElement | null>(null);
    // Core state
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [featuredAudio, setFeaturedAudio] = useState<FeaturedAudio[]>([]);
    const [generationExamples, setGenerationExamples] = useState<GenerationExample[]>([]);
    const [audioTasks, setAudioTasks] = useState<AdminAudioTask[]>([]);
    const [tasks, setTasks] = useState<GenerationTask[]>([]);
    const [logs, setLogs] = useState<AdminLogEntry[]>([]);
    const [prices, setPrices] = useState<ModelPricing[]>([]);
    const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
    const [planInvites, setPlanInvites] = useState<PlanInvite[]>([]);
    const [utmLinks, setUtmLinks] = useState<UTMTrackingLink[]>([]);
    const [planGrants, setPlanGrants] = useState<AdminPlanGrant[]>([]);
    const [paymentLogs, setPaymentLogs] = useState<BillingPayment[]>([]);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [subscriptions, setSubscriptions] = useState<BillingSubscription[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({ ...DEFAULT_LEGAL_CONTENT });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Banner form
    const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', image_url: '', target_url: '' });
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [newFeaturedAudio, setNewFeaturedAudio] = useState({
        source_task_id: '',
        title: '',
        subtitle: '',
        description: '',
        prompt: '',
        audio_url: '',
        cover_image_url: '',
        model: '',
        sort_order: '0',
        is_active: true,
    });
    const [featuredAudioCoverFile, setFeaturedAudioCoverFile] = useState<File | null>(null);

    // Example form
    const [newExample, setNewExample] = useState({ title: '', category: 'image', media_url: '', prompt: '', model: '', is_trending: false });
    const [exampleFile, setExampleFile] = useState<File | null>(null);

    // Price form (per-category)
    const [newPrices, setNewPrices] = useState<Record<string, PricingFormState>>({
        image: { ...EMPTY_PRICING_FORM_STATE },
        video: { ...EMPTY_PRICING_FORM_STATE },
        audio: { ...EMPTY_PRICING_FORM_STATE },
    });
    const [editingPrice, setEditingPrice] = useState<number | null>(null);
    const [editPriceData, setEditPriceData] = useState<Partial<ModelPricing> | null>(null);
    const [pricingPlanForm, setPricingPlanForm] = useState<PricingPlanFormState>(EMPTY_PRICING_PLAN_FORM);
    const [editingPricingPlanId, setEditingPricingPlanId] = useState<number | null>(null);
    const [promoForm, setPromoForm] = useState<PromoFormState>(EMPTY_PROMO_FORM);
    const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
    const [isProcessingSubscriptions, setIsProcessingSubscriptions] = useState(false);
    const [planInviteForm, setPlanInviteForm] = useState<PlanInviteFormState>(EMPTY_PLAN_INVITE_FORM);
    const [planInviteFileName, setPlanInviteFileName] = useState('');
    const [isSendingPlanInvites, setIsSendingPlanInvites] = useState(false);
    const [planInviteSummary, setPlanInviteSummary] = useState<{ total: number; pending: number; claimed: number; revoked: number } | null>(null);
    const [utmForm, setUtmForm] = useState<UTMFormState>(EMPTY_UTM_FORM);
    const [utmSummary, setUtmSummary] = useState<{ total: number; registrations: number; buyers: number; revenue_amount: number } | null>(null);
    const [isCreatingUtmLink, setIsCreatingUtmLink] = useState(false);
    const [editingUtmId, setEditingUtmId] = useState<number | null>(null);
    const [utmEditDraft, setUtmEditDraft] = useState<{ code: string; target_path: string; note: string }>({ code: '', target_path: '/ru/register', note: '' });
    const [paymentFilters, setPaymentFilters] = useState<PaymentFiltersState>(EMPTY_PAYMENT_FILTERS);
    const [isFilteringPayments, setIsFilteringPayments] = useState(false);
    const [inviteFilters, setInviteFilters] = useState<InviteFiltersState>(EMPTY_INVITE_FILTERS);
    const [grantFilters, setGrantFilters] = useState<GrantFiltersState>(EMPTY_GRANT_FILTERS);
    const [isReissuingInviteId, setIsReissuingInviteId] = useState<number | null>(null);
    const [isRevokingInviteId, setIsRevokingInviteId] = useState<number | null>(null);
    const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);
    const [isLoadingUserDetail, setIsLoadingUserDetail] = useState(false);
    const [grantForm, setGrantForm] = useState({ user_id: '', pricing_plan_id: '', expires_in_days: '30' });
    const [moderationNoteDraft, setModerationNoteDraft] = useState('');
    const [showOnlyModerationQueue, setShowOnlyModerationQueue] = useState(false);

    // FAQ form
    const [newFaq, setNewFaq] = useState({ question: '', answer: '', order_index: 0 });
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    // User management
    const [userMenuOpen, setUserMenuOpen] = useState<number | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [balanceModal, setBalanceModal] = useState<{ userId: number; email: string; balance: number } | null>(null);
    const [balanceAmount, setBalanceAmount] = useState('');

    const router = useRouter();
    const params = useParams<{ locale?: string }>();
    const isEnglish = params?.locale === 'en';
    const tx = (ru: string, en: string) => (isEnglish ? en : ru);
    const { user, isLoading: authLoading } = useAuth();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setModerationNoteDraft(selectedUserDetail?.user.moderation_notice || '');
    }, [selectedUserDetail]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, analyticsRes, usersRes, bannersRes, featuredAudioRes, audioTasksRes, tasksRes, logsRes, pricesRes, pricingPlansRes, planInvitesRes, utmLinksRes, planGrantsRes, paymentLogsRes, promoCodesRes, subscriptionsRes, settingsRes, faqsRes, examplesRes] = await Promise.all([
                    apiClient.get('/admin/stats'),
                    apiClient.get('/admin/analytics'),
                    apiClient.get('/admin/users'),
                    apiClient.get('/admin/banners'),
                    apiClient.get('/admin/featured-audio'),
                    apiClient.get('/admin/audio-tasks'),
                    apiClient.get('/admin/tasks'),
                    apiClient.get('/admin/logs'),
                    apiClient.get('/admin/prices'),
                    apiClient.get('/admin/pricing-plans'),
                    apiClient.get('/admin/plan-invites'),
                    apiClient.get('/admin/utm-links'),
                    apiClient.get('/admin/plan-grants'),
                    apiClient.get('/billing/admin/payments'),
                    apiClient.get('/billing/admin/promocodes'),
                    apiClient.get('/billing/admin/subscriptions'),
                    apiClient.get('/admin/settings'),
                    apiClient.get('/admin/faqs'),
                    apiClient.get('/admin/examples'),
                ]);
                setStats(statsRes.data);
                setAnalytics(analyticsRes.data);
                setUsers(usersRes.data);
                setBanners(bannersRes.data);
                setFeaturedAudio(featuredAudioRes.data);
                setAudioTasks(audioTasksRes.data);
                setTasks(tasksRes.data);
                setLogs(logsRes.data);
                setPrices(pricesRes.data);
                setPricingPlans(pricingPlansRes.data);
                setPlanInvites(planInvitesRes.data.items || []);
                setPlanInviteSummary(planInvitesRes.data.summary || null);
                setUtmLinks(utmLinksRes.data.items || []);
                setUtmSummary(utmLinksRes.data.summary || null);
                setPlanGrants(planGrantsRes.data.items || []);
                setPaymentLogs(paymentLogsRes.data);
                setPromoCodes(promoCodesRes.data);
                setSubscriptions(subscriptionsRes.data);
                setFaqs(faqsRes.data);
                setGenerationExamples(examplesRes.data);
                if (settingsRes.data) setSettings({ ...DEFAULT_LEGAL_CONTENT, ...settingsRes.data });
            } catch (err) {
                console.error('Admin fetch error', err);
            } finally {
                setLoading(false);
            }
        };
        if (!authLoading) {
            if (!user || !user.is_superuser) router.push('/');
            else fetchData();
        }
    }, [user, authLoading, router]);

    // --- Banners ---
    const handleCreateBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newBanner.title);
            if (newBanner.subtitle) formData.append('subtitle', newBanner.subtitle);
            if (newBanner.target_url) formData.append('target_url', newBanner.target_url);
            if (bannerFile) formData.append('image', bannerFile);
            else if (newBanner.image_url) formData.append('image_url', newBanner.image_url);
            else return toast.error('Please upload an image or provide a URL');
            const res = await apiClient.post('/admin/banners', formData);
            setBanners([...banners, res.data]);
            setNewBanner({ title: '', subtitle: '', image_url: '', target_url: '' });
            setBannerFile(null);
            toast.success('Banner added');
        } catch { toast.error('Failed to add banner'); }
    };
    const handleDeleteBanner = async (id: number) => {
        try { await apiClient.delete(`/admin/banners/${id}`); setBanners(banners.filter(b => b.id !== id)); }
        catch { toast.error('Failed to delete banner'); }
    };

    // --- Featured audio ---
    const handleSourceTaskChange = (taskId: string) => {
        const selectedTask = audioTasks.find((task) => String(task.id) === taskId);
        setNewFeaturedAudio((current) => ({
            ...current,
            source_task_id: taskId,
            audio_url: selectedTask?.output_url || current.audio_url,
            model: selectedTask?.model || current.model,
            title: current.title || (selectedTask?.model ? `${getModelDisplayName(selectedTask.model)} Demo` : ''),
        }));
    };

    const handleCreateFeaturedAudio = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newFeaturedAudio.title);
            if (newFeaturedAudio.subtitle) formData.append('subtitle', newFeaturedAudio.subtitle);
            if (newFeaturedAudio.description) formData.append('description', newFeaturedAudio.description);
            if (newFeaturedAudio.prompt) formData.append('prompt', newFeaturedAudio.prompt);
            formData.append('audio_url', newFeaturedAudio.audio_url);
            if (newFeaturedAudio.model) formData.append('model', newFeaturedAudio.model);
            if (newFeaturedAudio.source_task_id) formData.append('source_task_id', newFeaturedAudio.source_task_id);
            formData.append('sort_order', newFeaturedAudio.sort_order || '0');
            formData.append('is_active', String(newFeaturedAudio.is_active));
            if (featuredAudioCoverFile) formData.append('cover_image', featuredAudioCoverFile);
            else if (newFeaturedAudio.cover_image_url) formData.append('cover_image_url', newFeaturedAudio.cover_image_url);

            const res = await apiClient.post('/admin/featured-audio', formData);
            setFeaturedAudio([...featuredAudio, res.data].sort((a, b) => a.sort_order - b.sort_order || b.id - a.id));
            setNewFeaturedAudio({
                source_task_id: '',
                title: '',
                subtitle: '',
                description: '',
                prompt: '',
                audio_url: '',
                cover_image_url: '',
                model: '',
                sort_order: '0',
                is_active: true,
            });
            setFeaturedAudioCoverFile(null);
            toast.success('Featured audio added');
        } catch {
            toast.error('Failed to add featured audio');
        }
    };

    const handleDeleteFeaturedAudio = async (id: number) => {
        try {
            await apiClient.delete(`/admin/featured-audio/${id}`);
            setFeaturedAudio(featuredAudio.filter((item) => item.id !== id));
            toast.success('Featured audio deleted');
        } catch {
            toast.error('Failed to delete featured audio');
        }
    };

    // --- Generation Examples ---
    const handleCreateExample = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!exampleFile && !newExample.media_url) return toast.error('Upload a file or provide a URL');
        try {
            const formData = new FormData();
            formData.append('title', newExample.title);
            formData.append('category', newExample.category);
            formData.append('is_trending', String(newExample.is_trending));
            if (newExample.prompt) formData.append('prompt', newExample.prompt);
            if (newExample.model) formData.append('model', newExample.model);
            if (exampleFile) formData.append('media', exampleFile);
            else formData.append('media_url', newExample.media_url);
            const res = await apiClient.post('/admin/examples', formData);
            setGenerationExamples([...generationExamples, res.data]);
            setNewExample({ title: '', category: 'image', media_url: '', prompt: '', model: '', is_trending: false });
            setExampleFile(null);
            toast.success('Example added');
        } catch { toast.error('Failed to add example'); }
    };
    const handleDeleteExample = async (id: number) => {
        try {
            await apiClient.delete(`/admin/examples/${id}`);
            setGenerationExamples(generationExamples.filter(ex => ex.id !== id));
            toast.success('Example deleted');
        } catch { toast.error('Failed to delete example'); }
    };
    const handleToggleExampleTrending = async (ex: GenerationExample) => {
        try {
            const res = await apiClient.put(`/admin/examples/${ex.id}`, { is_trending: !ex.is_trending });
            setGenerationExamples(generationExamples.map(e => e.id === ex.id ? res.data : e));
        } catch { toast.error('Failed to update example'); }
    };
    const handleSaveExampleLimit = async () => {
        const nextValue = ['6', '8', '12'].includes(settings.homepage_trending_limit ?? '')
            ? settings.homepage_trending_limit
            : '6';
        try {
            await apiClient.post('/admin/settings', { settings: { homepage_trending_limit: nextValue } });
            setSettings((current) => ({ ...current, homepage_trending_limit: nextValue }));
            toast.success('Homepage examples limit saved');
        } catch {
            toast.error('Не удалось сохранить лимит примеров');
        }
    };

    // --- Prices ---
    const handleDeletePrice = async (id: number) => {
        try { await apiClient.delete(`/admin/prices/${id}`); setPrices(prices.filter(p => p.id !== id)); }
        catch { toast.error('Failed to delete price'); }
    };
    const handleUpdatePrice = async (priceId: number) => {
        try {
            const currentPrice = prices.find((p) => p.id === priceId);
            if (!currentPrice || !editPriceData) return;
            const payload = buildPricingPayload(currentPrice.category || '', editPriceData);
            const res = await apiClient.put(`/admin/prices/${priceId}`, payload);
            setPrices(prices.map(p => p.id === priceId ? res.data : p));
            setEditingPrice(null);
            toast.success('Price updated');
        } catch { toast.error('Failed to update price'); }
    };

    const resetPricingPlanForm = () => {
        setPricingPlanForm(EMPTY_PRICING_PLAN_FORM);
        setEditingPricingPlanId(null);
    };

    const handleEditPricingPlan = (plan: PricingPlan) => {
        setEditingPricingPlanId(plan.id);
        setPricingPlanForm({
            name_ru: plan.name_ru,
            name_en: plan.name_en,
            description_ru: plan.description_ru || '',
            description_en: plan.description_en || '',
            badge_ru: plan.badge_ru || '',
            badge_en: plan.badge_en || '',
            billing_period_ru: plan.billing_period_ru || '',
            billing_period_en: plan.billing_period_en || '',
            cta_label_ru: plan.cta_label_ru || '',
            cta_label_en: plan.cta_label_en || '',
            cta_url: plan.cta_url || '',
            features_ru: plan.features_ru || '',
            features_en: plan.features_en || '',
            currency_symbol: plan.currency_symbol || '₽',
            price: String(plan.price ?? ''),
            credits: String(plan.credits ?? ''),
            is_recurring: plan.is_recurring,
            recurring_days: String(plan.recurring_days ?? 30),
            is_featured: plan.is_featured,
            is_active: plan.is_active,
            sort_order: String(plan.sort_order ?? 0),
        });
    };

    const buildPricingPlanPayload = () => ({
        name_ru: pricingPlanForm.name_ru.trim(),
        name_en: pricingPlanForm.name_en.trim(),
        description_ru: pricingPlanForm.description_ru.trim() || null,
        description_en: pricingPlanForm.description_en.trim() || null,
        badge_ru: pricingPlanForm.badge_ru.trim() || null,
        badge_en: pricingPlanForm.badge_en.trim() || null,
        billing_period_ru: pricingPlanForm.billing_period_ru.trim() || null,
        billing_period_en: pricingPlanForm.billing_period_en.trim() || null,
        cta_label_ru: pricingPlanForm.cta_label_ru.trim() || null,
        cta_label_en: pricingPlanForm.cta_label_en.trim() || null,
        cta_url: pricingPlanForm.cta_url.trim() || null,
        features_ru: pricingPlanForm.features_ru.trim() || null,
        features_en: pricingPlanForm.features_en.trim() || null,
        currency_symbol: pricingPlanForm.currency_symbol.trim() || '₽',
        price: parseFloat(pricingPlanForm.price || '0'),
        credits: parseInt(pricingPlanForm.credits || '0', 10),
        is_recurring: pricingPlanForm.is_recurring,
        recurring_days: parseInt(pricingPlanForm.recurring_days || '30', 10),
        is_featured: pricingPlanForm.is_featured,
        is_active: pricingPlanForm.is_active,
        sort_order: parseInt(pricingPlanForm.sort_order || '0', 10),
    });

    const handleSubmitPricingPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pricingPlanForm.name_ru.trim() || !pricingPlanForm.name_en.trim()) return toast.error('Enter both RU and EN titles');
        if (!pricingPlanForm.price.trim()) return toast.error('Enter plan price');
        if (!pricingPlanForm.credits.trim()) return toast.error('Укажите количество кредитов');

        try {
            const payload = buildPricingPlanPayload();
            if (editingPricingPlanId !== null) {
                const res = await apiClient.put(`/admin/pricing-plans/${editingPricingPlanId}`, payload);
                setPricingPlans(pricingPlans.map((plan) => (plan.id === editingPricingPlanId ? res.data : plan)).sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order || a.id - b.id));
                toast.success('Pricing plan updated');
            } else {
                const res = await apiClient.post('/admin/pricing-plans', payload);
                setPricingPlans([...pricingPlans, res.data].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order || a.id - b.id));
                toast.success('Pricing plan created');
            }
            resetPricingPlanForm();
        } catch {
            toast.error('Не удалось сохранить тариф');
        }
    };

    const handleDeletePricingPlan = async (planId: number) => {
        try {
            await apiClient.delete(`/admin/pricing-plans/${planId}`);
            setPricingPlans(pricingPlans.filter((plan) => plan.id !== planId));
            if (editingPricingPlanId === planId) resetPricingPlanForm();
            toast.success('Pricing plan deleted');
        } catch {
            toast.error('Failed to delete pricing plan');
        }
    };

    const parseInviteEmails = (value: string) =>
        Array.from(
            new Set(
                value
                    .split(/[\n,;\t ]+/)
                    .map((item) => item.trim().toLowerCase())
                    .filter(Boolean)
            )
        );

    const handlePlanInviteFile = async (file: File | null) => {
        if (!file) return;
        try {
            const text = await file.text();
            setPlanInviteForm((current) => ({
                ...current,
                emails_text: current.emails_text ? `${current.emails_text}\n${text}` : text,
            }));
            setPlanInviteFileName(file.name);
            toast.success(`Loaded ${file.name}`);
        } catch {
            toast.error('Failed to read the file');
        }
    };

    const handleSendPlanInvites = async (e: React.FormEvent) => {
        e.preventDefault();
        const emails = parseInviteEmails(planInviteForm.emails_text);
        if (!planInviteForm.pricing_plan_id) return toast.error('Choose a pricing plan');
        if (emails.length === 0) return toast.error('Add at least one email');

        setIsSendingPlanInvites(true);
        try {
            const res = await apiClient.post('/admin/plan-invites/bulk', {
                pricing_plan_id: parseInt(planInviteForm.pricing_plan_id, 10),
                emails,
                expires_in_days: planInviteForm.expires_in_days ? parseInt(planInviteForm.expires_in_days, 10) : null,
            });
            const latestInvites = await apiClient.get('/admin/plan-invites');
            setPlanInvites(latestInvites.data.items || []);
            setPlanInviteSummary(latestInvites.data.summary || null);
            setPlanInviteForm((current) => ({ ...EMPTY_PLAN_INVITE_FORM, pricing_plan_id: current.pricing_plan_id }));
            setPlanInviteFileName('');
            toast.success(`Sent ${res.data.sent} links`);
        } catch {
            toast.error('Failed to send invite emails');
        } finally {
            setIsSendingPlanInvites(false);
        }
    };

    const refreshPlanInvites = async () => {
        const latestInvites = await apiClient.get('/admin/plan-invites');
        setPlanInvites(latestInvites.data.items || []);
        setPlanInviteSummary(latestInvites.data.summary || null);
    };

    const handleRevokePlanInvite = async (invite: PlanInvite) => {
        if (invite.status === 'claimed' || invite.status === 'revoked') return;
        try {
            setIsRevokingInviteId(invite.id);
            await apiClient.patch(`/admin/plan-invites/${invite.id}`, { status: 'revoked' });
            await refreshPlanInvites();
            toast.success('Invite revoked');
        } catch {
            toast.error('Failed to revoke invite');
        } finally {
            setIsRevokingInviteId(null);
        }
    };

    const handleReissuePlanInvite = async (invite: PlanInvite) => {
        try {
            setIsReissuingInviteId(invite.id);
            const res = await apiClient.post(`/admin/plan-invites/${invite.id}/reissue`);
            await refreshPlanInvites();
            if (res.data?.claim_url) {
                await navigator.clipboard.writeText(res.data.claim_url);
                toast.success('Новая инвайт-ссылка создана и скопирована');
            } else {
                toast.success('New invite link created');
            }
        } catch {
            toast.error('Failed to reissue invite');
        } finally {
            setIsReissuingInviteId(null);
        }
    };

    const handleCreateUtmLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!utmForm.code.trim()) return toast.error('Enter a UTM code');

        setIsCreatingUtmLink(true);
        try {
            const res = await apiClient.post('/admin/utm-links', {
                code: utmForm.code.trim().toLowerCase(),
                target_path: utmForm.target_path.trim() || '/ru/register',
                note: utmForm.note.trim() || null,
            });
            const latestUtmLinks = await apiClient.get('/admin/utm-links');
            setUtmLinks(latestUtmLinks.data.items || []);
            setUtmSummary(latestUtmLinks.data.summary || null);
            setUtmForm((current) => ({ ...EMPTY_UTM_FORM, target_path: current.target_path || '/ru/register' }));
            await navigator.clipboard.writeText(res.data.generated_url);
            toast.success('UTM-ссылка создана и скопирована');
        } catch {
            toast.error('Failed to create UTM link');
        } finally {
            setIsCreatingUtmLink(false);
        }
    };

    const startEditingUtm = (link: UTMTrackingLink) => {
        setEditingUtmId(link.id);
        setUtmEditDraft({
            code: link.code,
            target_path: link.target_path,
            note: link.note || '',
        });
    };

    const handleSaveUtm = async (linkId: number) => {
        try {
            await apiClient.patch(`/admin/utm-links/${linkId}`, {
                code: utmEditDraft.code.trim().toLowerCase(),
                target_path: utmEditDraft.target_path.trim() || '/ru/register',
                note: utmEditDraft.note.trim() || null,
            });
            const latestUtmLinks = await apiClient.get('/admin/utm-links');
            setUtmLinks(latestUtmLinks.data.items || []);
            setUtmSummary(latestUtmLinks.data.summary || null);
            setEditingUtmId(null);
            toast.success('UTM link updated');
        } catch {
            toast.error('Failed to update UTM link');
        }
    };

    const handleToggleUtmActive = async (link: UTMTrackingLink) => {
        try {
            await apiClient.patch(`/admin/utm-links/${link.id}`, {
                is_active: !link.is_active,
            });
            const latestUtmLinks = await apiClient.get('/admin/utm-links');
            setUtmLinks(latestUtmLinks.data.items || []);
            setUtmSummary(latestUtmLinks.data.summary || null);
            toast.success(!link.is_active ? 'UTM link enabled' : 'UTM link disabled');
        } catch {
            toast.error('Failed to update UTM link');
        }
    };

    const fetchPaymentLogs = async (filters: PaymentFiltersState = paymentFilters) => {
        setIsFilteringPayments(true);
        try {
            const res = await apiClient.get('/billing/admin/payments', {
                params: {
                    user_email: filters.user_email || undefined,
                    status: filters.status || undefined,
                    plan_id: filters.plan_id || undefined,
                    utm_code: filters.utm_code || undefined,
                    date_from: filters.date_from ? new Date(filters.date_from).toISOString() : undefined,
                    date_to: filters.date_to ? new Date(filters.date_to).toISOString() : undefined,
                    limit: 300,
                },
            });
            setPaymentLogs(res.data);
        } catch {
            toast.error('Failed to load payments');
        } finally {
            setIsFilteringPayments(false);
        }
    };

    const exportPaymentsCsv = () => {
        const rows = [
            ['email', 'status', 'product_type', 'amount', 'currency', 'credits', 'promo_code', 'created_at'],
            ...paymentLogs.map((payment) => [
                payment.user_email || `User #${payment.user_id}`,
                payment.status,
                payment.product_type,
                String(payment.amount),
                payment.currency,
                String(payment.credits),
                payment.promo_code || '',
                payment.created_at || '',
            ]),
        ];
        const csv = rows
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'payments-export.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleOpenUserDetail = async (userId: number) => {
        setIsLoadingUserDetail(true);
        try {
            const res = await apiClient.get(`/admin/users/${userId}/details`);
            setSelectedUserDetail(res.data);
        } catch {
            toast.error('Failed to load user profile');
        } finally {
            setIsLoadingUserDetail(false);
            setUserMenuOpen(null);
        }
    };

    const handleCreateManualGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grantForm.user_id || !grantForm.pricing_plan_id) return toast.error('Choose user and tariff');
        try {
            const res = await apiClient.post('/admin/plan-grants', {
                user_id: parseInt(grantForm.user_id, 10),
                pricing_plan_id: parseInt(grantForm.pricing_plan_id, 10),
                expires_in_days: grantForm.expires_in_days ? parseInt(grantForm.expires_in_days, 10) : null,
            });
            setPlanGrants([res.data, ...planGrants]);
            setGrantForm({ user_id: '', pricing_plan_id: '', expires_in_days: '30' });
            toast.success('Access granted');
        } catch {
            toast.error('Failed to create grant');
        }
    };

    const handleToggleGrant = async (grant: AdminPlanGrant) => {
        try {
            const res = await apiClient.patch(`/admin/plan-grants/${grant.id}`, {
                is_active: !grant.is_active,
            });
            setPlanGrants(planGrants.map((item) => (item.id === grant.id ? res.data : item)));
            if (selectedUserDetail) {
                setSelectedUserDetail({
                    ...selectedUserDetail,
                    grants: selectedUserDetail.grants.map((item) => (item.id === grant.id ? res.data : item)),
                });
            }
            toast.success(res.data.is_active ? 'Grant reactivated' : 'Grant revoked');
        } catch {
            toast.error('Failed to update grant');
        }
    };

    const jumpToAdminSection = (tab: string, ref?: React.RefObject<HTMLDivElement | null>) => {
        setActiveTab(tab);
        window.setTimeout(() => {
            ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    };

    const handleModerateSelectedUser = async (payload: Record<string, unknown>) => {
        if (!selectedUserDetail) return;
        try {
            const res = await apiClient.patch(`/admin/users/${selectedUserDetail.user.id}/profile`, payload);
            setSelectedUserDetail({
                ...selectedUserDetail,
                user: {
                    ...selectedUserDetail.user,
                    display_name: res.data.display_name,
                    avatar_url: res.data.avatar_url,
                    moderation_notice: res.data.moderation_notice,
                    moderation_required: res.data.moderation_required,
                },
            });
            setUsers(users.map((userRow) => (
                userRow.id === selectedUserDetail.user.id
                    ? { ...userRow, display_name: res.data.display_name, avatar_url: res.data.avatar_url }
                    : userRow
            )));
            toast.success('Profile moderation updated');
        } catch {
            toast.error('Failed to update profile moderation');
        }
    };

    const resetPromoForm = () => {
        setPromoForm(EMPTY_PROMO_FORM);
        setEditingPromoId(null);
    };

    const handleEditPromo = (promo: PromoCode) => {
        setEditingPromoId(promo.id);
        setPromoForm({
            code: promo.code,
            description: promo.description || '',
            discount_percent: String(promo.discount_percent ?? ''),
            max_total_uses: promo.max_total_uses !== null ? String(promo.max_total_uses) : '',
            max_uses_per_user: String(promo.max_uses_per_user ?? 1),
            valid_from: promo.valid_from ? promo.valid_from.slice(0, 16) : '',
            valid_until: promo.valid_until ? promo.valid_until.slice(0, 16) : '',
            is_active: promo.is_active,
        });
    };

    const buildPromoPayload = () => ({
        code: promoForm.code.trim().toUpperCase(),
        description: promoForm.description.trim() || null,
        discount_percent: parseFloat(promoForm.discount_percent || '0'),
        max_total_uses: promoForm.max_total_uses ? parseInt(promoForm.max_total_uses, 10) : null,
        max_uses_per_user: parseInt(promoForm.max_uses_per_user || '1', 10),
        valid_from: promoForm.valid_from ? new Date(promoForm.valid_from).toISOString() : null,
        valid_until: promoForm.valid_until ? new Date(promoForm.valid_until).toISOString() : null,
        is_active: promoForm.is_active,
    });

    const handleSubmitPromo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoForm.code.trim()) return toast.error('Enter promo code');
        if (!promoForm.discount_percent.trim()) return toast.error('Enter discount percent');
        try {
            const payload = buildPromoPayload();
            if (editingPromoId !== null) {
                const res = await apiClient.put(`/billing/admin/promocodes/${editingPromoId}`, payload);
                setPromoCodes(promoCodes.map((promo) => (promo.id === editingPromoId ? res.data : promo)));
            toast.success('Промокод обновлён');
            } else {
                const res = await apiClient.post('/billing/admin/promocodes', payload);
                setPromoCodes([res.data, ...promoCodes]);
                toast.success('Промокод создан');
            }
            resetPromoForm();
        } catch {
            toast.error('Не удалось сохранить промокод');
        }
    };

    const handleDeletePromo = async (promoId: number) => {
        try {
            await apiClient.delete(`/billing/admin/promocodes/${promoId}`);
            setPromoCodes(promoCodes.filter((promo) => promo.id !== promoId));
            if (editingPromoId === promoId) resetPromoForm();
            toast.success('Промокод удалён');
        } catch {
            toast.error('Failed to delete promo code');
        }
    };

    const handleProcessSubscriptions = async () => {
        try {
            setIsProcessingSubscriptions(true);
            await apiClient.post('/billing/admin/subscriptions/process-due');
            const [paymentsRes, subscriptionsRes, promoCodesRes] = await Promise.all([
                apiClient.get('/billing/admin/payments'),
                apiClient.get('/billing/admin/subscriptions'),
                apiClient.get('/billing/admin/promocodes'),
            ]);
            setPaymentLogs(paymentsRes.data);
            setSubscriptions(subscriptionsRes.data);
            setPromoCodes(promoCodesRes.data);
            toast.success('Recurring charges processed');
        } catch {
            toast.error('Failed to process recurring charges');
        } finally {
            setIsProcessingSubscriptions(false);
        }
    };

    // --- FAQs ---
    const handleCreateFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await apiClient.post('/admin/faqs', { ...newFaq, order_index: faqs.length });
            setFaqs([...faqs, res.data]);
            setNewFaq({ question: '', answer: '', order_index: faqs.length + 1 });
            toast.success('FAQ added');
        } catch { toast.error('Failed to add FAQ'); }
    };
    const handleDeleteFaq = async (id: number) => {
        try { await apiClient.delete(`/admin/faqs/${id}`); setFaqs(faqs.filter(f => f.id !== id)); toast.success('FAQ deleted'); }
        catch { toast.error('Failed to delete FAQ'); }
    };

    // --- Users ---
    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Удалить пользователя навсегда? Это действие нельзя отменить.')) return;
        try {
            await apiClient.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
            toast.success('User deleted');
        } catch { toast.error('Failed to delete user'); }
        setUserMenuOpen(null);
    };
    const handleAdjustBalance = async () => {
        if (!balanceModal) return;
        const amount = parseFloat(balanceAmount);
        if (isNaN(amount)) return toast.error('Invalid amount');
        try {
            const res = await apiClient.patch(`/admin/users/${balanceModal.userId}/balance`, { amount });
            setUsers(users.map(u => u.id === balanceModal.userId ? { ...u, balance: res.data.balance } : u));
            toast.success(`Баланс обновлён → ${res.data.balance} кредитов`);
            setBalanceModal(null);
            setBalanceAmount('');
        } catch { toast.error('Failed to adjust balance'); }
    };

    // --- Settings ---
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await apiClient.post('/admin/settings', { settings }); toast.success('Settings saved'); }
        catch { toast.error('Не удалось сохранить настройки'); }
    };

    const statCards = [
        { title: tx('Пользователи', 'Users'), value: stats?.total_users ?? 0, icon: Users, color: 'from-blue-500 to-cyan-400' },
        { title: tx('Успешные генерации', 'Successful generations'), value: stats?.total_tasks ?? 0, icon: Activity, color: 'from-violet-500 to-purple-400' },
        { title: tx('Генерации видео', 'Video generations'), value: stats?.tasks_by_category?.video ?? 0, icon: Video, color: 'from-pink-500 to-rose-400' },
        { title: tx('Генерации изображений', 'Image generations'), value: stats?.tasks_by_category?.image ?? 0, icon: ImageIcon, color: 'from-emerald-500 to-teal-400' },
        { title: tx('Генерации аудио', 'Audio generations'), value: stats?.tasks_by_category?.audio ?? 0, icon: Music, color: 'from-amber-500 to-orange-400' },
        { title: tx('Потрачено кредитов', 'Credits spent'), value: stats?.total_credits_spent ?? 0, icon: Coins, color: 'from-indigo-500 to-blue-400' },
        { title: tx('Выручка', 'Revenue'), value: `₽ ${Number(stats?.total_revenue ?? 0).toLocaleString()}`, icon: Link2, color: 'from-emerald-500 to-lime-400' },
        { title: tx('Остаток KIE-кредитов', 'KIE credits remaining'), value: stats?.kie_remaining_credits ?? '—', icon: Sparkles, color: 'from-cyan-500 to-teal-400' },
    ];

    const tabs = [
        { id: 'overview', label: tx('Обзор', 'Overview') },
        { id: 'users', label: tx('Пользователи', 'Users') },
        { id: 'moderation', label: tx('Модерация', 'Moderation') },
        { id: 'faq', label: 'FAQ' },
        { id: 'content', label: tx('Контент', 'Content') },
        { id: 'pricing', label: tx('Тарифы', 'Plans & prices') },
        { id: 'invites', label: tx('Инвайты', 'Invites') },
        { id: 'utm', label: 'UTM' },
        { id: 'access', label: tx('Доступ', 'Access') },
        { id: 'billing', label: tx('Платежи', 'Payments') },
        { id: 'logs', label: tx('Логи', 'Logs') },
        { id: 'settings', label: tx('Настройки', 'Settings') },
    ];
    const commerceTabs = ['pricing', 'invites', 'utm', 'access', 'billing'];
    const filteredUsers = users.filter((u) => {
        const matchesSearch = u.email.toLowerCase().includes(userSearch.toLowerCase());
        if (!matchesSearch) return false;
        if (showOnlyModerationQueue) return Boolean(u.moderation_required);
        return true;
    });
    const moderationUsers = users.filter((u) => Boolean(u.moderation_required));
    const filteredPlanInvites = planInvites.filter((invite) => {
        const matchesEmail = !inviteFilters.email || invite.email.toLowerCase().includes(inviteFilters.email.toLowerCase());
        const matchesStatus = !inviteFilters.status || invite.status === inviteFilters.status;
        const matchesPlan = !inviteFilters.plan_id || String(invite.pricing_plan_id) === inviteFilters.plan_id;
        return matchesEmail && matchesStatus && matchesPlan;
    });
    const filteredPlanGrants = planGrants.filter((grant) => {
        const matchesEmail = !grantFilters.user_email || (grant.user_email || '').toLowerCase().includes(grantFilters.user_email.toLowerCase());
        const matchesPlan = !grantFilters.plan_id || String(grant.pricing_plan_id) === grantFilters.plan_id;
        const now = Date.now();
        const isExpired = Boolean(grant.expires_at && new Date(grant.expires_at).getTime() <= now);
        const normalizedStatus = grant.is_active ? (isExpired ? 'expired' : 'active') : 'inactive';
        const matchesStatus = !grantFilters.status || normalizedStatus === grantFilters.status;
        return matchesEmail && matchesPlan && matchesStatus;
    });
    const failedTasks = tasks.filter(task => task.status === 'failed').slice(0, 25);

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-500">{tx('Загружаю данные админки...', 'Loading admin data...')}</span>
                </div>
            </div>
        );
    }
    if (!user || !user.is_superuser) return null;

    return (
        <div className="min-h-screen p-4 md:p-10 pt-14 md:pt-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-6 h-6 text-violet-400" />
                        <h1 className="text-2xl font-bold text-white">{tx('Панель управления', 'Admin dashboard')}</h1>
                    </div>
                    <p className="text-sm text-zinc-500">{tx('Управление пользователями, контентом и настройками приложения.', 'Manage users, content and application settings.')}</p>
                </div>
                <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 overflow-x-auto gap-0.5">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {statCards.map((stat, i) => {
                                const Icon = stat.icon;
                                return (
                                    <motion.div key={stat.title} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                                        className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 flex items-center gap-5 hover:border-zinc-700 transition-colors">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shrink-0`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{stat.title}</p>
                                            <p className="text-3xl font-bold text-white">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div ref={pricingPlansSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-4">
                                <h2 className="text-base font-bold text-white">{tx('Быстрые действия', 'Quick actions')}</h2>
                                <p className="mt-1 text-xs text-zinc-500">{tx('Переходите сразу в нужный блок админки.', 'Jump directly to an admin section.')}</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {[
                                    { label: tx('UTM-ссылки', 'UTM links'), tab: 'utm', ref: utmSectionRef },
                                    { label: tx('Цены моделей', 'Model prices'), tab: 'pricing', ref: pricingModelSectionRef },
                                    { label: tx('Тарифные планы', 'Pricing plans'), tab: 'pricing', ref: pricingPlansSectionRef },
                                    { label: tx('Инвайт-ссылки', 'Invite links'), tab: 'invites', ref: invitesSectionRef },
                                    { label: tx('Ручные доступы', 'Manual access'), tab: 'access', ref: grantsSectionRef },
                                    { label: tx('Платежи', 'Payments'), tab: 'billing', ref: paymentsSectionRef },
                                    { label: tx('Модерация', 'Moderation'), tab: 'moderation' },
                                    { label: tx('Пользователи', 'Users'), tab: 'users' },
                                    { label: tx('Логи', 'Logs'), tab: 'logs' },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() => jumpToAdminSection(item.tab, item.ref)}
                                        className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-left text-sm font-semibold text-zinc-200 transition-colors hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                                <div className="mb-4">
                                    <h2 className="text-base font-bold text-white">{tx('Выручка и конверсия', 'Revenue and conversion')}</h2>
                                    <p className="mt-1 text-xs text-zinc-500">{tx('Быстрый срез по периодам: регистрации, покупатели, конверсия и выручка.', 'Quick view of registrations, buyers, conversion and revenue.')}</p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    {[
                                        { key: 'today', label: tx('Сегодня', 'Today') },
                                        { key: '7d', label: tx('7 дней', '7 days') },
                                        { key: '30d', label: tx('30 дней', '30 days') },
                                        { key: 'all', label: tx('За всё время', 'All time') },
                                    ].map(({ key, label }) => {
                                        const item = analytics?.periods?.[key];
                                        return (
                                            <div key={key} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
                                                <div className="mt-3 text-xl font-semibold text-white">₽ {Number(item?.revenue_amount ?? 0).toLocaleString()}</div>
                                                <div className="mt-3 space-y-1 text-xs text-zinc-400">
                                                    <div>{tx('Регистрации', 'Registrations')}: {item?.registrations_count ?? 0}</div>
                                                    <div>{tx('Покупатели', 'Buyers')}: {item?.buyers_count ?? 0}</div>
                                                    <div>{tx('Конверсия', 'Conversion')}: {item?.conversion_rate ?? 0}%</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                                <div className="mb-4">
                                    <h2 className="text-base font-bold text-white">{tx('Лучшие UTM-коды', 'Top UTM codes')}</h2>
                                    <p className="mt-1 text-xs text-zinc-500">{tx('Самые сильные источники по регистрациям и оплаченных тарифам.', 'Best sources by registrations and paid plans.')}</p>
                                </div>
                                <div className="space-y-3">
                                    {(analytics?.top_utm_links || []).map((item) => (
                                        <div key={item.code} className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{item.code}</span>
                                                <span className="text-sm font-semibold text-white">₽ {Number(item.revenue_amount || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                                                <span>{tx('Регистрации', 'Registrations')}: {item.registrations_count}</span>
                                                <span>{tx('Покупатели', 'Buyers')}: {item.buyers_count}</span>
                                                <span>{tx('Покупки', 'Purchases')}: {item.purchases_count}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {!(analytics?.top_utm_links || []).length && (
                                        <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                                            {tx('Активности по UTM пока нет.', 'No UTM activity yet.')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* USERS */}
                {activeTab === 'users' && (
                    <motion.div key="users" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="space-y-6">
                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold text-white">{tx('Очередь модерации', 'Moderation queue')}</h2>
                                    <p className="mt-1 text-xs text-zinc-500">{tx('Профили, которые ещё требуют правок от пользователя.', 'Profiles that still need user changes.')}</p>
                                </div>
                                <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">{moderationUsers.length} {tx('в очереди', 'in queue')}</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                {moderationUsers.slice(0, 8).map((u) => (
                                    <button key={u.id} type="button" onClick={() => void handleOpenUserDetail(u.id)} className="flex items-start gap-3 rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/12 hover:bg-white/[0.05]">
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} alt={u.display_name || u.email} className="h-11 w-11 rounded-2xl border border-white/10 object-cover shrink-0" />
                                        ) : (
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white">
                                                {(u.display_name || u.email).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-white">{u.display_name || u.email}</div>
                                            <div className="truncate text-xs text-zinc-500">{u.email}</div>
                                            <div className="mt-2 line-clamp-2 text-xs text-red-300">{u.moderation_notice || tx('Профиль требует модерации', 'Profile needs moderation')}</div>
                                        </div>
                                    </button>
                                ))}
                                {moderationUsers.length === 0 && (
                                    <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500 md:col-span-2">
                                        {tx('Очередь пуста.', 'Queue is empty.')}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
                        <div className="p-5 border-b border-zinc-800/60 flex flex-wrap justify-between items-center gap-3 bg-zinc-900/80">
                            <h2 className="font-semibold text-white">{tx('Пользователи', 'Users')} <span className="text-zinc-500 font-normal text-sm">({filteredUsers.length})</span></h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowOnlyModerationQueue((prev) => !prev)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${showOnlyModerationQueue ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:text-white'}`}
                                >
                                    {showOnlyModerationQueue ? tx('Показывается только модерация', 'Showing moderation only') : tx('Только модерация', 'Moderation only')}
                                </button>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input type="text" placeholder={tx('Поиск по email...', 'Search by email...')} value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm outline-none text-white focus:border-violet-500/50" />
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">ID</th>
                                        <th className="px-6 py-4 font-medium">Email</th>
                                        <th className="px-6 py-4 font-medium">{tx('Роль', 'Role')}</th>
                                        <th className="px-6 py-4 font-medium">{tx('Баланс', 'Balance')}</th>
                                        <th className="px-6 py-4 font-medium text-right">{tx('Действия', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4 text-zinc-500">#{u.id}</td>
                                            <td className="px-6 py-4 font-medium text-white">
                                                <div className="flex items-center gap-3">
                                                    {u.avatar_url ? (
                                                        <img src={u.avatar_url} alt={u.display_name || u.email} className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/10" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
                                                            {(u.display_name || u.email).charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="truncate">{u.email}</div>
                                                        {u.display_name ? <div className="truncate text-xs text-zinc-500">{u.display_name}</div> : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${u.is_superuser ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                                    {u.is_superuser ? tx('Админ', 'Admin') : tx('Пользователь', 'User')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-amber-400">{u.balance} 🪙</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="relative inline-block" ref={userMenuOpen === u.id ? menuRef : undefined}>
                                                    <button
                                                        onClick={() => setUserMenuOpen(userMenuOpen === u.id ? null : u.id)}
                                                        className="p-1.5 text-zinc-500 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    <AnimatePresence>
                                                        {userMenuOpen === u.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                transition={{ duration: 0.1 }}
                                                                className="absolute right-0 top-full mt-1 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/40 z-30 overflow-hidden"
                                                            >
                                                                <button
                                                                    onClick={() => void handleOpenUserDetail(u.id)}
                                                                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
                                                                >
                                                                    <FileText className="w-4 h-4 text-cyan-400" />
                                                                    {tx('Открыть профиль', 'Open profile')}
                                                                </button>
                                                                <div className="h-px bg-zinc-800" />
                                                                <button
                                                                    onClick={() => { setBalanceModal({ userId: u.id, email: u.email, balance: u.balance }); setUserMenuOpen(null); }}
                                                                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
                                                                >
                                                                    <Coins className="w-4 h-4 text-amber-400" />
                                                                    {tx('Изменить баланс', 'Adjust balance')}
                                                                </button>
                                                                <div className="h-px bg-zinc-800" />
                                                                <button
                                                                    onClick={() => handleDeleteUser(u.id)}
                                                                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    {tx('Удалить пользователя', 'Delete user')}
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-10 text-zinc-500">{tx('Пользователи не найдены.', 'No users found.')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        </div>
                    </motion.div>
                )}

                {/* MODERATION */}
                {activeTab === 'moderation' && (
                    <motion.div key="moderation" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="space-y-6">
                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold text-white">{tx('Профили, ожидающие модерации', 'Profiles awaiting moderation')}</h2>
                                    <p className="mt-1 text-xs text-zinc-500">{tx('Откройте профиль, удалите плохой аватар или ник и отправьте точное предупреждение, которое увидит пользователь.', 'Open the profile, remove an unsuitable avatar or name, and send the exact warning the user will see.')}</p>
                                </div>
                                <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">{moderationUsers.length} {tx('профилей', 'profiles')}</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {moderationUsers.map((u) => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => void handleOpenUserDetail(u.id)}
                                        className="flex items-start gap-3 rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/12 hover:bg-white/[0.05]"
                                    >
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} alt={u.display_name || u.email} className="h-14 w-14 rounded-2xl border border-white/10 object-cover shrink-0" />
                                        ) : (
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-base font-bold text-white">
                                                {(u.display_name || u.email).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-white">{u.display_name || tx('Ник ещё не задан', 'No display name yet')}</div>
                                            <div className="truncate text-xs text-zinc-500">{u.email}</div>
                                            <div className="mt-2 line-clamp-3 text-xs text-red-300">{u.moderation_notice || tx('Профиль требует модерации', 'Profile needs moderation')}</div>
                                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                                                {tx('Открыть профиль', 'Open profile')}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {moderationUsers.length === 0 && (
                                    <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-500 xl:col-span-3">
                                        {tx('Очередь пуста.', 'Queue is empty.')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* FAQ */}
                {activeTab === 'faq' && (
                    <motion.div key="faq" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="flex flex-col gap-6">
                        <div ref={invitesSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <HelpCircle className="w-5 h-5 text-violet-400" />
                                <h2 className="text-xl font-bold text-white">Управление FAQ</h2>
                            </div>
                            <p className="text-sm text-zinc-500 mb-6">Вопросы, которые показываются на главной странице. Сортируются по `order_index` по возрастанию.</p>

                            <form onSubmit={handleCreateFaq} className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-5 mb-8 flex flex-col gap-4">
                                <h3 className="text-sm font-semibold text-zinc-300">Добавить FAQ</h3>
                                <input
                                    required type="text" placeholder="Вопрос"
                                    value={newFaq.question} onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50"
                                />
                                <textarea
                                    required rows={3} placeholder="Ответ"
                                    value={newFaq.answer} onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 resize-none"
                                />
                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-zinc-500">Порядок показа:</label>
                                    <input type="number" value={newFaq.order_index} onChange={e => setNewFaq({ ...newFaq, order_index: parseInt(e.target.value) || 0 })}
                                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm outline-none text-white focus:border-violet-500/50" />
                                    <button type="submit" className="ml-auto px-5 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Добавить FAQ
                                    </button>
                                </div>
                            </form>

                            <div className="flex flex-col gap-2">
                                {faqs.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">FAQ пока нет. Добавьте первый блок выше.</p>}
                                {faqs.map(faq => (
                                    <div key={faq.id} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 overflow-hidden">
                                        <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer" onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs text-zinc-600 font-mono shrink-0">#{faq.order_index}</span>
                                                <p className="text-sm font-medium text-white truncate">{faq.question}</p>
                                                {!faq.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 shrink-0">скрыт</span>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-3">
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFaq(faq.id); }}
                                                    className="p-1.5 text-red-500 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                {expandedFaq === faq.id ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {expandedFaq === faq.id && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                    <p className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">{faq.answer}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* CONTENT */}
                {activeTab === 'content' && (
                    <motion.div key="content" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="flex flex-col gap-6">
                        <div ref={utmSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Управление баннерами</h2>
                            <form onSubmit={handleCreateBanner} className="flex flex-col gap-4 mb-8 bg-zinc-950/50 p-4 border border-zinc-800/80 rounded-xl">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <input required type="text" placeholder="Заголовок баннера" value={newBanner.title} onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50" />
                                    <input type="text" placeholder="Подпись (например, Спецпредложение)" value={newBanner.subtitle} onChange={e => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50" />
                                    <input type="text" placeholder="Целевой URL (необязательно)" value={newBanner.target_url} onChange={e => setNewBanner({ ...newBanner, target_url: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50" />
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <div className="flex-1 flex items-center gap-4 w-full">
                                        <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer bg-zinc-900 border border-zinc-800 border-dashed hover:border-violet-500/50 rounded-lg px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors">
                                            <Upload className="w-4 h-4" />
                                            {bannerFile ? bannerFile.name : 'Загрузить изображение'}
                                            <input type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)} className="hidden" />
                                        </label>
                                        <span className="text-zinc-600 text-sm font-medium">ИЛИ</span>
                                        <input type="text" placeholder="URL изображения" value={newBanner.image_url} onChange={e => setNewBanner({ ...newBanner, image_url: e.target.value })}
                                            disabled={!!bannerFile} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 disabled:opacity-50" />
                                    </div>
                                    <button type="submit" className="w-full md:w-auto px-8 py-2.5 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors">Добавить баннер</button>
                                </div>
                            </form>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {banners.map(b => (
                                    <div key={b.id} className="relative rounded-xl border border-zinc-800/60 overflow-hidden group">
                                        <div className="w-full h-32 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                                            <img src={b.image_url || ''} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110" alt="" />
                                            <img src={b.image_url || ''} alt={b.title} className="relative z-10 max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                            <button onClick={() => handleDeleteBanner(b.id)} className="p-2 bg-red-500 text-white hover:bg-red-400 rounded-full transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="p-3 bg-zinc-900/90 text-sm">
                                            <p className="font-semibold text-white truncate">{b.title}</p>
                                            <p className="text-xs text-violet-400 truncate">{b.subtitle || '—'}</p>
                                        </div>
                                    </div>
                                ))}
                                {banners.length === 0 && <p className="text-zinc-500 text-sm">Баннеров пока нет.</p>}
                            </div>
                        </div>

                        <div ref={grantsSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-4">
                                <h2 className="text-xl font-bold text-white">Рекомендуемое аудио</h2>
                                <p className="mt-1 text-sm text-zinc-500">Подборка аудио для главной страницы. Выберите сгенерированную задачу, добавьте обложку и заполните тексты вручную.</p>
                            </div>

                            <form onSubmit={handleCreateFeaturedAudio} className="mb-8 flex flex-col gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">Исходная аудио-задача</span>
                                        <select
                                            value={newFeaturedAudio.source_task_id}
                                            onChange={(e) => handleSourceTaskChange(e.target.value)}
                                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                        >
                                            <option value="">Выберите сгенерированное аудио</option>
                                            {audioTasks.map((task) => (
                                                <option key={task.id} value={task.id}>
                                                    #{task.id} · {getModelDisplayName(task.model)} · {new Date(task.created_at).toLocaleDateString()}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="flex flex-col gap-1">
                                        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">Подпись модели</span>
                                        <input
                                            type="text"
                                            value={newFeaturedAudio.model}
                                            onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, model: e.target.value })}
                                            placeholder="suno/V6"
                                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50"
                                        />
                                    </label>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <input
                                        required
                                        type="text"
                                        placeholder="Заголовок для показа"
                                        value={newFeaturedAudio.title}
                                        onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, title: e.target.value })}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Короткий подзаголовок / жанр / настроение"
                                        value={newFeaturedAudio.subtitle}
                                        onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, subtitle: e.target.value })}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50"
                                    />
                                </div>

                                <textarea
                                    rows={2}
                                    placeholder="Промпт, использованный для этого трека"
                                    value={newFeaturedAudio.prompt}
                                    onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, prompt: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 resize-none"
                                />

                                <textarea
                                    rows={2}
                                    placeholder="Описание, которое показывается на главной"
                                    value={newFeaturedAudio.description}
                                    onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, description: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 resize-none"
                                />

                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                                    <input
                                        required
                                        type="url"
                                        placeholder="URL аудио"
                                        value={newFeaturedAudio.audio_url}
                                        onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, audio_url: e.target.value })}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50"
                                    />
                                    <input
                                        type="url"
                                        placeholder="URL обложки"
                                        value={newFeaturedAudio.cover_image_url}
                                        onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, cover_image_url: e.target.value })}
                                        disabled={!!featuredAudioCoverFile}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 disabled:opacity-50"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Порядок"
                                        value={newFeaturedAudio.sort_order}
                                        onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, sort_order: e.target.value })}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50"
                                    />
                                </div>

                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-violet-500/50 hover:text-white">
                                            <Upload className="w-4 h-4" />
                                            {featuredAudioCoverFile ? featuredAudioCoverFile.name : 'Загрузить обложку'}
                                            <input type="file" accept="image/*" onChange={(e) => setFeaturedAudioCoverFile(e.target.files?.[0] || null)} className="hidden" />
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-400">
                                            <input
                                                type="checkbox"
                                                checked={newFeaturedAudio.is_active}
                                                onChange={(e) => setNewFeaturedAudio({ ...newFeaturedAudio, is_active: e.target.checked })}
                                                className="rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500/50"
                                            />
                                            Показывать на главной
                                        </label>
                                    </div>
                                    <button type="submit" className="w-full md:w-auto rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
                                        Добавить аудио
                                    </button>
                                </div>
                            </form>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {featuredAudio.map((item) => (
                                    <div key={item.id} className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-[linear-gradient(180deg,rgba(18,20,26,0.92),rgba(10,12,16,0.92))] p-4">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.12),transparent_30%)]" />
                                        <div className="relative flex gap-4">
                                            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-zinc-950">
                                                {item.cover_image_url ? (
                                                    <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,107,74,0.22),rgba(34,199,184,0.22))]">
                                                        <Music className="h-8 w-8 text-white/80" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{getModelDisplayName(item.model)}</div>
                                                        <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                                                        {item.subtitle ? <p className="mt-1 text-sm text-[#ffd166]">{item.subtitle}</p> : null}
                                                    </div>
                                                    <button onClick={() => handleDeleteFeaturedAudio(item.id)} className="rounded-full bg-red-500/12 p-2 text-red-300 transition-colors hover:bg-red-500/20 hover:text-white">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {item.description ? <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{item.description}</p> : null}
                                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">Порядок: {item.sort_order}</span>
                                                    {item.source_task_id ? <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">Задача #{item.source_task_id}</span> : null}
                                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">{item.is_active ? 'Активно' : 'Скрыто'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {featuredAudio.length === 0 && <p className="text-sm text-zinc-500">Рекомендуемого аудио пока нет.</p>}
                            </div>
                        </div>

                        {/* Showcase Examples */}
                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Витрина примеров</h2>
                                    <p className="mt-1 text-sm text-zinc-500">Управление блоком «Популярные примеры» на главной. Помечайте примеры как трендовые, чтобы они показывались в витрине.</p>
                                </div>
                                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Карточек на главной</span>
                                        <select
                                            value={['6', '8', '12'].includes(settings.homepage_trending_limit ?? '') ? settings.homepage_trending_limit : '6'}
                                            onChange={(e) => setSettings({ ...settings, homepage_trending_limit: e.target.value })}
                                            className="min-w-[120px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                                        >
                                            <option value="6">6 карточек</option>
                                            <option value="8">8 карточек</option>
                                            <option value="12">12 карточек</option>
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleSaveExampleLimit}
                                        className="rounded-lg border border-violet-500/30 bg-violet-500/12 px-4 py-2.5 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/20 hover:text-white"
                                    >
                                        Сохранить лимит
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleCreateExample} className="mb-8 flex flex-col gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <input
                                        required
                                        type="text"
                                        placeholder="Заголовок"
                                        value={newExample.title}
                                        onChange={(e) => setNewExample({ ...newExample, title: e.target.value })}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50"
                                    />
                                    <select
                                        value={newExample.category}
                                        onChange={(e) => setNewExample({ ...newExample, category: e.target.value, model: '' })}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                    >
                                        <option value="image">Изображение</option>
                                        <option value="video">Видео</option>
                                        <option value="audio">Аудио</option>
                                    </select>
                                    <select
                                        value={newExample.model}
                                        onChange={(e) => setNewExample({ ...newExample, model: e.target.value })}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                    >
                                        <option value="">Выберите модель</option>
                                        {(CATEGORY_MODELS[newExample.category] || []).map((model) => (
                                            <option key={model.id} value={model.id}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <textarea
                                    rows={2}
                                    placeholder="Описание / промпт для карточки на главной"
                                    value={newExample.prompt}
                                    onChange={(e) => setNewExample({ ...newExample, prompt: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 resize-none"
                                />

                                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                                    <input
                                        type="url"
                                        placeholder="URL медиафайла (или загрузите файл)"
                                        value={newExample.media_url}
                                        onChange={(e) => setNewExample({ ...newExample, media_url: e.target.value })}
                                        disabled={!!exampleFile}
                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-violet-500/50 disabled:opacity-50"
                                    />
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-violet-500/50 hover:text-white whitespace-nowrap">
                                            <Upload className="w-4 h-4" />
                                            {exampleFile ? exampleFile.name : 'Загрузить файл'}
                                            <input
                                                type="file"
                                                accept="image/*,video/*,audio/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    if (!file) {
                                                        setExampleFile(null);
                                                        return;
                                                    }
                                                    const nextCategory =
                                                        file.type.startsWith('video/') ? 'video'
                                                        : file.type.startsWith('audio/') ? 'audio'
                                                        : 'image';
                                                    setExampleFile(file);
                                                    setNewExample((current) => ({
                                                        ...current,
                                                        category: nextCategory,
                                                        model: current.category === nextCategory ? current.model : '',
                                                    }));
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                        {exampleFile && (
                                            <button type="button" onClick={() => setExampleFile(null)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Очистить</button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newExample.is_trending}
                                            onChange={(e) => setNewExample({ ...newExample, is_trending: e.target.checked })}
                                            className="rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500/50"
                                        />
                                        Трендовый пример (показывать на главной)
                                    </label>
                                    <button type="submit" className="w-full md:w-auto rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
                                        Добавить пример
                                    </button>
                                </div>
                            </form>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {generationExamples.map((ex) => (
                                    <div key={ex.id} className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-0">
                                        <div className="relative h-40 w-full bg-zinc-900">
                                            {ex.category === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(ex.media_url) ? (
                                                <video src={ex.media_url} className="h-full w-full object-cover" muted />
                                            ) : ex.category === 'audio' || /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(ex.media_url) ? (
                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                                                    <Music className="h-10 w-10 text-white/60" />
                                                </div>
                                            ) : (
                                                <img src={ex.media_url} alt={ex.title} className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-white">{ex.title}</h3>
                                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                                        <span className="inline-block rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
                                                            {ex.category}
                                                        </span>
                                                        {ex.model && (
                                                            <span className="inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-300">
                                                                {ex.model}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteExample(ex.id)} className="shrink-0 rounded-full bg-red-500/12 p-1.5 text-red-300 transition-colors hover:bg-red-500/20 hover:text-white">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            {ex.prompt && <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{ex.prompt}</p>}
                                            <button
                                                onClick={() => handleToggleExampleTrending(ex)}
                                                className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    ex.is_trending
                                                        ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                                                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                                                }`}
                                            >
                                                {ex.is_trending ? 'В тренде' : 'Не в тренде'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {generationExamples.length === 0 && <p className="text-sm text-zinc-500">Примеров пока нет.</p>}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* COMMERCE */}
                {commerceTabs.includes(activeTab) && (
                    <motion.div key="pricing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="flex flex-col gap-6">

                        {activeTab === 'pricing' && (
                            <>
                        {/* General settings */}
                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 max-w-xl">
                            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">⚙️ Общие настройки</h2>
                            <p className="text-xs text-zinc-500 mb-5">Глобальные значения по умолчанию для новых пользователей и контента.</p>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <label className="text-sm text-zinc-300 w-56 shrink-0">
                                        🪙 Стартовые кредиты для новых пользователей
                                        <p className="text-xs text-zinc-600 mt-0.5">Начисляются после подтверждения email</p>
                                    </label>
                                    <input
                                        type="number" step="1" min="0"
                                        value={settings['initial_credits'] ?? '100'}
                                        onChange={e => setSettings({ ...settings, initial_credits: e.target.value })}
                                        className="w-28 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-amber-400 outline-none focus:border-amber-500/50"
                                    />
                                    <span className="text-xs text-zinc-600">кредитов</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-sm text-zinc-300 w-56 shrink-0">
                                        🔥 Порог для бейджа &quot;Hot&quot; (лайки)
                                        <p className="text-xs text-zinc-600 mt-0.5">Минимум лайков для метки &quot;Hot&quot; в Explore</p>
                                    </label>
                                    <input
                                        type="number" step="1" min="1"
                                        value={settings['hot_threshold'] ?? '2'}
                                        onChange={e => setSettings({ ...settings, hot_threshold: e.target.value })}
                                        className="w-28 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-rose-400 outline-none focus:border-rose-500/50"
                                    />
                                    <span className="text-xs text-zinc-600">лайков</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-sm text-zinc-300 w-56 shrink-0">
                                        💸 Минимальная сумма платежа
                                        <p className="text-xs text-zinc-600 mt-0.5">Итоговая сумма после применения промокода</p>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={settings['billing_min_amount_rub'] ?? '50'}
                                        onChange={e => setSettings({ ...settings, billing_min_amount_rub: e.target.value })}
                                        className="w-28 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-400 outline-none focus:border-emerald-500/50"
                                    />
                                    <span className="text-xs text-zinc-600">RUB</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-sm text-zinc-300 w-56 shrink-0">
                                        🧮 Кредитов за 100 RUB
                                        <p className="text-xs text-zinc-600 mt-0.5">Используется для разовых пополнений без подписки</p>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="1"
                                        value={settings['credits_per_100_rub'] ?? '100'}
                                        onChange={e => setSettings({ ...settings, credits_per_100_rub: e.target.value })}
                                        className="w-28 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-cyan-400 outline-none focus:border-cyan-500/50"
                                    />
                                    <span className="text-xs text-zinc-600">кредитов</span>
                                </div>
                                <button
                                    onClick={async () => {
                                        try { await apiClient.post('/admin/settings', { settings: { initial_credits: settings['initial_credits'] ?? '100', hot_threshold: settings['hot_threshold'] ?? '2', billing_min_amount_rub: settings['billing_min_amount_rub'] ?? '50', credits_per_100_rub: settings['credits_per_100_rub'] ?? '100' } }); toast.success('Сохранено'); }
                                        catch { toast.error('Не удалось сохранить'); }
                                    }}
                                    className="self-start px-5 py-2 rounded-lg text-sm font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
                                >
                                    Сохранить общие настройки
                                </button>
                            </div>
                        </div>

                            </>
                        )}

                        {activeTab === 'pricing' && (
                        <div ref={pricingPlansSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white">💳 Тарифные планы</h2>
                                    <p className="mt-1 text-xs text-zinc-500">Создавайте любое количество карточек тарифов для публичной страницы цен. RU и EN тексты редактируются отдельно.</p>
                                </div>
                                <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">
                                    Настроено тарифов: {pricingPlans.length}
                                </div>
                            </div>

                            <form onSubmit={handleSubmitPricingPlan} className="rounded-[1.5rem] border border-white/8 bg-zinc-950/40 p-5">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                                            {editingPricingPlanId !== null ? 'Редактирование тарифа' : 'Новый тариф'}
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-300">
                                            {editingPricingPlanId !== null ? 'Обновите тексты, кредиты, CTA и порядок показа.' : 'Соберите новую карточку тарифа для страницы цен.'}
                                        </div>
                                    </div>
                                    {editingPricingPlanId !== null && (
                                        <button type="button" onClick={resetPricingPlanForm} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white">
                                            Отменить редактирование
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-5 xl:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="rounded-[1.25rem] border border-rose-500/16 bg-rose-500/[0.04] p-4">
                                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-300">Russian copy</div>
                                            <div className="space-y-3">
                                                <input value={pricingPlanForm.name_ru} onChange={e => setPricingPlanForm({ ...pricingPlanForm, name_ru: e.target.value })} placeholder="Название тарифа (RU)" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500/40" />
                                                <input value={pricingPlanForm.badge_ru} onChange={e => setPricingPlanForm({ ...pricingPlanForm, badge_ru: e.target.value })} placeholder="Бейдж (RU) — например Самый популярный" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500/40" />
                                                <input value={pricingPlanForm.billing_period_ru} onChange={e => setPricingPlanForm({ ...pricingPlanForm, billing_period_ru: e.target.value })} placeholder="Период (RU) — например / месяц" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500/40" />
                                                <input value={pricingPlanForm.cta_label_ru} onChange={e => setPricingPlanForm({ ...pricingPlanForm, cta_label_ru: e.target.value })} placeholder="Кнопка (RU)" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500/40" />
                                                <textarea value={pricingPlanForm.description_ru} onChange={e => setPricingPlanForm({ ...pricingPlanForm, description_ru: e.target.value })} placeholder="Описание (RU)" rows={4} className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500/40" />
                                                <textarea value={pricingPlanForm.features_ru} onChange={e => setPricingPlanForm({ ...pricingPlanForm, features_ru: e.target.value })} placeholder={'Фичи (RU), каждая с новой строки\nВсе инструменты\nПриоритетная генерация'} rows={5} className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500/40" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="rounded-[1.25rem] border border-cyan-500/16 bg-cyan-500/[0.04] p-4">
                                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Английский текст</div>
                                            <div className="space-y-3">
                                                <input value={pricingPlanForm.name_en} onChange={e => setPricingPlanForm({ ...pricingPlanForm, name_en: e.target.value })} placeholder="Plan name (EN)" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                                <input value={pricingPlanForm.badge_en} onChange={e => setPricingPlanForm({ ...pricingPlanForm, badge_en: e.target.value })} placeholder="Badge (EN) — e.g. Most Popular" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                                <input value={pricingPlanForm.billing_period_en} onChange={e => setPricingPlanForm({ ...pricingPlanForm, billing_period_en: e.target.value })} placeholder="Billing period (EN) — e.g. / month" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                                <input value={pricingPlanForm.cta_label_en} onChange={e => setPricingPlanForm({ ...pricingPlanForm, cta_label_en: e.target.value })} placeholder="Button label (EN)" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                                <textarea value={pricingPlanForm.description_en} onChange={e => setPricingPlanForm({ ...pricingPlanForm, description_en: e.target.value })} placeholder="Description (EN)" rows={4} className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                                <textarea value={pricingPlanForm.features_en} onChange={e => setPricingPlanForm({ ...pricingPlanForm, features_en: e.target.value })} placeholder={'Features (EN), one per line\nAll tools access\nPriority generations'} rows={5} className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-medium text-zinc-500">Цена</span>
                                        <input type="number" step="0.01" min="0" value={pricingPlanForm.price} onChange={e => setPricingPlanForm({ ...pricingPlanForm, price: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-medium text-zinc-500">Кредиты</span>
                                        <input type="number" step="1" min="0" value={pricingPlanForm.credits} onChange={e => setPricingPlanForm({ ...pricingPlanForm, credits: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-medium text-zinc-500">Валюта</span>
                                        <input value={pricingPlanForm.currency_symbol} onChange={e => setPricingPlanForm({ ...pricingPlanForm, currency_symbol: e.target.value })} placeholder="$" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-medium text-zinc-500">Порядок показа</span>
                                        <input type="number" step="1" value={pricingPlanForm.sort_order} onChange={e => setPricingPlanForm({ ...pricingPlanForm, sort_order: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                    </label>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-medium text-zinc-500">CTA URL</span>
                                        <input value={pricingPlanForm.cta_url} onChange={e => setPricingPlanForm({ ...pricingPlanForm, cta_url: e.target.value })} placeholder="/register or https://..." className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-medium text-zinc-500">Повторять каждые (дней)</span>
                                        <input type="number" step="1" min="1" value={pricingPlanForm.recurring_days} onChange={e => setPricingPlanForm({ ...pricingPlanForm, recurring_days: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40" />
                                    </label>
                                    <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                                        <input type="checkbox" checked={pricingPlanForm.is_recurring} onChange={e => setPricingPlanForm({ ...pricingPlanForm, is_recurring: e.target.checked })} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-400 focus:ring-emerald-500/30" />
                                        Рекуррентный
                                    </label>
                                    <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                                        <input type="checkbox" checked={pricingPlanForm.is_featured} onChange={e => setPricingPlanForm({ ...pricingPlanForm, is_featured: e.target.checked })} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-amber-400 focus:ring-amber-500/30" />
                                        Выделенный
                                    </label>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-1">
                                    <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                                        <input type="checkbox" checked={pricingPlanForm.is_active} onChange={e => setPricingPlanForm({ ...pricingPlanForm, is_active: e.target.checked })} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-400 focus:ring-emerald-500/30" />
                                        Активный
                                    </label>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-400">
                                        {editingPricingPlanId !== null ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {editingPricingPlanId !== null ? 'Обновить тариф' : 'Создать тариф'}
                                    </button>
                                    <button type="button" onClick={resetPricingPlanForm} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:text-white">
                                        <X className="w-4 h-4" />
                                        Сбросить форму
                                    </button>
                                </div>
                            </form>

                            <div className="mt-6 grid gap-4 xl:grid-cols-3">
                                {pricingPlans.map((plan) => {
                                    const previewFeatures = (plan.features_ru || '').split('\n').map(item => item.trim()).filter(Boolean).slice(0, 3);
                                    return (
                                        <div key={plan.id} className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${plan.is_featured ? 'border-amber-500/24 bg-[linear-gradient(180deg,rgba(42,26,18,0.86),rgba(18,16,20,0.84))]' : 'border-white/8 bg-[linear-gradient(180deg,rgba(18,22,30,0.84),rgba(10,12,16,0.82))]'}`}>
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,74,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,199,184,0.1),transparent_30%)]" />
                                            <div className="relative">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {plan.badge_ru ? <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">{plan.badge_ru}</span> : null}
                                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${plan.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-800/60 text-zinc-400'}`}>{plan.is_active ? 'Активен' : 'Скрыт'}</span>
                                                        </div>
                                                        <h3 className="mt-4 text-lg font-semibold text-white">{plan.name_ru}</h3>
                                                        <div className="mt-1 text-sm text-zinc-500">{plan.name_en}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-semibold text-white">{plan.currency_symbol}{plan.price}</div>
                                                        <div className="mt-1 text-xs text-zinc-500">{plan.credits} кредитов</div>
                                                    </div>
                                                </div>

                                                {plan.description_ru ? <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-300">{plan.description_ru}</p> : null}

                                                {previewFeatures.length > 0 ? (
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {previewFeatures.map((feature) => (
                                                            <span key={feature} className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300">
                                                                {feature}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                <div className="mt-5 flex items-center justify-between gap-3 text-xs text-zinc-500">
                                                    <span>Порядок: {plan.sort_order}</span>
                                                    <span>{plan.is_recurring ? `Рекуррентный / ${plan.recurring_days} дн.` : (plan.cta_url || 'CTA URL не задан')}</span>
                                                </div>

                                                <div className="mt-5 flex gap-2">
                                                    <button onClick={() => handleEditPricingPlan(plan)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Изменить
                                                    </button>
                                                    <button onClick={() => handleDeletePricingPlan(plan.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/16 hover:text-white">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Удалить
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {pricingPlans.length === 0 && (
                                    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-zinc-500 xl:col-span-3">
                                        Тарифных планов пока нет. Создайте первый тариф выше, и он сразу появится на публичной странице цен.
                                    </div>
                                )}
                            </div>
                        </div>

                        )}

                        {activeTab === 'invites' && (
                        <div ref={invitesSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white">✉️ Инвайт-ссылки</h2>
                                    <p className="mt-1 text-xs text-zinc-500">Загрузите список email, привяжите тариф и отправьте одноразовые ссылки доступа.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Всего: {planInviteSummary?.total ?? planInvites.length}</span>
                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Ожидают: {planInviteSummary?.pending ?? 0}</span>
                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Активированы: {planInviteSummary?.claimed ?? 0}</span>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                                <form onSubmit={handleSendPlanInvites} className="rounded-[1.5rem] border border-white/8 bg-zinc-950/40 p-5">
                                    <div className="grid gap-3">
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Тариф</span>
                                            <select
                                                value={planInviteForm.pricing_plan_id}
                                                onChange={(e) => setPlanInviteForm({ ...planInviteForm, pricing_plan_id: e.target.value })}
                                                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40"
                                            >
                                                <option value="">Выберите тариф</option>
                                                {pricingPlans.map((plan) => (
                                                    <option key={plan.id} value={plan.id}>
                                                        {plan.name_ru} ({plan.price} {plan.currency_symbol})
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Срок жизни ссылки в днях</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={planInviteForm.expires_in_days}
                                                onChange={(e) => setPlanInviteForm({ ...planInviteForm, expires_in_days: e.target.value })}
                                                placeholder="Необязательно"
                                                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40"
                                            />
                                        </label>

                                        <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-semibold text-white">Список email</div>
                                                    <p className="mt-1 text-xs text-zinc-500">Вставьте email вручную или загрузите `.txt` / `.csv`. На каждый email создаётся одна активная ссылка.</p>
                                                </div>
                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white">
                                                    <Upload className="h-3.5 w-3.5" />
                                                    Загрузить файл
                                                    <input
                                                        type="file"
                                                        accept=".txt,.csv"
                                                        className="hidden"
                                                        onChange={(e) => void handlePlanInviteFile(e.target.files?.[0] ?? null)}
                                                    />
                                                </label>
                                            </div>
                                            {planInviteFileName ? <div className="mt-3 text-xs text-zinc-500">Загружено: {planInviteFileName}</div> : null}
                                            <textarea
                                                value={planInviteForm.emails_text}
                                                onChange={(e) => setPlanInviteForm({ ...planInviteForm, emails_text: e.target.value })}
                                                rows={10}
                                                placeholder={'user1@example.com\nuser2@example.com'}
                                                className="mt-4 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-amber-500/40"
                                            />
                                            <div className="mt-3 text-xs text-zinc-500">Уникальных email: {parseInviteEmails(planInviteForm.emails_text).length}</div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSendingPlanInvites}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-400 disabled:opacity-60"
                                        >
                                            {isSendingPlanInvites ? <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" /> : <Sparkles className="h-4 w-4" />}
                                            Отправить ссылки
                                        </button>
                                    </div>
                                </form>

                                <div className="rounded-[1.5rem] border border-white/8 bg-zinc-950/40 p-5">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-white">Последние ссылки</div>
                                            <p className="mt-1 text-xs text-zinc-500">Фильтруйте очередь, отзывайте старые ссылки или перевыпускайте новую с мгновенным копированием.</p>
                                        </div>
                                        <div className="text-xs text-zinc-500">Строк: {filteredPlanInvites.length}</div>
                                    </div>

                                    <div className="mb-4 grid gap-3 md:grid-cols-3">
                                        <input
                                            value={inviteFilters.email}
                                            onChange={(e) => setInviteFilters({ ...inviteFilters, email: e.target.value })}
                                            placeholder="Фильтр по email"
                                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40"
                                        />
                                        <select
                                            value={inviteFilters.status}
                                            onChange={(e) => setInviteFilters({ ...inviteFilters, status: e.target.value })}
                                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40"
                                        >
                                            <option value="">Любой статус</option>
                                            {['pending', 'sent', 'failed', 'claimed', 'revoked'].map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={inviteFilters.plan_id}
                                            onChange={(e) => setInviteFilters({ ...inviteFilters, plan_id: e.target.value })}
                                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40"
                                        >
                                            <option value="">Любой тариф</option>
                                            {pricingPlans.map((plan) => (
                                                <option key={plan.id} value={plan.id}>{plan.name_ru}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        {filteredPlanInvites.slice(0, 24).map((invite) => (
                                            <div key={invite.id} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-white">{invite.email}</div>
                                                        <div className="mt-1 text-xs text-zinc-500">
                                                            {(invite.plan_name_ru || invite.plan_name_en || `Plan #${invite.pricing_plan_id}`)}
                                                        </div>
                                                    </div>
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                                        invite.status === 'claimed'
                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                                            : invite.status === 'revoked'
                                                                ? 'border-zinc-700 bg-zinc-800/60 text-zinc-400'
                                                                : invite.status === 'failed'
                                                                    ? 'border-red-500/20 bg-red-500/10 text-red-300'
                                                                    : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                                    }`}>
                                                        {invite.status}
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-400">
                                                    <span>Создано: {invite.created_at ? new Date(invite.created_at).toLocaleString() : '—'}</span>
                                                    <span>Отправлено: {invite.sent_at ? new Date(invite.sent_at).toLocaleString() : '—'}</span>
                                                    <span>Использовал: {invite.used_by_email || '—'}</span>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleReissuePlanInvite(invite)}
                                                        disabled={isReissuingInviteId === invite.id}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white disabled:opacity-60"
                                                    >
                                                        {isReissuingInviteId === invite.id ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" /> : <Link2 className="h-3.5 w-3.5" />}
                                                        Перевыпустить и скопировать
                                                    </button>
                                                    {invite.status !== 'claimed' && invite.status !== 'revoked' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleRevokePlanInvite(invite)}
                                                            disabled={isRevokingInviteId === invite.id}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/16 hover:text-white disabled:opacity-60"
                                                        >
                                                            {isRevokingInviteId === invite.id ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-red-300 border-t-transparent" /> : <X className="h-3.5 w-3.5" />}
                                                            Отозвать
                                                        </button>
                                                    ) : null}
                                                </div>
                                                {invite.error_message ? <div className="mt-2 text-xs text-red-300">{invite.error_message}</div> : null}
                                            </div>
                                        ))}
                                        {filteredPlanInvites.length === 0 ? (
                                            <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                                                По текущим фильтрам ссылки не найдены.
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        )}

                        {activeTab === 'utm' && (
                        <div ref={utmSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white">🔗 UTM-ссылки для блогеров</h2>
                                    <p className="mt-1 text-xs text-zinc-500">Создавайте персональную ссылку для каждого автора и отслеживайте регистрации, оплаты и выручку по его коду.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Ссылок: {utmSummary?.total ?? utmLinks.length}</span>
                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Регистраций: {utmSummary?.registrations ?? 0}</span>
                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Покупателей: {utmSummary?.buyers ?? 0}</span>
                                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">₽ {Number(utmSummary?.revenue_amount ?? 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                                <form onSubmit={handleCreateUtmLink} className="rounded-[1.5rem] border border-white/8 bg-zinc-950/40 p-5">
                                    <div className="grid gap-3">
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Код автора</span>
                                            <input
                                                value={utmForm.code}
                                                onChange={(e) => setUtmForm({ ...utmForm, code: e.target.value })}
                                                placeholder="sky"
                                                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40"
                                            />
                                        </label>

                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Путь назначения</span>
                                            <input
                                                value={utmForm.target_path}
                                                onChange={(e) => setUtmForm({ ...utmForm, target_path: e.target.value })}
                                                placeholder="/ru/register"
                                                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40"
                                            />
                                        </label>

                                        <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                                            <div className="text-sm font-semibold text-white">Что будет сгенерировано</div>
                                            <p className="mt-1 text-xs text-zinc-500">Ссылка будет нести этот код как UTM-метку. Новые аккаунты из этой браузерной сессии автоматически привяжутся к нему.</p>
                                            <div className="mt-3 rounded-xl border border-white/8 bg-zinc-950 px-3 py-3 text-xs text-zinc-300 break-all">
                                                {(utmForm.target_path.trim() || '/ru/register')}{`?utm_code=${utmForm.code.trim().toLowerCase() || 'code'}&utm_source=${utmForm.code.trim().toLowerCase() || 'code'}&utm_medium=creator&utm_campaign=bloggers`}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isCreatingUtmLink}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-400 disabled:opacity-60"
                                        >
                                            {isCreatingUtmLink ? <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" /> : <Link2 className="h-4 w-4" />}
                                            Создать ссылку
                                        </button>
                                    </div>
                                </form>

                                <div className="rounded-[1.5rem] border border-white/8 bg-zinc-950/40 p-5">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-white">Последние ссылки авторов</div>
                                            <p className="mt-1 text-xs text-zinc-500">Копируйте URL и смотрите, сколько регистраций и оплат он приносит.</p>
                                        </div>
                                        <div className="text-xs text-zinc-500">Строк: {utmLinks.length}</div>
                                    </div>

                                    <div className="space-y-3">
                                        {utmLinks.slice(0, 14).map((link) => (
                                            <div key={link.id} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{link.code}</span>
                                                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">{link.target_path}</span>
                                                        </div>
                                                        <div className="mt-3 text-xs text-zinc-400 break-all">{link.generated_url}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(link.generated_url)
                                                                .then(() => toast.success('UTM-ссылка скопирована'))
                                                                .catch(() => toast.error('Не удалось скопировать ссылку'));
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white"
                                                    >
                                                        <Link2 className="h-3.5 w-3.5" />
                                                        Копировать
                                                    </button>
                                                </div>
                                                <div className="mt-4 grid gap-2 text-xs text-zinc-300 sm:grid-cols-4">
                                                    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                                                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Регистрации</div>
                                                        <div className="mt-1 text-sm font-semibold text-white">{link.registrations_count}</div>
                                                    </div>
                                                    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                                                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Платящие пользователи</div>
                                                        <div className="mt-1 text-sm font-semibold text-white">{link.buyers_count}</div>
                                                    </div>
                                                    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                                                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Покупки тарифов</div>
                                                        <div className="mt-1 text-sm font-semibold text-white">{link.purchases_count}</div>
                                                    </div>
                                                    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                                                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Выручка</div>
                                                        <div className="mt-1 text-sm font-semibold text-white">₽ {Number(link.revenue_amount || 0).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {utmLinks.length === 0 ? (
                                            <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                                                UTM-ссылок пока нет.
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        )}

                        {activeTab === 'access' && (
                        <div ref={grantsSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white">🪪 Ручная выдача доступа</h2>
                                    <p className="mt-1 text-xs text-zinc-500">Выдавайте или отзывайте доступ к тарифам вручную без инвайт-ссылок.</p>
                                </div>
                                <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">
                                    Выдач: {filteredPlanGrants.length}
                                </div>
                            </div>

                            <div className="mb-6 grid gap-3 md:grid-cols-3">
                                <input
                                    value={grantFilters.user_email}
                                    onChange={(e) => setGrantFilters({ ...grantFilters, user_email: e.target.value })}
                                    placeholder="Фильтр по email пользователя"
                                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                                />
                                <select
                                    value={grantFilters.status}
                                    onChange={(e) => setGrantFilters({ ...grantFilters, status: e.target.value })}
                                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                                >
                                    <option value="">Любой статус</option>
                                    <option value="active">активен</option>
                                    <option value="inactive">неактивен</option>
                                    <option value="expired">истёк</option>
                                </select>
                                <select
                                    value={grantFilters.plan_id}
                                    onChange={(e) => setGrantFilters({ ...grantFilters, plan_id: e.target.value })}
                                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                                >
                                    <option value="">Любой тариф</option>
                                    {pricingPlans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>{plan.name_ru}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                                <form onSubmit={handleCreateManualGrant} className="rounded-[1.5rem] border border-white/8 bg-zinc-950/40 p-5">
                                    <div className="grid gap-3">
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Пользователь</span>
                                            <select value={grantForm.user_id} onChange={e => setGrantForm({ ...grantForm, user_id: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40">
                                                <option value="">Выберите пользователя</option>
                                                {users.slice(0, 200).map((userRow) => (
                                                    <option key={userRow.id} value={userRow.id}>{userRow.email}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Тариф</span>
                                            <select value={grantForm.pricing_plan_id} onChange={e => setGrantForm({ ...grantForm, pricing_plan_id: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40">
                                                <option value="">Выберите тариф</option>
                                                {pricingPlans.map((plan) => (
                                                    <option key={plan.id} value={plan.id}>{plan.name_ru}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Срок в днях</span>
                                            <input type="number" min="1" value={grantForm.expires_in_days} onChange={e => setGrantForm({ ...grantForm, expires_in_days: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40" />
                                        </label>
                                        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400">
                                            <Plus className="w-4 h-4" />
                                            Выдать доступ
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-3">
                                    {filteredPlanGrants.slice(0, 24).map((grant) => (
                                        <div key={grant.id} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-semibold text-white">{grant.user_email || `User #${grant.user_id}`}</div>
                                                    <div className="mt-1 text-xs text-zinc-500">{grant.plan_name_ru || grant.plan_name_en || `Plan #${grant.pricing_plan_id}`}</div>
                                                </div>
                                                <button type="button" onClick={() => void handleToggleGrant(grant)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${grant.is_active ? 'border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/16 hover:text-white' : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/16 hover:text-white'}`}>
                                                    {grant.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                                    {grant.is_active ? 'Отозвать' : 'Включить снова'}
                                                </button>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                                                <span>Выдано: {grant.granted_at ? new Date(grant.granted_at).toLocaleDateString() : '—'}</span>
                                                <span>Истекает: {grant.expires_at ? new Date(grant.expires_at).toLocaleDateString() : 'Без срока'}</span>
                                                <span>Статус: {grant.is_active ? 'активен' : 'неактивен'}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredPlanGrants.length === 0 && <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">По текущим фильтрам выдачи не найдены.</div>}
                                </div>
                            </div>
                        </div>

                        )}

                        {activeTab === 'billing' && (
                        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                                <div className="mb-6 flex items-center justify-between gap-3">
                                    <div>
                                            <h2 className="text-base font-bold text-white">🏷️ Промокоды</h2>
                                            <p className="mt-1 text-xs text-zinc-500">Один аккаунт может использовать один и тот же промокод только один раз. Здесь задаются сроки и лимиты использования.</p>
                                    </div>
                                    {editingPromoId !== null && (
                                        <button type="button" onClick={resetPromoForm} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white">
                                            Отменить редактирование
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleSubmitPromo} className="rounded-[1.5rem] border border-white/8 bg-zinc-950/40 p-5">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input value={promoForm.code} onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} placeholder="PROMO10" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                        <input type="number" step="0.01" min="0" max="100" value={promoForm.discount_percent} onChange={e => setPromoForm({ ...promoForm, discount_percent: e.target.value })} placeholder="Скидка %" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                        <input value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} placeholder="Описание" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40 md:col-span-2" />
                                        <input type="number" step="1" min="1" value={promoForm.max_uses_per_user} onChange={e => setPromoForm({ ...promoForm, max_uses_per_user: e.target.value })} placeholder="Макс. использований на пользователя" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                        <input type="number" step="1" min="1" value={promoForm.max_total_uses} onChange={e => setPromoForm({ ...promoForm, max_total_uses: e.target.value })} placeholder="Макс. использований всего" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Действует с</span>
                                            <input type="datetime-local" value={promoForm.valid_from} onChange={e => setPromoForm({ ...promoForm, valid_from: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                        </label>
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-[11px] font-medium text-zinc-500">Действует до</span>
                                            <input type="datetime-local" value={promoForm.valid_until} onChange={e => setPromoForm({ ...promoForm, valid_until: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                        </label>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                                            <input type="checkbox" checked={promoForm.is_active} onChange={e => setPromoForm({ ...promoForm, is_active: e.target.checked })} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-400 focus:ring-emerald-500/30" />
                                            Активен
                                        </label>
                                        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-400">
                                            {editingPromoId !== null ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            {editingPromoId !== null ? 'Обновить промокод' : 'Создать промокод'}
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-5 space-y-3">
                                    {promoCodes.map((promo) => (
                                        <div key={promo.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">{promo.code}</span>
                                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${promo.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-800/60 text-zinc-400'}`}>{promo.is_active ? 'Активен' : 'Неактивен'}</span>
                                                    </div>
                                                    <div className="mt-3 text-sm text-white">Скидка {promo.discount_percent}%</div>
                                                    <div className="mt-1 text-xs text-zinc-500">{promo.description || 'Без описания'}</div>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                                                        <span>Использований: {promo.total_uses}</span>
                                                        <span>В резерве: {promo.active_reservations}</span>
                                                        <span>На пользователя: {promo.max_uses_per_user}</span>
                                                        <span>Лимит: {promo.max_total_uses ?? '∞'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEditPromo(promo)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Изменить
                                                    </button>
                                                    <button onClick={() => handleDeletePromo(promo.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/16 hover:text-white">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Удалить
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {promoCodes.length === 0 && <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">Промокодов пока нет.</div>}
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div ref={paymentsSectionRef} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-base font-bold text-white">🧾 Логи платежей</h2>
                                            <p className="mt-1 text-xs text-zinc-500">Смотрите, кто платил, какой промокод использовал и сколько кредитов было начислено.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">Записей: {paymentLogs.length}</div>
                                            <button type="button" onClick={exportPaymentsCsv} className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-zinc-300 transition-colors hover:text-white">
                                                <FileText className="h-3.5 w-3.5" />
                                                Экспорт CSV
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <input value={paymentFilters.user_email} onChange={e => setPaymentFilters({ ...paymentFilters, user_email: e.target.value })} placeholder="Фильтр по email" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                        <select value={paymentFilters.status} onChange={e => setPaymentFilters({ ...paymentFilters, status: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40">
                                            <option value="">Любой статус</option>
                                            {['pending', 'succeeded', 'failed', 'expired', 'canceled', 'waiting_for_capture'].map((item) => <option key={item} value={item}>{item}</option>)}
                                        </select>
                                        <select value={paymentFilters.plan_id} onChange={e => setPaymentFilters({ ...paymentFilters, plan_id: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40">
                                            <option value="">Любой тариф</option>
                                            {pricingPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name_ru}</option>)}
                                        </select>
                                        <input value={paymentFilters.utm_code} onChange={e => setPaymentFilters({ ...paymentFilters, utm_code: e.target.value })} placeholder="UTM-код" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/40" />
                                        <input type="datetime-local" value={paymentFilters.date_from} onChange={e => setPaymentFilters({ ...paymentFilters, date_from: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                        <input type="datetime-local" value={paymentFilters.date_to} onChange={e => setPaymentFilters({ ...paymentFilters, date_to: e.target.value })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40" />
                                    </div>
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        <button type="button" onClick={() => void fetchPaymentLogs()} disabled={isFilteringPayments} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-400 disabled:opacity-60">
                                            {isFilteringPayments ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" /> : <Search className="h-3.5 w-3.5" />}
                                            Применить фильтры
                                        </button>
                                        <button type="button" onClick={() => { setPaymentFilters(EMPTY_PAYMENT_FILTERS); void fetchPaymentLogs(EMPTY_PAYMENT_FILTERS); }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:text-white">
                                            <X className="h-3.5 w-3.5" />
                                            Сбросить
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {paymentLogs.slice(0, 12).map((payment) => (
                                            <div key={payment.public_id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-semibold text-white">{payment.user_email || `User #${payment.user_id}`}</div>
                                                        <div className="mt-1 text-xs text-zinc-500">{payment.public_id}</div>
                                                    </div>
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${payment.status === 'succeeded' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : payment.status === 'pending' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-zinc-700 bg-zinc-800/60 text-zinc-400'}`}>{payment.status}</span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                                                    <span>{payment.product_type === 'credit_pack' ? 'Разовое пополнение' : 'Подписка'}</span>
                                                    <span>{payment.amount} {payment.currency}</span>
                                                    <span>{payment.credits} кредитов</span>
                                                    <span>Промокод: {payment.promo_code || '—'}</span>
                                                    <span>Рекуррентный: {payment.recurring_opt_in ? 'Да' : 'Нет'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-base font-bold text-white">🔁 Подписки</h2>
                                            <p className="mt-1 text-xs text-zinc-500">Сохранённые способы оплаты и даты следующего рекуррентного списания.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleProcessSubscriptions}
                                            disabled={isProcessingSubscriptions}
                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
                                        >
                                            {isProcessingSubscriptions ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" /> : <Sparkles className="w-3.5 h-3.5" />}
                                            Списать ожидающие
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {subscriptions.slice(0, 12).map((subscription) => (
                                            <div key={subscription.public_id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-semibold text-white">{subscription.user_email || `User #${subscription.user_id}`}</div>
                                                        <div className="mt-1 text-xs text-zinc-500">Следующее списание: {subscription.next_charge_at ? new Date(subscription.next_charge_at).toLocaleString() : '—'}</div>
                                                    </div>
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${subscription.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : subscription.status === 'past_due' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-zinc-700 bg-zinc-800/60 text-zinc-400'}`}>{subscription.status}</span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                                                    <span>{subscription.amount} {subscription.currency}</span>
                                                    <span>{subscription.credits} кредитов</span>
                                                    <span>Каждые {subscription.interval_days} дн.</span>
                                                    <span>{subscription.payment_method_type || 'сохранённый способ'}</span>
                                                </div>
                                                {subscription.last_error ? <div className="mt-2 text-xs text-red-300">{subscription.last_error}</div> : null}
                                            </div>
                                        ))}
                                        {subscriptions.length === 0 && <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">Подписок пока нет.</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        )}

                        {activeTab === 'pricing' && (
                            <>
                        {/* Per-category pricing */}
                        <div ref={pricingModelSectionRef} />
                        {(['image', 'video', 'audio'] as const).map(cat => {
                            const catPrices = prices.filter(p => (p.category || '') === cat);
                            const catLabels: Record<string, string> = { image: '🖼️ Изображения — стоимость по моделям', video: '🎬 Видео — стоимость по моделям', audio: '🎵 Аудио — стоимость по моделям' };
                            const catDesc: Record<string, string> = {
                                image: 'Можно задавать цену не только по модели и разрешению, но и по aspect ratio, output format, variants, google search и количеству референсов.',
                                video: 'Можно задавать цену по модели, разрешению, длительности и aspect ratio.',
                                audio: 'Укажите стоимость в кредитах для каждой аудио-модели.'
                            };
                            const showDuration = cat === 'video';
                            const showAspectRatio = cat === 'image' || cat === 'video';
                            const showImagePricingFilters = cat === 'image';
                            const showVideoPricingFilters = cat === 'video';

                            return (
                                <div key={cat} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                                    <h2 className="text-base font-bold text-white mb-1">{catLabels[cat]}</h2>
                                    <p className="text-xs text-zinc-500 mb-5">{catDesc[cat]}</p>

                                    {/* Add form */}
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const p = newPrices[cat];
                                        if (!p.model_name) return toast.error('Выберите модель');
                                        if (!p.cost) return toast.error('Укажите стоимость');
                                        try {
                                            const payload = buildPricingPayload(cat, p);
                                            const res = await apiClient.post('/admin/prices', payload);
                                            setPrices([...prices, res.data]);
                                            setNewPrices({ ...newPrices, [cat]: { ...EMPTY_PRICING_FORM_STATE } });
                                            toast.success('Цена добавлена');
                                        } catch { toast.error('Ошибка'); }
                                    }} className="mb-5 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                                            <span className="text-[11px] text-zinc-500 font-medium">Модель *</span>
                                            <select
                                                required
                                                value={newPrices[cat].model_name}
                                                onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], model_name: e.target.value } })}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                            >
                                                <option value="">— Выберите модель —</option>
                                                    {CATEGORY_MODELS[cat].map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                            </select>
                                        </label>
                                        {CATEGORY_RESOLUTIONS[cat].length > 0 && (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-[11px] text-zinc-500 font-medium">Разрешение <span className="text-zinc-700">(необяз.)</span></span>
                                                <select
                                                    value={newPrices[cat].resolution}
                                                    onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], resolution: e.target.value } })}
                                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                                >
                                                    <option value="">Любое разрешение</option>
                                                    {CATEGORY_RESOLUTIONS[cat].map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                            </label>
                                        )}
                                        {showAspectRatio && (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-[11px] text-zinc-500 font-medium">Aspect ratio <span className="text-zinc-700">(необяз.)</span></span>
                                                <select
                                                    value={newPrices[cat].aspect_ratio}
                                                    onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], aspect_ratio: e.target.value } })}
                                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                                >
                                                    <option value="">Любой формат</option>
                                                    {CATEGORY_ASPECT_RATIOS[cat].map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                            </label>
                                        )}
                                        {showDuration && (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-[11px] text-zinc-500 font-medium">Длительность <span className="text-zinc-700">(необяз.)</span></span>
                                                <select
                                                    value={newPrices[cat].duration}
                                                    onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], duration: e.target.value } })}
                                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                                >
                                                    <option value="">Любая длит.</option>
                                                    {Array.from({ length: 13 }, (_, i) => i + 3).map(s => (
                                                        <option key={s} value={String(s)}>{s} сек</option>
                                                    ))}
                                                </select>
                                            </label>
                                        )}
                                        {showImagePricingFilters && (
                                            <>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Формат файла <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select
                                                        value={newPrices[cat].output_format}
                                                        onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], output_format: e.target.value } })}
                                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                                    >
                                                        <option value="">Любой формат</option>
                                                        {IMAGE_OUTPUT_FORMATS.map(format => (
                                                            <option key={format} value={format}>{format}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Количество вариантов <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select
                                                        value={newPrices[cat].num_images}
                                                        onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], num_images: e.target.value } })}
                                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                                    >
                                                        <option value="">Любое</option>
                                                        {['1', '2', '3', '4'].map(value => (
                                                            <option key={value} value={value}>{value}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Google Search <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select
                                                        value={newPrices[cat].google_search}
                                                        onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], google_search: e.target.value } })}
                                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer"
                                                    >
                                                        <option value="">Любое</option>
                                                        <option value="true">Включено</option>
                                                        <option value="false">Выключено</option>
                                                    </select>
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Количество референсов <span className="text-zinc-700">(необяз.)</span></span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="1"
                                                        value={newPrices[cat].reference_count}
                                                        onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], reference_count: e.target.value } })}
                                                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50"
                                                    />
                                                </label>
                                            </>
                                        )}
                                        {showVideoPricingFilters && (
                                            <>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Режим <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select value={newPrices[cat].generation_mode} onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], generation_mode: e.target.value } })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer">
                                                        <option value="">Любой режим</option>
                                                        {VIDEO_PRICING_GENERATION_MODES.map(value => <option key={value} value={value}>{value}</option>)}
                                                    </select>
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Acceleration <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select value={newPrices[cat].acceleration} onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], acceleration: e.target.value } })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer">
                                                        <option value="">Любое</option>
                                                        {VIDEO_ACCELERATION_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
                                                    </select>
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Frames <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select value={newPrices[cat].frame_count} onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], frame_count: e.target.value } })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer">
                                                        <option value="">Любое</option>
                                                        {VIDEO_FRAME_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
                                                    </select>
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">Sound <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select value={newPrices[cat].sound_enabled} onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], sound_enabled: e.target.value } })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer">
                                                        <option value="">Любое</option>
                                                        <option value="true">Включено</option>
                                                        <option value="false">Выключено</option>
                                                    </select>
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[11px] text-zinc-500 font-medium">No watermark <span className="text-zinc-700">(необяз.)</span></span>
                                                    <select value={newPrices[cat].remove_watermark} onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], remove_watermark: e.target.value } })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-white focus:border-violet-500/50 cursor-pointer">
                                                        <option value="">Любое</option>
                                                        <option value="true">Да</option>
                                                        <option value="false">Нет</option>
                                                    </select>
                                                </label>
                                            </>
                                        )}
                                        <label className="flex flex-col gap-1">
                                            <span className="text-[11px] text-zinc-500 font-medium">Стоимость (кредиты) *</span>
                                            <input
                                                required type="number" step="0.5" min="0" placeholder="5.0"
                                                value={newPrices[cat].cost}
                                                onChange={e => setNewPrices({ ...newPrices, [cat]: { ...newPrices[cat], cost: e.target.value } })}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-amber-400 focus:border-amber-500/50"
                                            />
                                        </label>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                        <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors self-end flex items-center gap-1.5">
                                            <Plus className="w-3.5 h-3.5" /> Добавить
                                        </button>
                                        </div>
                                    </form>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-950/50">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Модель</th>
                                                    <th className="px-4 py-3 font-medium">Разрешение</th>
                                                    {showAspectRatio && <th className="px-4 py-3 font-medium">Aspect</th>}
                                                    {showDuration && <th className="px-4 py-3 font-medium">Длительность</th>}
                                                    <th className="px-4 py-3 font-medium">Фильтры</th>
                                                    <th className="px-4 py-3 font-medium text-amber-400">Кредиты</th>
                                                    <th className="px-4 py-3 font-medium text-right">Действия</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                                                {catPrices.map(price => (
                                                    <tr key={price.id} className="hover:bg-zinc-900/40 transition-colors">
                                                        {editingPrice === price.id ? (
                                                            <>
                                                                <td className="py-2 px-4">
                                                                    <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={editPriceData?.model_name || ''} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), model_name: e.target.value })}>
                                                                        {CATEGORY_MODELS[cat].map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                                    </select>
                                                                </td>
                                                                <td className="py-2 px-4">
                                                                    <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={editPriceData?.resolution || ''} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), resolution: e.target.value || null })}>
                                                                        <option value="">Любое</option>
                                                                        {CATEGORY_RESOLUTIONS[cat].map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                </td>
                                                                {showAspectRatio && (
                                                                    <td className="py-2 px-4">
                                                                        <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={String(editPriceData?.aspect_ratio || '')} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), aspect_ratio: e.target.value || null })}>
                                                                            <option value="">Любой</option>
                                                                            {CATEGORY_ASPECT_RATIOS[cat].map(r => <option key={r} value={r}>{r}</option>)}
                                                                        </select>
                                                                    </td>
                                                                )}
                                                                {showDuration && (
                                                                    <td className="py-2 px-4">
                                                                        <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-20" value={editPriceData?.duration || ''} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), duration: e.target.value ? parseInt(e.target.value) : null })}>
                                                                            <option value="">Любая</option>
                                                                            {Array.from({ length: 13 }, (_, i) => i + 3).map(s => <option key={s} value={s}>{s}s</option>)}
                                                                        </select>
                                                                    </td>
                                                                )}
                                                                <td className="py-2 px-4">
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {showImagePricingFilters && (
                                                                            <>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={String(editPriceData?.output_format || '')} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), output_format: e.target.value || null })}>
                                                                                    <option value="">Любой формат</option>
                                                                                    {IMAGE_OUTPUT_FORMATS.map(format => <option key={format} value={format}>{format}</option>)}
                                                                                </select>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={String(editPriceData?.num_images || '')} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), num_images: e.target.value ? parseInt(e.target.value) : null })}>
                                                                                    <option value="">Любые варианты</option>
                                                                                    {['1', '2', '3', '4'].map(value => <option key={value} value={value}>{value}</option>)}
                                                                                </select>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={editPriceData?.google_search === null || editPriceData?.google_search === undefined ? '' : String(editPriceData.google_search)} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), google_search: e.target.value === '' ? null : e.target.value === 'true' })}>
                                                                                    <option value="">Веб-поиск</option>
                                                                                    <option value="true">Вкл</option>
                                                                                    <option value="false">Выкл</option>
                                                                                </select>
                                                                                <input type="number" min="1" placeholder="Рефы" className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={String(editPriceData?.reference_count || '')} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), reference_count: e.target.value ? parseInt(e.target.value) : null })} />
                                                                            </>
                                                                        )}
                                                                        {showVideoPricingFilters && (
                                                                            <>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={String(editPriceData?.generation_mode || '')} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), generation_mode: e.target.value || null })}>
                                                                                    <option value="">Любой режим</option>
                                                                                    {VIDEO_PRICING_GENERATION_MODES.map(value => <option key={value} value={value}>{value}</option>)}
                                                                                </select>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={String(editPriceData?.acceleration || '')} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), acceleration: e.target.value || null })}>
                                                                                    <option value="">Acceleration</option>
                                                                                    {VIDEO_ACCELERATION_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
                                                                                </select>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={String(editPriceData?.frame_count || '')} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), frame_count: e.target.value ? parseInt(e.target.value) : null })}>
                                                                                    <option value="">Любые frames</option>
                                                                                    {VIDEO_FRAME_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
                                                                                </select>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={editPriceData?.sound_enabled === null || editPriceData?.sound_enabled === undefined ? '' : String(editPriceData.sound_enabled)} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), sound_enabled: e.target.value === '' ? null : e.target.value === 'true' })}>
                                                                                    <option value="">Sound</option>
                                                                                    <option value="true">Вкл</option>
                                                                                    <option value="false">Выкл</option>
                                                                                </select>
                                                                                <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-full" value={editPriceData?.remove_watermark === null || editPriceData?.remove_watermark === undefined ? '' : String(editPriceData.remove_watermark)} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), remove_watermark: e.target.value === '' ? null : e.target.value === 'true' })}>
                                                                                    <option value="">No watermark</option>
                                                                                    <option value="true">Да</option>
                                                                                    <option value="false">Нет</option>
                                                                                </select>
                                                                            </>
                                                                        )}
                                                                        {!showImagePricingFilters && !showVideoPricingFilters && <span className="text-zinc-600 text-[11px]">—</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-4"><input type="number" step="0.5" className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-16 text-amber-400" value={editPriceData?.cost ?? ''} onChange={e => setEditPriceData({ ...(editPriceData ?? {}), cost: parseFloat(e.target.value) })} /></td>
                                                                <td className="py-2 px-4 text-right">
                                                                    <div className="flex justify-end gap-1.5">
                                                                        <button onClick={() => handleUpdatePrice(price.id)} className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"><Check className="w-3 h-3" /></button>
                                                                        <button onClick={() => setEditingPrice(null)} className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"><X className="w-3 h-3" /></button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-3 font-medium text-white">
                                                                    {CATEGORY_MODELS[cat].find(m => m.id === price.model_name)?.name || price.model_name}
                                                                </td>
                                                                <td className="px-4 py-3 text-zinc-500">{price.resolution || <span className="text-zinc-700">любое</span>}</td>
                                                                {showAspectRatio && <td className="px-4 py-3 text-zinc-500">{price.aspect_ratio || <span className="text-zinc-700">любой</span>}</td>}
                                                                {showDuration && <td className="px-4 py-3 text-zinc-500">{price.duration ? `${price.duration}s` : <span className="text-zinc-700">любая</span>}</td>}
                                                                <td className="px-4 py-3 text-zinc-500">
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {getPricingFilterBadges(price).length > 0 ? getPricingFilterBadges(price).map((badge) => (
                                                                            <span key={badge} className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-300">{badge}</span>
                                                                        )) : <span className="text-zinc-700">общая цена</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-amber-400">{price.cost} cr</td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex justify-end gap-1.5">
                                                                        <button onClick={() => { setEditingPrice(price.id); setEditPriceData({ ...price }); }} className="p-1.5 text-zinc-500 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                        <button onClick={() => handleDeletePrice(price.id)} className="p-1.5 text-red-500 hover:text-white rounded-md hover:bg-red-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                                {catPrices.length === 0 && (
                                                    <tr><td colSpan={showDuration ? (showAspectRatio ? 7 : 6) : (showAspectRatio ? 6 : 5)} className="text-center py-6 text-zinc-600">Цены для {cat === 'image' ? 'изображений' : cat === 'video' ? 'видео' : 'аудио'} ещё не настроены.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}

                        {/* AI Effects costs */}
                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <h2 className="text-base font-bold text-white mb-1">✨ AI Effects (Catalog Tools)</h2>
                            <p className="text-xs text-zinc-500 mb-5">Credit cost per single generation for each tool in the AI Effects catalog. Changes apply immediately on the website.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { key: 'cost_effect_upscale', label: 'Upscale', default: '2' },
                                    { key: 'cost_effect_remove_bg', label: 'Remove BG', default: '3' },
                                    { key: 'cost_effect_colorize', label: 'Colorize', default: '3' },
                                    { key: 'cost_effect_face_swap', label: 'Face Swap', default: '5' },
                                    { key: 'cost_effect_cartoonize', label: 'Cartoonize', default: '3' },
                                    { key: 'cost_effect_restore', label: 'Restore', default: '3' },
                                    { key: 'cost_effect_text_to_3d', label: 'Text to 3D', default: '5' },
                                ].map(({ key, label, default: def }) => (
                                    <div key={key} className="flex flex-col gap-1.5 bg-zinc-950/40 rounded-xl p-3 border border-zinc-800/50">
                                        <label className="text-xs font-medium text-zinc-400">{label}</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number" step="0.5" min="0"
                                                value={settings[key] ?? def}
                                                onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-amber-400 outline-none focus:border-amber-500/50 w-full"
                                            />
                                            <span className="text-xs text-zinc-600 shrink-0">cr</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={async () => {
                                    const effectKeys = ['cost_effect_upscale', 'cost_effect_remove_bg', 'cost_effect_colorize', 'cost_effect_face_swap', 'cost_effect_cartoonize', 'cost_effect_restore', 'cost_effect_text_to_3d'];
                                    const payload: Record<string, string> = {};
                                    effectKeys.forEach(k => { payload[k] = settings[k] ?? ''; });
                                    try { await apiClient.post('/admin/settings', { settings: payload }); toast.success('Effect prices saved'); }
                                    catch { toast.error('Не удалось сохранить'); }
                                }}
                                className="mt-5 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Save Effect Prices
                            </button>
                        </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* LOGS */}
                {activeTab === 'logs' && (
                    <motion.div key="logs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <Bug className="w-5 h-5 text-red-400" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">Неудачные генерации</h2>
                                    <p className="text-sm text-zinc-500">Последние задачи с ошибкой: статус провайдера, сохранённое сообщение и технические детали.</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {failedTasks.map((task) => (
                                    <div key={task.id} className="rounded-[1.35rem] border border-red-500/14 bg-red-500/[0.04] p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-white">Задача #{task.id} · {task.model || 'Неизвестная модель'}</div>
                                                <div className="mt-1 text-xs text-zinc-500">
                                                    {task.category || 'неизвестно'} · провайдер: {task.provider_status || '—'} · {task.created_at ? new Date(task.created_at).toLocaleString() : '—'}
                                                </div>
                                            </div>
                                            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="mt-3 text-sm text-red-200">{task.error_message || 'Сообщение об ошибке не сохранено'}</div>
                                        {task.error_details ? (
                                            <details className="mt-3 rounded-xl border border-white/8 bg-black/20 p-3">
                                                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Технические детали</summary>
                                                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{task.error_details}</pre>
                                            </details>
                                        ) : null}
                                    </div>
                                ))}
                                {failedTasks.length === 0 && (
                                    <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                                        Неудачных задач пока нет.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Системные логи</h2>
                                    <p className="text-sm text-zinc-500">Постоянные backend-события и исключения для диагностики в админке.</p>
                                </div>
                                <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">
                                    Записей: {logs.length}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {logs.map((entry) => (
                                    <div key={entry.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                                        entry.level === 'ERROR'
                                                            ? 'border-red-500/20 bg-red-500/10 text-red-300'
                                                            : entry.level === 'WARNING'
                                                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                                    }`}>
                                                        {entry.level}
                                                    </span>
                                                    <span className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                                                        {entry.scope}
                                                    </span>
                                                    {entry.event ? (
                                                        <span className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                                            {entry.event}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="mt-3 text-sm font-medium text-white">{entry.message}</div>
                                                <div className="mt-1 text-xs text-zinc-500">
                                                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                                                    {entry.task_id ? ` · задача #${entry.task_id}` : ''}
                                                    {entry.user_id ? ` · пользователь #${entry.user_id}` : ''}
                                                    {entry.method && entry.path ? ` · ${entry.method} ${entry.path}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        {entry.details ? (
                                            <details className="mt-3 rounded-xl border border-white/8 bg-black/20 p-3">
                                                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Детали</summary>
                                                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{entry.details}</pre>
                                            </details>
                                        ) : null}
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                                        Логов пока нет.
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* SETTINGS */}
                {activeTab === 'settings' && (
                    <motion.div key="settings" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
                        className="flex flex-col gap-6">
                        <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
                            {/* Social links */}
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 max-w-2xl">
                                <div className="flex items-center gap-2 mb-5">
                                    <Link2 className="w-5 h-5 text-blue-400" />
                                    <h2 className="text-xl font-bold text-white">Ссылки на соцсети</h2>
                                </div>
                                <div className="space-y-4">
                                    {['telegram', 'instagram', 'discord', 'twitter'].map(platform => (
                                        <div key={platform} className="flex flex-col gap-1.5">
                                            <label className="text-sm font-semibold text-zinc-300 capitalize">{platform}</label>
                                            <input type="url" placeholder={`https://${platform}.com/...`} value={settings[platform] || ''} onChange={e => setSettings({ ...settings, [platform]: e.target.value })}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-blue-500/50 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Prompts */}
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 max-w-2xl">
                                <div className="flex items-center gap-2 mb-5">
                                    <Sparkles className="w-5 h-5 text-pink-400" />
                                    <h2 className="text-xl font-bold text-white">Промпты для AI-эффектов</h2>
                                </div>
                                {['prompt_face_swap', 'prompt_colorize', 'prompt_cartoonize'].map(key => (
                                    <div key={key} className="flex flex-col gap-1.5 mb-4">
                                        <label className="text-sm font-semibold text-zinc-300 capitalize">Промпт: {key.replace('prompt_', '').replace('_', ' ')}</label>
                                        <textarea rows={3} placeholder={`Введите инструкции для ${key}...`} value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-pink-500/50 transition-colors resize-none" />
                                    </div>
                                ))}
                            </div>

                            {/* Legal documents */}
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-5 h-5 text-emerald-400" />
                                    <h2 className="text-xl font-bold text-white">Юридические документы</h2>
                                </div>
                                <p className="text-sm text-zinc-500 mb-5">Эти тексты публикуются на отдельных URL и редактируются прямо из админки. Поддерживается обычный текст с переносами строк.</p>
                                <div className="grid md:grid-cols-2 gap-5">
                                    {[
                                        { key: 'terms_en', label: 'Terms of Service (EN)' },
                                        { key: 'terms_ru', label: 'Terms of Service (RU)' },
                                        { key: 'privacy_en', label: 'Privacy Policy (EN)' },
                                        { key: 'privacy_ru', label: 'Privacy Policy (RU)' },
                                        { key: 'cookies_en', label: 'Cookies Policy (EN)' },
                                        { key: 'cookies_ru', label: 'Cookies Policy (RU)' },
                                        { key: 'refund_en', label: 'Refund Policy (EN)' },
                                        { key: 'refund_ru', label: 'Refund Policy (RU)' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
                                            <textarea rows={10} placeholder={`Введите текст для "${label}"...`} value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none text-white focus:border-emerald-500/50 transition-colors resize-y" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <button type="submit" className="px-8 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
                                    Сохранить все настройки
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {(selectedUserDetail || isLoadingUserDetail) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedUserDetail(null)}
                    >
                        <motion.div
                            initial={{ x: 36, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 36, opacity: 0 }}
                            className="h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {isLoadingUserDetail || !selectedUserDetail ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                                        <span className="text-sm text-zinc-500">Загрузка профиля...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            {selectedUserDetail.user.avatar_url ? (
                                                <img src={selectedUserDetail.user.avatar_url} alt={selectedUserDetail.user.display_name || selectedUserDetail.user.email} className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
                                            ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-xl font-bold text-white">
                                                    {(selectedUserDetail.user.display_name || selectedUserDetail.user.email).charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Профиль пользователя</div>
                                            <h3 className="mt-2 text-xl font-bold text-white">{selectedUserDetail.user.display_name || selectedUserDetail.user.email}</h3>
                                            <div className="mt-1 text-sm text-zinc-500">{selectedUserDetail.user.email}</div>
                                                {selectedUserDetail.user.display_name ? <div className="mt-1 text-xs text-zinc-400">Ник: {selectedUserDetail.user.display_name}</div> : null}
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedUserDetail(null)} className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-300 transition-colors hover:text-white">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Баланс</div>
                                            <div className="mt-2 text-lg font-semibold text-amber-400">{selectedUserDetail.user.balance} 🪙</div>
                                        </div>
                                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Потрачено</div>
                                            <div className="mt-2 text-lg font-semibold text-white">₽ {Number(selectedUserDetail.stats.total_spent || 0).toLocaleString()}</div>
                                        </div>
                                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Задачи</div>
                                            <div className="mt-2 text-lg font-semibold text-white">{selectedUserDetail.stats.tasks_count}</div>
                                        </div>
                                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">UTM</div>
                                            <div className="mt-2 text-sm font-semibold text-cyan-300">{selectedUserDetail.user.utm_code || '—'}</div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                                        <div className="mb-5">
                                            <div className="mb-3 text-sm font-semibold text-white">Модерация профиля</div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <button type="button" onClick={() => void handleModerateSelectedUser({ avatar_url: null })} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:text-white">
                                                    Удалить аватар
                                                </button>
                                                <button type="button" onClick={() => void handleModerateSelectedUser({ display_name: null })} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:text-white">
                                                    Очистить ник
                                                </button>
                                            </div>
                                            <textarea
                                                value={moderationNoteDraft || selectedUserDetail.user.moderation_notice || ''}
                                                onChange={(e) => setModerationNoteDraft(e.target.value)}
                                                rows={3}
                                                placeholder="Опишите, что именно пользователь должен исправить в профиле."
                                                className="mt-3 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-red-500/40"
                                            />
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleModerateSelectedUser({
                                                        moderation_notice: moderationNoteDraft || selectedUserDetail.user.moderation_notice || null,
                                                        moderation_required: true,
                                                    })}
                                                    className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-400"
                                                >
                                                    Отправить предупреждение
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setModerationNoteDraft('');
                                                        void handleModerateSelectedUser({ moderation_notice: null, moderation_required: false });
                                                    }}
                                                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
                                                >
                                                    Очистить предупреждение
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-3 text-sm font-semibold text-white">Выданные доступы</div>
                                        <div className="space-y-3">
                                            {selectedUserDetail.grants.map((grant) => (
                                                <div key={grant.id} className="rounded-xl border border-white/8 bg-black/20 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-semibold text-white">{grant.plan_name_ru || grant.plan_name_en || `Plan #${grant.pricing_plan_id}`}</div>
                                                            <div className="mt-1 text-xs text-zinc-500">Истекает: {grant.expires_at ? new Date(grant.expires_at).toLocaleDateString() : 'Без срока'}</div>
                                                        </div>
                                                        <button type="button" onClick={() => void handleToggleGrant(grant)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${grant.is_active ? 'border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/16 hover:text-white' : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/16 hover:text-white'}`}>
                                                            {grant.is_active ? 'Отозвать' : 'Включить снова'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedUserDetail.grants.length === 0 && <div className="text-sm text-zinc-500">Выданных доступов пока нет.</div>}
                                        </div>
                                    </div>

                                    <div className="grid gap-6 xl:grid-cols-2">
                                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                                            <div className="mb-3 text-sm font-semibold text-white">Последние платежи</div>
                                            <div className="space-y-3">
                                                {selectedUserDetail.payments.map((payment) => (
                                                    <div key={payment.id} className="rounded-xl border border-white/8 bg-black/20 p-4 text-sm">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0 break-all font-semibold text-white">{payment.public_id}</div>
                                                            <div className="text-xs text-zinc-400">{payment.status}</div>
                                                        </div>
                                                        <div className="mt-2 text-xs text-zinc-400">{payment.amount} {payment.currency} · {payment.credits} кредитов</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                                            <div className="mb-3 text-sm font-semibold text-white">Последние задачи</div>
                                            <div className="space-y-3">
                                                {selectedUserDetail.tasks.map((task) => (
                                                    <div key={task.id} className="rounded-xl border border-white/8 bg-black/20 p-4 text-sm">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="font-semibold text-white">{task.model}</div>
                                                            <div className="text-xs text-zinc-400">{task.status}</div>
                                                        </div>
                                                        <div className="mt-2 text-xs text-zinc-400">{task.category} · {task.cost} кредитов</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Balance modal */}
            <AnimatePresence>
                {balanceModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setBalanceModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="font-bold text-white mb-1">Изменить баланс</h3>
                            <p className="text-sm text-zinc-500 mb-4">{balanceModal.email} · сейчас: <span className="text-amber-400 font-semibold">{balanceModal.balance} 🪙</span></p>
                            <p className="text-xs text-zinc-600 mb-3">Положительное число добавляет кредиты, отрицательное списывает.</p>
                            <input
                                type="number" step="1" autoFocus placeholder="например, +50 или -20"
                                value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdjustBalance()}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 mb-4"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setBalanceModal(null)} className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all">Отмена</button>
                                <button onClick={handleAdjustBalance} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold text-black transition-colors">Применить</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
