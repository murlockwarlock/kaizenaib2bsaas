// ============================================================
// API Response Types for KaizenAI
// ============================================================

// --- User & Auth ---
export interface User {
    id: number;
    email: string;
    display_name?: string | null;
    avatar_url?: string | null;
    moderation_notice?: string | null;
    moderation_required?: boolean;
    balance: number;
    is_active: boolean;
    is_verified: boolean;
    is_superuser: boolean;
}

export interface AuthToken {
    access_token: string;
    token_type: string;
}

export interface UserNotification {
    id: number;
    kind: 'generation_queued' | 'generation_completed' | 'generation_failed' | string;
    title?: string | null;
    message?: string | null;
    is_read: boolean;
    task_id?: number | null;
    metadata?: Record<string, unknown> | null;
    read_at?: string | null;
    created_at?: string | null;
}

export interface NotificationListResponse {
    items: UserNotification[];
    unread_count: number;
}

export interface SocialProvidersConfig {
    google: boolean;
    apple: boolean;
    vk: boolean;
}

// --- Generation Tasks ---
export interface GenerationTask {
    id: number;
    user_id: number;
    model: string;
    category: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'success';
    result_url: string | null;
    output_url: string | null;
    input_url: string | null;
    prompt: string | null;
    cost: number;
    provider_status?: string | null;
    error_message?: string | null;
    error_details?: string | null;
    settings_snapshot_json?: string | null;
    settings_snapshot?: Record<string, unknown> | null;
    view_count?: number;
    started_at?: string | null;
    completed_at?: string | null;
    resolution: string | null;
    duration: number | null;
    is_public: boolean;
    is_liked: boolean;
    likes_count: number;
    author_id?: number | null;
    author_display_name?: string | null;
    author_avatar_url?: string | null;
    author_email?: string | null;
    created_at: string;
}

export interface PublicProfileSummary {
    id: number;
    display_name: string | null;
    avatar_url: string | null;
}

export interface PublicProfileStats {
    posts: number;
    likes: number;
    views: number;
    counts: Record<string, number>;
}

export interface PublicProfileResponse {
    profile: PublicProfileSummary;
    stats: PublicProfileStats;
    tasks: GenerationTask[];
    top_tasks: GenerationTask[];
}

// --- Admin: Promotions ---
export interface Promotion {
    id: number;
    title: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
}

// --- Admin: Banners ---
export interface Banner {
    id: number;
    title: string;
    subtitle: string | null;
    description: string | null;
    image_url: string | null;
    link: string | null;
    is_active: boolean;
}

// --- Admin: FAQ ---
export interface FAQ {
    id: number;
    question: string;
    answer: string;
    is_active: boolean;
    order_index: number;
}

// --- Admin: Generation Examples ---
export interface GenerationExample {
    id: number;
    title: string;
    category: string;
    media_url: string;
    prompt?: string | null;
    model?: string | null;
    is_trending: boolean;
}

export interface FeaturedAudio {
    id: number;
    source_task_id: number | null;
    title: string;
    subtitle: string | null;
    description: string | null;
    prompt: string | null;
    audio_url: string;
    cover_image_url: string | null;
    model: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface PricingPlan {
    id: number;
    name_ru: string;
    name_en: string;
    description_ru: string | null;
    description_en: string | null;
    badge_ru: string | null;
    badge_en: string | null;
    billing_period_ru: string | null;
    billing_period_en: string | null;
    cta_label_ru: string | null;
    cta_label_en: string | null;
    cta_url: string | null;
    features_ru: string | null;
    features_en: string | null;
    currency_symbol: string;
    price: number;
    credits: number;
    is_recurring: boolean;
    recurring_days: number;
    is_featured: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface PlanInvite {
    id: number;
    email: string;
    pricing_plan_id: number;
    plan_name_ru: string | null;
    plan_name_en: string | null;
    status: string;
    error_message: string | null;
    expires_at: string | null;
    sent_at: string | null;
    used_at: string | null;
    used_by_user_id: number | null;
    used_by_email: string | null;
    created_at: string | null;
}

export interface UTMTrackingLink {
    id: number;
    code: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    target_path: string;
    note: string | null;
    generated_url: string;
    is_active: boolean;
    registrations_count: number;
    buyers_count: number;
    purchases_count: number;
    revenue_amount: number;
    created_at: string | null;
}

export interface PlanInviteResolve {
    email: string;
    pricing_plan_id: number;
    plan_name_ru: string;
    plan_name_en: string;
    expires_at: string | null;
    status: string;
}

export interface BillingQuote {
    purchase_type: 'plan' | 'credit_pack';
    plan_id: number | null;
    item_name: string;
    currency: string;
    original_amount: number;
    discount_amount: number;
    discount_percent: number;
    final_amount: number;
    credits: number;
    credits_rate_per_100: number;
    promo_code: string | null;
    promo_description: string | null;
    is_recurring_available: boolean;
    recurring_days: number;
}

export interface BillingPayment {
    id: number;
    public_id: string;
    user_id: number;
    user_email?: string | null;
    product_type: 'plan' | 'credit_pack';
    pricing_plan_id: number | null;
    provider: string;
    provider_payment_id: string | null;
    provider_status: string | null;
    status: string;
    original_amount: number;
    amount: number;
    discount_amount: number;
    discount_percent: number;
    credits_rate_per_100: number;
    currency: string;
    credits: number;
    description: string | null;
    confirmation_url: string | null;
    return_url: string | null;
    expires_at: string | null;
    paid_at: string | null;
    canceled_at: string | null;
    promo_code: string | null;
    save_payment_method: boolean;
    recurring_opt_in: boolean;
    payment_method_id: string | null;
    payment_method_type: string | null;
    created_at: string | null;
}

export interface PromoCode {
    id: number;
    code: string;
    description: string | null;
    discount_percent: number;
    max_total_uses: number | null;
    max_uses_per_user: number;
    is_active: boolean;
    valid_from: string | null;
    valid_until: string | null;
    total_uses: number;
    active_reservations: number;
    created_at: string | null;
}

export interface BillingSubscription {
    id: number;
    public_id: string;
    user_id: number;
    user_email?: string | null;
    pricing_plan_id: number;
    status: string;
    amount: number;
    currency: string;
    credits: number;
    interval_days: number;
    payment_method_id: string;
    payment_method_type: string | null;
    cancel_at_period_end: boolean;
    next_charge_at: string | null;
    last_payment_id: number | null;
    last_error: string | null;
    canceled_at: string | null;
    created_at: string | null;
}

export interface PricingPlanSummary {
    id: number;
    name_ru: string;
    name_en: string;
    badge_ru: string | null;
    badge_en: string | null;
    price: number;
    credits: number;
    currency_symbol: string;
    is_recurring: boolean;
    recurring_days: number;
    is_featured: boolean;
}

export interface BillingPlanStatus {
    current_plan: PricingPlanSummary | null;
    next_plan: PricingPlanSummary | null;
    active_subscription: BillingSubscription | null;
}

// --- Admin: Site Settings ---
export type SiteSettings = Record<string, string>;

// --- Admin: Model Pricing ---
export interface ModelPricing {
    id: number;
    category?: string | null;
    model_name: string;
    version: string | null;
    duration: number | null;
    resolution: string | null;
    aspect_ratio: string | null;
    output_format: string | null;
    num_images: number | null;
    google_search: boolean | null;
    reference_count: number | null;
    generation_mode: string | null;
    acceleration: string | null;
    frame_count: number | null;
    sound_enabled: boolean | null;
    remove_watermark: boolean | null;
    cost: number;
    is_active: boolean;
}

// --- Admin: Feedback ---
export interface Feedback {
    id: number;
    user_id: number;
    message: string;
    created_at: string;
}

export interface AdminLogEntry {
    id: number;
    level: string;
    scope: string;
    event: string | null;
    message: string;
    details: string | null;
    path: string | null;
    method: string | null;
    task_id: number | null;
    user_id: number | null;
    created_at: string;
}

// --- Generation Request ---
export interface GenerateRequest {
    category: string;
    model: string;
    inputs: Record<string, unknown>;
    resolution?: string;
    duration?: number;
    is_public?: boolean;
}
