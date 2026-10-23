export type StoredUtmAttribution = {
    utm_code?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    landing_path?: string | null;
    captured_at?: string | null;
};

const STORAGE_KEY = 'globus:utm-attribution';

function normalizeValue(value: string | null | undefined) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized || null;
}

export function captureUtmAttributionFromSearch(
    searchParams: { get(name: string): string | null },
    pathname?: string | null,
) {
    if (typeof window === 'undefined') return null;

    const utmCode = normalizeValue(searchParams.get('utm_code') || searchParams.get('ref'));
    const utmSource = normalizeValue(searchParams.get('utm_source') || utmCode);
    const utmMedium = normalizeValue(searchParams.get('utm_medium') || 'creator');
    const utmCampaign = normalizeValue(searchParams.get('utm_campaign') || 'bloggers');

    if (!utmCode && !utmSource && !utmMedium && !utmCampaign) {
        return null;
    }

    const payload: StoredUtmAttribution = {
        utm_code: utmCode || utmSource,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        landing_path: pathname || null,
        captured_at: new Date().toISOString(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
}

export function getStoredUtmAttribution(): StoredUtmAttribution | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as StoredUtmAttribution;
        return {
            utm_code: normalizeValue(parsed.utm_code),
            utm_source: normalizeValue(parsed.utm_source),
            utm_medium: normalizeValue(parsed.utm_medium),
            utm_campaign: normalizeValue(parsed.utm_campaign),
            landing_path: normalizeValue(parsed.landing_path),
            captured_at: normalizeValue(parsed.captured_at),
        };
    } catch {
        return null;
    }
}

export function clearStoredUtmAttribution() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
}
