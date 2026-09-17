import { z } from 'zod';
import { deriveConditions } from '@/lib/conditions';
import { serverEnv } from '@/lib/env';
import { buildUrl, fetchJson } from '@/lib/http';
import { createOfferId, normalizeGtin, parseShipping, parseUsdPrice } from '@/lib/normalize';
import { resolveRetailer, resolveRetailerFromUrl } from '@/lib/retailers';
import { OfferSchema, type Offer } from '@/lib/types';
import { nowIso, type Provider, type ProviderContext } from '@/lib/providers/types';

const ENDPOINT = 'https://serpapi.com/search.json';

/**
 * SerpApi returns a wide, evolving payload. We validate only the fields we
 * consume and tolerate everything else, so a new upstream field never breaks a
 * search.
 */
const ShoppingResultSchema = z
  .object({
    title: z.string().min(1),
    link: z.string().optional(),
    product_link: z.string().optional(),
    direct_link: z.string().optional(),
    source: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    extracted_price: z.number().optional(),
    old_price: z.union([z.string(), z.number()]).optional(),
    extracted_old_price: z.number().optional(),
    rating: z.number().optional(),
    reviews: z.number().optional(),
    thumbnail: z.string().optional(),
    delivery: z.string().optional(),
    tag: z.string().optional(),
    second_hand_condition: z.string().optional(),
    extensions: z.array(z.string()).optional(),
    gtin: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const ResponseSchema = z
  .object({
    error: z.string().optional(),
    shopping_results: z.array(ShoppingResultSchema).optional(),
  })
  .passthrough();

export type SerpApiShoppingResult = z.infer<typeof ShoppingResultSchema>;

/**
 * Google wraps some outbound links in a redirect. Unwrap it so the shopper is
 * sent straight to the retailer and so retailer detection works on the host.
 */
export function unwrapGoogleUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!/(^|\.)google\.[a-z.]+$/.test(url.hostname)) return url.toString();

  for (const key of ['url', 'q', 'adurl']) {
    const nested = url.searchParams.get(key);
    if (!nested) continue;
    try {
      return new URL(nested).toString();
    } catch {
      continue;
    }
  }
  return null;
}

function pickUrl(result: SerpApiShoppingResult): string | null {
  for (const candidate of [result.direct_link, result.link, result.product_link]) {
    if (!candidate) continue;
    const unwrapped = unwrapGoogleUrl(candidate);
    if (unwrapped) return unwrapped;
  }
  return null;
}

function isInStock(result: SerpApiShoppingResult): boolean {
  const text = [result.delivery, result.tag, ...(result.extensions ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return !/out of stock|sold out|unavailable/.test(text);
}

/** Map one SerpApi shopping result onto our Offer shape, or drop it. */
export function mapShoppingResult(
  result: SerpApiShoppingResult,
  lastUpdated: string,
): Offer | null {
  const url = pickUrl(result);
  if (!url) return null;

  const retailer = resolveRetailer(result.source) ?? resolveRetailerFromUrl(url);
  if (!retailer) return null;

  const price = result.extracted_price ?? parseUsdPrice(result.price);
  if (price === null || price === undefined || price <= 0) return null;

  const originalPrice = result.extracted_old_price ?? parseUsdPrice(result.old_price);
  const extensionText = (result.extensions ?? []).join(' ');
  const inStock = isInStock(result);
  const shipping = parseShipping(result.delivery);

  const candidate = {
    id: createOfferId(retailer, url),
    retailer,
    title: result.title.trim(),
    image: result.thumbnail && result.thumbnail.startsWith('http') ? result.thumbnail : null,
    price,
    originalPrice: originalPrice !== null && originalPrice > price ? originalPrice : null,
    shipping,
    inStock,
    rating: typeof result.rating === 'number' ? Math.min(5, Math.max(0, result.rating)) : null,
    reviewCount:
      typeof result.reviews === 'number' && result.reviews >= 0 ? Math.round(result.reviews) : null,
    url,
    condition: deriveConditions({
      retailer,
      price,
      shipping,
      inStock,
      title: result.title,
      deliveryText: result.delivery ?? null,
      tagText: [result.tag, extensionText].filter(Boolean).join(' ') || null,
      conditionText: result.second_hand_condition ?? null,
    }),
    gtin: normalizeGtin(result.gtin),
    lastUpdated,
  };

  const parsed = OfferSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export const serpapiProvider: Provider = {
  id: 'serpapi',
  label: 'Google Shopping',

  isConfigured() {
    return Boolean(serverEnv().SERPAPI_KEY);
  },

  async search(context: ProviderContext): Promise<Offer[]> {
    const apiKey = serverEnv().SERPAPI_KEY;
    if (!apiKey) return [];

    const url = buildUrl(ENDPOINT, {
      engine: 'google_shopping',
      q: context.query,
      gl: 'us',
      hl: 'en',
      google_domain: 'google.com',
      num: 60,
      api_key: apiKey,
    });

    const payload = await fetchJson(url, {
      provider: 'Google Shopping',
      timeoutMs: context.timeoutMs,
      signal: context.signal,
    });

    const parsed = ResponseSchema.safeParse(payload);
    if (!parsed.success) return [];
    if (parsed.data.error) throw new Error(parsed.data.error);

    const lastUpdated = nowIso(context);
    return (parsed.data.shopping_results ?? [])
      .map((result) => mapShoppingResult(result, lastUpdated))
      .filter((offer): offer is Offer => offer !== null);
  },
};
