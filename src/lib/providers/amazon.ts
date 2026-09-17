import { z } from 'zod';
import { deriveConditions } from '@/lib/conditions';
import { serverEnv } from '@/lib/env';
import { buildUrl, fetchJson } from '@/lib/http';
import { createOfferId, normalizeGtin, round2 } from '@/lib/normalize';
import { OfferSchema, type Offer } from '@/lib/types';
import { nowIso, type Provider, type ProviderContext } from '@/lib/providers/types';

const ENDPOINT = 'https://api.rainforestapi.com/request';

const PriceSchema = z
  .object({
    value: z.number().optional(),
    currency: z.string().optional(),
    raw: z.string().optional(),
  })
  .passthrough();

const SearchResultSchema = z
  .object({
    title: z.string().min(1),
    asin: z.string().optional(),
    link: z.string().optional(),
    image: z.string().optional(),
    rating: z.number().optional(),
    ratings_total: z.number().optional(),
    price: PriceSchema.optional(),
    rrp: PriceSchema.optional(),
    is_prime: z.boolean().optional(),
    prime: z.boolean().optional(),
    is_exclusive: z.boolean().optional(),
    is_prime_exclusive_deal: z.boolean().optional(),
    availability: z
      .object({ raw: z.string().optional(), in_stock: z.boolean().optional() })
      .passthrough()
      .optional(),
    deal_badge: z.string().optional(),
    coupon_badge: z.string().optional(),
    delivery: z
      .object({ tagline: z.string().optional(), price: PriceSchema.optional() })
      .passthrough()
      .optional(),
    gtin: z.union([z.string(), z.number()]).optional(),
    ean: z.union([z.string(), z.number()]).optional(),
    upc: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const ResponseSchema = z
  .object({
    request_info: z
      .object({ success: z.boolean().optional(), message: z.string().optional() })
      .passthrough()
      .optional(),
    search_results: z.array(SearchResultSchema).optional(),
  })
  .passthrough();

export type RainforestSearchResult = z.infer<typeof SearchResultSchema>;

function amazonUrl(result: RainforestSearchResult): string | null {
  if (result.link && result.link.startsWith('http')) return result.link;
  if (result.asin) return `https://www.amazon.com/dp/${encodeURIComponent(result.asin)}`;
  return null;
}

function usdValue(price: z.infer<typeof PriceSchema> | undefined): number | null {
  if (!price || typeof price.value !== 'number' || !Number.isFinite(price.value)) return null;
  // Rainforest reports the marketplace currency; amazon.com is always USD, but
  // guard anyway so a mis-set `amazon_domain` cannot produce bogus comparisons.
  if (price.currency && price.currency.toUpperCase() !== 'USD') return null;
  return price.value >= 0 ? round2(price.value) : null;
}

/** Map one Rainforest search result onto our Offer shape, or drop it. */
export function mapAmazonResult(result: RainforestSearchResult, lastUpdated: string): Offer | null {
  const url = amazonUrl(result);
  if (!url) return null;

  const price = usdValue(result.price);
  if (price === null || price <= 0) return null;

  const originalPrice = usdValue(result.rrp);
  const availabilityText = result.availability?.raw ?? '';
  const inStock =
    result.availability?.in_stock ??
    !/out of stock|unavailable|currently unavailable/i.test(availabilityText);

  const prime = result.is_prime ?? result.prime ?? false;
  const deliveryPrice = usdValue(result.delivery?.price);
  const shipping =
    deliveryPrice !== null
      ? deliveryPrice
      : prime || /free/i.test(result.delivery?.tagline ?? '')
        ? 0
        : null;

  const primeExclusive = result.is_prime_exclusive_deal === true || result.is_exclusive === true;

  const candidate = {
    id: createOfferId('amazon', url),
    retailer: 'amazon' as const,
    title: result.title.trim(),
    image: result.image && result.image.startsWith('http') ? result.image : null,
    price,
    originalPrice: originalPrice !== null && originalPrice > price ? originalPrice : null,
    shipping,
    inStock,
    rating: typeof result.rating === 'number' ? Math.min(5, Math.max(0, result.rating)) : null,
    reviewCount:
      typeof result.ratings_total === 'number' && result.ratings_total >= 0
        ? Math.round(result.ratings_total)
        : null,
    url,
    condition: deriveConditions({
      retailer: 'amazon',
      price,
      shipping,
      inStock,
      title: result.title,
      deliveryText: result.delivery?.tagline ?? null,
      tagText:
        [result.deal_badge, result.coupon_badge, primeExclusive ? 'Prime exclusive' : null]
          .filter(Boolean)
          .join(' ') || null,
      conditionText: availabilityText || null,
      prime,
    }),
    gtin: normalizeGtin(result.gtin ?? result.upc ?? result.ean),
    lastUpdated,
  };

  const parsed = OfferSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export const amazonProvider: Provider = {
  id: 'amazon',
  label: 'Amazon',

  isConfigured() {
    return Boolean(serverEnv().RAINFOREST_API_KEY);
  },

  async search(context: ProviderContext): Promise<Offer[]> {
    const apiKey = serverEnv().RAINFOREST_API_KEY;
    if (!apiKey) return [];

    const url = buildUrl(ENDPOINT, {
      api_key: apiKey,
      type: 'search',
      amazon_domain: 'amazon.com',
      search_term: context.query,
      sort_by: 'price_low_to_high',
      output: 'json',
      include_html: 'false',
    });

    const payload = await fetchJson(url, {
      provider: 'Amazon',
      timeoutMs: context.timeoutMs,
      signal: context.signal,
    });

    const parsed = ResponseSchema.safeParse(payload);
    if (!parsed.success) return [];
    if (parsed.data.request_info?.success === false) {
      throw new Error(parsed.data.request_info.message ?? 'Amazon request was rejected');
    }

    const lastUpdated = nowIso(context);
    return (parsed.data.search_results ?? [])
      .map((result) => mapAmazonResult(result, lastUpdated))
      .filter((offer): offer is Offer => offer !== null);
  },
};
