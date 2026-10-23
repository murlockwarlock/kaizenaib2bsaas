export type PromptSafetyIssue = {
  reason: 'minor_reference';
  offendingTerm: string;
  message: string;
  suggestion: string;
};

const MINOR_PATTERNS = [
  /\bschoolgirl\b/i,
  /\bschool girl\b/i,
  /\bschoolboy\b/i,
  /\bschool boy\b/i,
  /\bunderage\b/i,
  /\bminor\b/i,
  /\bteen girl\b/i,
  /\bteen boy\b/i,
  /\blittle girl\b/i,
  /\blittle boy\b/i,
  /\bchild\b/i,
  /\bkid\b/i,
];

function buildLocaleCopy(locale: 'ru' | 'en', offendingTerm: string): PromptSafetyIssue {
  if (locale === 'ru') {
    return {
      reason: 'minor_reference',
      offendingTerm,
      message: `Промпт содержит образ несовершеннолетнего ("${offendingTerm}"). Такой запрос лучше переписать до отправки.`,
      suggestion: 'Замените персонажа на взрослого: например "young woman", "adult woman", "young man" или "adult man".',
    };
  }

  return {
    reason: 'minor_reference',
    offendingTerm,
    message: `This prompt references a minor ("${offendingTerm}"). Rewrite it before sending.`,
    suggestion: 'Replace the character with an adult, for example "young woman", "adult woman", "young man" or "adult man".',
  };
}

export function getPromptSafetyIssue(prompt: string, locale: 'ru' | 'en'): PromptSafetyIssue | null {
  const normalized = String(prompt || '').trim();
  if (!normalized) return null;

  for (const pattern of MINOR_PATTERNS) {
    const match = normalized.match(pattern);
    if (match?.[0]) {
      return buildLocaleCopy(locale, match[0]);
    }
  }

  return null;
}
