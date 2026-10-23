type Translator = (key: string) => string;

function normalizeMessage(message: string | null | undefined) {
  return String(message || '').trim().toLowerCase();
}

export function isProviderOverloadMessage(message: string | null | undefined) {
  const normalized = normalizeMessage(message);
  if (!normalized) return false;

  return [
    'heavy load',
    'high load',
    'try again later',
    'not responding',
    'temporarily unavailable',
    'service is busy',
    'service unavailable',
    'server busy',
    'overloaded',
    'перегруж',
    'высокая нагрузка',
    'попробуйте позже',
    'временно недоступ',
  ].some((token) => normalized.includes(token));
}

export function getGenerationFailureDescription(message: string | null | undefined, t: Translator) {
  if (isProviderOverloadMessage(message)) {
    return t('failed_overload_desc');
  }

  if (message && String(message).trim()) {
    return `${String(message).trim()} ${t('failed_refund_hint')}`.trim();
  }

  return t('failed_desc');
}
