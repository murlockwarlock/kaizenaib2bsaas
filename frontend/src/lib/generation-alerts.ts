type Translator = (key: string) => string;

function normalizeMessage(message: string | null | undefined) {
  return String(message || '').trim().toLowerCase();
}

export function localizeProviderError(
  message: string | null | undefined,
  locale: 'ru' | 'en',
) {
  const normalized = normalizeMessage(message);
  if (normalized.includes('ai generation is disabled') || normalized.includes('provider access is configured')) {
    return locale === 'ru'
      ? 'Генерации временно недоступны: доступ к провайдеру ещё не настроен.'
      : 'Generations are temporarily unavailable because provider access is not configured yet.';
  }
  if (normalized.includes('billing is disabled')) {
    return locale === 'ru'
      ? 'Оплата временно недоступна: платёжный провайдер ещё не настроен.'
      : 'Payments are temporarily unavailable because the payment provider is not configured yet.';
  }
  return message || undefined;
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

export function getGenerationFailureDescription(
  message: string | null | undefined,
  t: Translator,
  creditsRefunded = true,
) {
  if (!creditsRefunded) {
    return t('failed_provider_pending_desc');
  }
  if (isProviderOverloadMessage(message)) {
    return t('failed_overload_desc');
  }

  if (message && String(message).trim()) {
    return `${String(message).trim()} ${t('failed_refund_hint')}`.trim();
  }

  return t('failed_desc');
}
