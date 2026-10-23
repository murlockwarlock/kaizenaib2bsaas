export type PublicPriceEntry = {
  category: string;
  is_active: boolean;
  model_name?: string | null;
  resolution?: string | null;
  duration?: number | null;
  aspect_ratio?: string | null;
  output_format?: string | null;
  num_images?: number | null;
  google_search?: boolean | null;
  reference_count?: number | null;
  generation_mode?: string | null;
  acceleration?: string | null;
  frame_count?: number | null;
  sound_enabled?: boolean | null;
  remove_watermark?: boolean | null;
  cost: number | null;
};

function normalizePricingValue(value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized.toLowerCase() : null;
  }
  return value ?? null;
}

export function selectBestPrice(
  prices: PublicPriceEntry[],
  category: string,
  modelId: string,
  filters: {
    resolution?: string | null;
    duration?: number | null;
    aspect_ratio?: string | null;
    output_format?: string | null;
    num_images?: number | null;
    google_search?: boolean | null;
    reference_count?: number | null;
    generation_mode?: string | null;
    acceleration?: string | null;
    frame_count?: number | null;
    sound_enabled?: boolean | null;
    remove_watermark?: boolean | null;
  }
) {
  const modelMatches = prices.filter((price) => {
    const pName = (price.model_name || '').toLowerCase();
    return price.category === category && price.is_active && pName === modelId.toLowerCase();
  });
  if (!modelMatches.length) return null;

  const dimensions: Array<keyof typeof filters> = [
    'resolution',
    'duration',
    'aspect_ratio',
    'output_format',
    'num_images',
    'google_search',
    'reference_count',
    'generation_mode',
    'acceleration',
    'frame_count',
    'sound_enabled',
    'remove_watermark',
  ];

  let bestMatch: PublicPriceEntry | null = null;
  let bestScore = -1;

  for (const candidate of modelMatches) {
    let score = 0;
    let matched = true;

    for (const field of dimensions) {
      const candidateValue = normalizePricingValue(candidate[field]);
      const requestValue = normalizePricingValue(filters[field]);

      if (candidateValue === null) continue;
      if (requestValue === null || requestValue !== candidateValue) {
        matched = false;
        break;
      }
      score += 1;
    }

    if (matched && score > bestScore) {
      bestMatch = candidate;
      bestScore = score;
    }
  }

  return bestMatch;
}
