import axios from 'axios';

import type { BillingPayment, BillingPlanStatus, BillingQuote, NotificationListResponse, PlanInviteResolve, PublicProfileResponse, SocialProvidersConfig } from './types';
import { getPromptSafetyIssue } from './prompt-safety';

const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // Always proxy API requests via Next.js when in the browser to support ngrok easily
        return '/api/v1';
    }
    const backendUrl = (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    return `${backendUrl}/api/v1`;
};

const API_URL = getApiUrl();

export const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// --- Auth API ---

export const login = async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects 'username' instead of 'email'
    formData.append('password', password);

    const response = await apiClient.post('/auth/login', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return response.data; // { access_token: string, token_type: string }
};

export const establishSession = async (token: string) => {
    const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
        credentials: 'same-origin',
    });
    if (!response.ok) {
        throw new Error('Failed to establish session');
    }
};

export const clearSession = async () => {
    const response = await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'same-origin',
    });
    if (!response.ok) {
        throw new Error('Failed to clear session');
    }
};

export const register = async (
    email: string,
    password: string,
    attribution?: {
        utm_code?: string | null;
        utm_source?: string | null;
        utm_medium?: string | null;
        utm_campaign?: string | null;
    } | null,
) => {
    const response = await apiClient.post('/auth/register', {
        email,
        password,
        utm_code: attribution?.utm_code || null,
        utm_source: attribution?.utm_source || null,
        utm_medium: attribution?.utm_medium || null,
        utm_campaign: attribution?.utm_campaign || null,
    });
    return response.data; // { email, id, balance, is_active }
};

export const getMe = async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
}

export const getSocialProvidersConfig = async () => {
    const response = await apiClient.get<SocialProvidersConfig>('/auth/oauth/providers');
    return response.data;
};

export const getMyNotifications = async (limit: number = 20) => {
    const response = await apiClient.get<NotificationListResponse>('/auth/notifications', {
        params: { limit },
    });
    return response.data;
};

export const markNotificationRead = async (notificationId: number, limit: number = 20) => {
    const response = await apiClient.post<NotificationListResponse>(`/auth/notifications/${notificationId}/read`, null, {
        params: { limit },
    });
    return response.data;
};

export const markAllNotificationsRead = async (limit: number = 20) => {
    const response = await apiClient.post<NotificationListResponse>('/auth/notifications/read-all', null, {
        params: { limit },
    });
    return response.data;
};

export const updateMyProfile = async (payload: { display_name?: string | null; avatar_url?: string | null }) => {
    const response = await apiClient.put('/auth/me/profile', payload);
    return response.data;
};

export const verifyEmail = async (email: string, code: string) => {
    const response = await apiClient.post('/auth/verify-email', { email, code });
    return response.data; // { status: "verified" | "already_verified" }
};

export const resendVerification = async (email: string) => {
    const response = await apiClient.post('/auth/resend-code', { email });
    return response.data; // { status: "sent" }
};

export const requestPasswordReset = async (email: string) => {
    const response = await apiClient.post('/auth/request-password-reset', { email });
    return response.data;
};

export const resetPassword = async (email: string, code: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', { email, code, new_password: newPassword });
    return response.data;
};

export const resolvePlanInvite = async (token: string) => {
    const response = await apiClient.get<PlanInviteResolve>('/auth/invites/resolve', {
        params: { token },
    });
    return response.data;
};

export const claimPlanInvite = async (token: string) => {
    const response = await apiClient.post('/auth/invites/claim', { token });
    return response.data;
};

export const incrementPublicTaskView = async (taskId: number) => {
    const response = await apiClient.post(`/public/tasks/${taskId}/view`);
    return response.data;
};

export const getPublicProfile = async (userId: number, category: string = 'all') => {
    const response = await apiClient.get<PublicProfileResponse>(`/public/profiles/${userId}`, {
        params: { category },
    });
    return response.data;
};

// --- Files API ---

export const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data; // { url: string }
};

// --- AI Tasks API ---

export const startGeneration = async (toolType: string, imageUrl: string, isPublic: boolean = false, resolution?: string) => {
    if (toolType === 'text_to_3d') {
        const safetyIssue = getPromptSafetyIssue(imageUrl, 'en');
        if (safetyIssue) {
            throw new Error(`${safetyIssue.message} ${safetyIssue.suggestion}`.trim());
        }
    }

    const toolInput =
        toolType === 'text_to_3d'
            ? { prompt: imageUrl }
            : { [toolType === 'upscale' ? 'image_url' : 'image']: imageUrl };

    const payload = {
        category: "image",
        model: toolType, // upscale, remove_bg, colorize
        inputs: toolInput,
        resolution: resolution || (toolType === 'upscale' ? '2x' : 'original'),
        is_public: isPublic
    };
    const response = await apiClient.post('/ai/generate', payload);
    return response.data; // { task_id: int, status: string }
};

export const checkStatus = async (taskId: number) => {
    const response = await apiClient.get(`/ai/status/${taskId}`);
    return response.data; // { task_id: int, status: string, result_url: string }
};

// --- Billing API ---

type BillingQuoteInput = {
    purchaseType?: 'plan' | 'credit_pack';
    planId?: number;
    amountRub?: number;
    promoCode?: string;
};

type BillingCheckoutInput = BillingQuoteInput & {
    locale: string;
    enableRecurring?: boolean;
};

export const getBillingQuote = async ({ planId, amountRub, promoCode, purchaseType = 'plan' }: BillingQuoteInput) => {
    const response = await apiClient.post<BillingQuote>('/billing/quote', {
        purchase_type: purchaseType,
        plan_id: planId ?? null,
        amount_rub: amountRub ?? null,
        promo_code: promoCode || null,
    });
    return response.data;
};

export const createBillingCheckout = async ({
    planId,
    amountRub,
    locale,
    promoCode,
    enableRecurring = false,
    purchaseType = 'plan',
}: BillingCheckoutInput) => {
    const response = await apiClient.post<{ payment: BillingPayment; checkout_url: string }>('/billing/checkout', {
        purchase_type: purchaseType,
        plan_id: planId ?? null,
        amount_rub: amountRub ?? null,
        promo_code: promoCode || null,
        locale,
        enable_recurring: enableRecurring,
    });
    return response.data;
};

export const getBillingPayment = async (publicId: string) => {
    const response = await apiClient.get<BillingPayment>(`/billing/payments/${publicId}`);
    return response.data;
};

export const refreshBillingPayment = async (publicId: string) => {
    const response = await apiClient.post<BillingPayment>(`/billing/payments/${publicId}/refresh`);
    return response.data;
};

export const getMyBillingPlan = async () => {
    const response = await apiClient.get<BillingPlanStatus>('/billing/me/plan');
    return response.data;
};
