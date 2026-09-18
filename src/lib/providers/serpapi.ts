import { z } from 'zod';
import { deriveConditions } from '@/lib/conditions';
import { serverEnv } from '@/lib/env';
import { buildUrl, fetchJson } from '@/lib/http';
import {
  createOfferId,
  isAccessoryMismatch,
  normalizeGtin,
  parseShipping,
  parseUsdPrice,
  titleSimilarity,
} from '@/lib/normalize';
import { resolveRetailer, resolveRetailerFromUrl } from '@/lib/retailers';
import { OfferSchema, type Offer } from '@/lib/types';
import { nowIso, type Provider, type ProviderContext } from '@/lib/providers/types';

const ENDPOINT = 'https://serpapi.com/search.json';

/**
 * Google Shopping no longer exposes a merchant link on the results page, so
 * SerpApi's `google_shopping` engine returns products without one. The seller
 * list - with real retailer URLs, shipping and totals - lives behind the
 * `google_immersive_product` engine, one call per product.
 *
 * The adapter therefore runs in two stages:
 *
 *   1. one `google_shopping` search (~0.2s warm, 15-37s cold, 1 API credit)
 *   2. up to `MAX_PRODUCT_LOOKUPS` parallel immersive lookups for the products
 *      that actually match the query (~2-7s each, 1 credit each)
 *
 * Both stages share the provider deadline. A lookup that does not come back in
 * time is dropped rather than failing the search, so a slow upstream degrades
 * into fewer offers instead of none.
 *
 * Every list is validated per item rather than as a whole, so one unexpected
 * row cannot discard an entire product, and anything dropped is logged.
 */
const MAX_PRODUCT_LOOKUPS = 2;

/** Minimum title similarity before a product is worth an immersive lookup. */
const PRODUCT_MATCH_THRESHOLD = 0.45;

const ShoppingResultSchema = z
  .object({
    title: z.string().min(1),
    link: z.string().optional(),
    product_link: z.string().optional(),
    direct_link: z.string().optional(),
    immersive_product_page_token: z.string().optional(),
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

const SearchResponseSchema = z
  .object({
    error: z.string().optional(),
    // Validated per item below so one odd row cannot drop the whole page.
    shopping_results: z.array(z.unknown()).optional(),
  })
  .passthrough();

/**
 * `details_and_offers` comes back as plain strings ("In stock online",
 * "Delivery $19.95") but has previously been objects, so accept both.
 */
const DetailEntrySchema = z.union([
  z.string(),
  z.object({ text: z.string().optional() }).passthrough(),
]);

const StoreSchema = z
  .object({
    name: z.string().min(1),
    link: z.string().optional(),
    title: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    extracted_price: z.number().optional(),
    shipping: z.union([z.string(), z.number()]).optional(),
    total: z.union([z.string(), z.number()]).optional(),
    extracted_total: z.number().optional(),
    details_and_offers: z.array(DetailEntrySchema).optional(),
  })
  .passthrough();

const ImmersiveResponseSchema = z
  .object({
    error: z.string().optional(),
    product_results: z
      .object({
        title: z.string().optional(),
        rating: z.number().optional(),
        reviews: z.number().optional(),
        thumbnails: z.array(z.unknown()).optional(),
        stores: z.array(z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type SerpApiShoppingResult = z.infer<typeof ShoppingResultSchema>;
export type SerpApiStore = z.infer<typeof StoreSchema>;

/** Product-level context carried from the search into the store mapping. */
export interface ProductContext {
  title: string;
  image: string | null;
  rating: number | null;
  reviewCount: number | null;
  gtin: string | null;
}

/**
 * Validate a list item by item. Rows that do not match are dropped and
 * counted, so a shape change shows up in the logs instead of silently
 * emptying the results.
 */
function parseEach<T>(raw: readonly unknown[], schema: z.ZodType<T>, label: string): T[] {
  const kept: T[] = [];
  let dropped = 0;

  for (const item of raw) {
    const parsed = schema.safeParse(item);
    if (parsed.success) kept.push(parsed.data);
    else dropped += 1;
  }

  if (dropped > 0) {
    console.warn(
      `[serpapi] dropped ${dropped}/${raw.length} ${label} that did not match the schema`,
    );
  }
  return kept;
}

export function parseShoppingResults(raw: readonly unknown[]): SerpApiShoppingResult[] {
  return parseEach(raw, ShoppingResultSchema, 'shopping results');
}

export function parseStores(raw: readonly unknown[]): SerpApiStore[] {
  return parseEach(raw, StoreSchema, 'stores');
}

/** Flatten `details_and_offers` into one searchable string. */
export function detailText(store: SerpApiStore): string {
  return (store.details_and_offers ?? [])
    .map((entry) => (typeof entry === 'string' ? entry : (entry.text ?? '')))
    .filter(Boolean)
    .join(' ');
}

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

function pickDirectUrl(result: SerpApiShoppingResult): string | null {
  for (const candidate of [result.direct_link, result.link, result.product_link]) {
    if (!candidate) continue;
    const unwrapped = unwrapGoogleUrl(candidate);
    if (unwrapped && resolveRetailerFromUrl(unwrapped)) return unwrapped;
  }
  return null;
}

function isInStock(text: string): boolean {
  if (/out of stock|sold out|unavailable|pre-?order/i.test(text)) return false;
  return true;
}

function firstThumbnail(thumbnails: readonly unknown[] | undefined): string | null {
  for (const entry of thumbnails ?? []) {
    const value = Array.isArray(entry) ? entry[0] : entry;
    if (typeof value === 'string' && value.startsWith('http')) return value;
  }
  return null;
}

/**
 * Some merchants come back as "Walmart - Cellfeee": the retailer, then the
 * marketplace seller operating inside it.
 */
export function splitMerchantName(name: string): { retailer: string; seller: string | null } {
  const separator = name.indexOf(' - ');
  if (separator === -1) return { retailer: name, seller: null };
  return {
    retailer: name.slice(0, separator).trim(),
    seller: name.slice(separator + 3).trim() || null,
  };
}

/**
 * Map one seller row from the immersive product page onto an Offer.
 * Returns null for merchants PriceShelf does not track, or unusable rows.
 */
export function mapStore(
  store: SerpApiStore,
  product: ProductContext,
  lastUpdated: string,
): Offer | null {
  if (!store.link || !store.link.startsWith('http')) return null;

  const { retailer: retailerName, seller } = splitMerchantName(store.name);
  const retailer = resolveRetailer(retailerName) ?? resolveRetailerFromUrl(store.link);
  if (!retailer) return null;

  const price = store.extracted_price ?? parseUsdPrice(store.price);
  if (price === null || price === undefined || price <= 0) return null;

  const details = detailText(store);
  // The dedicated shipping field wins; otherwise fall back to the detail line
  // ("Delivery $19.95"), which is where eBay-style sellers put it.
  const shipping = parseShipping(store.shipping) ?? parseShipping(details);
  const inStock = isInStock(`${details} ${store.title ?? ''}`);

  const candidate = {
    id: createOfferId(retailer, store.link),
    retailer,
    title: store.title?.trim() || product.title,
    image: product.image,
    price,
    originalPrice: null,
    shipping,
    inStock,
    rating: product.rating,
    reviewCount: product.reviewCount,
    url: store.link,
    condition: deriveConditions({
      retailer,
      price,
      shipping,
      inStock,
      title: store.title || product.title,
      deliveryText: typeof store.shipping === 'string' ? store.shipping : details,
      tagText: details || null,
      // A marketplace seller inside a retailer, e.g. "Walmart - Cellfeee".
      sellerName: seller ? `${seller} (marketplace seller)` : null,
      conditionText: details || null,
    }),
    gtin: product.gtin,
    lastUpdated,
  };

  const parsed = OfferSchema.safeParse(candidate);
  if (!parsed.success) {
    console.warn(
      `[serpapi] store "${store.name}" failed offer validation:`,
      parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; '),
    );
    return null;
  }
  return parsed.data;
}

/**
 * Map a shopping result that already carries a usable merchant link.
 * Google rarely supplies one today, but when it does the immersive lookup (and
 * its API credit) can be skipped entirely.
 */
export function mapShoppingResult(
  result: SerpApiShoppingResult,
  lastUpdated: string,
): Offer | null {
  const url = pickDirectUrl(result);
  if (!url) return null;

  const retailer = resolveRetailer(result.source) ?? resolveRetailerFromUrl(url);
  if (!retailer) return null;

  const price = result.extracted_price ?? parseUsdPrice(result.price);
  if (price === null || price === undefined || price <= 0) return null;

  const originalPrice = result.extracted_old_price ?? parseUsdPrice(result.old_price);
  const extensionText = (result.extensions ?? []).join(' ');
  const inStock = isInStock([result.delivery, result.tag, extensionText].filter(Boolean).join(' '));
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

/**
 * Rank shopping results by how well they match the query, dropping accessories
 * and anything too dissimilar. Only the best few are worth an API credit.
 */
export function rankProducts(
  query: string,
  results: readonly SerpApiShoppingResult[],
  limit = MAX_PRODUCT_LOOKUPS,
): SerpApiShoppingResult[] {
  return results
    .filter((result) => result.immersive_product_page_token)
    .filter((result) => !isAccessoryMismatch(query, result.title))
    .map((result) => ({ result, score: titleSimilarity(query, result.title) }))
    .filter((entry) => entry.score >= PRODUCT_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.result);
}

function toProductContext(
  result: SerpApiShoppingResult,
  detail: z.infer<typeof ImmersiveResponseSchema>['product_results'],
): ProductContext {
  const rating = detail?.rating ?? result.rating;
  const reviews = detail?.reviews ?? result.reviews;

  return {
    title: detail?.title?.trim() || result.title.trim(),
    image:
      firstThumbnail(detail?.thumbnails) ??
      (result.thumbnail && result.thumbnail.startsWith('http') ? result.thumbnail : null),
    rating: typeof rating === 'number' ? Math.min(5, Math.max(0, rating)) : null,
    reviewCount: typeof reviews === 'number' && reviews >= 0 ? Math.round(reviews) : null,
    gtin: normalizeGtin(result.gtin),
  };
}

/**
 * SerpApi scrapes Google live for a query it has not served before. Its own
 * `total_time_taken` for a cold shopping search measures 15-37s; a repeat of
 * the same query comes back from SerpApi's cache in about 200ms. The two
 * immersive lookups add a further 2-7s.
 *
 * So this provider gets its own, much larger budget. Everything downstream is
 * unchanged: a search that overruns still degrades to "did not respond in
 * time" rather than failing the page, and our own 15 minute cache means any
 * given shopper pays the cold cost at most once per query.
 */
const SERPAPI_TIMEOUT_MS = (() => {
  const raw = process.env.PRICESHELF_SERPAPI_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45_000;
})();

export const serpapiProvider: Provider = {
  id: 'serpapi',
  label: 'Google Shopping',
  timeoutMs: SERPAPI_TIMEOUT_MS,

  isConfigured() {
    return Boolean(serverEnv().SERPAPI_KEY);
  },

  async search(context: ProviderContext): Promise<Offer[]> {
    const apiKey = serverEnv().SERPAPI_KEY;
    if (!apiKey) return [];

    const deadline = Date.now() + context.timeoutMs;
    const remaining = () => Math.max(0, deadline - Date.now());

    const searchUrl = buildUrl(ENDPOINT, {
      engine: 'google_shopping',
      q: context.query,
      gl: 'us',
      hl: 'en',
      google_domain: 'google.com',
      num: 60,
      api_key: apiKey,
    });

    const payload = await fetchJson(searchUrl, {
      provider: 'Google Shopping',
      timeoutMs: remaining(),
      signal: context.signal,
    });

    const parsed = SearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn('[serpapi] search response did not match the expected shape');
      return [];
    }
    if (parsed.data.error) throw new Error(parsed.data.error);

    const lastUpdated = nowIso(context);
    const results = parseShoppingResults(parsed.data.shopping_results ?? []);

    // Fast path: use any result that already has a real merchant link.
    const direct = results
      .map((result) => mapShoppingResult(result, lastUpdated))
      .filter((offer): offer is Offer => offer !== null);

    const products = rankProducts(context.query, results);
    if (products.length === 0) return direct;

    // Stage two: resolve seller lists for the best-matching products. A lookup
    // that fails or runs out of budget is skipped, never fatal.
    const settled = await Promise.allSettled(
      products.map(async (result) => {
        const budget = remaining();
        if (budget < 500) throw new Error('out of time budget');

        const detailUrl = buildUrl(ENDPOINT, {
          engine: 'google_immersive_product',
          page_token: result.immersive_product_page_token,
          api_key: apiKey,
        });

        const detailPayload = await fetchJson(detailUrl, {
          provider: 'Google Shopping',
          timeoutMs: budget,
          signal: context.signal,
        });

        const detail = ImmersiveResponseSchema.safeParse(detailPayload);
        if (!detail.success) {
          console.warn('[serpapi] immersive response did not match the expected shape');
          return [];
        }
        if (detail.data.error) {
          console.warn('[serpapi] immersive lookup returned an error:', detail.data.error);
          return [];
        }

        const product = toProductContext(result, detail.data.product_results);
        const stores = parseStores(detail.data.product_results?.stores ?? []);
        return stores
          .map((store) => mapStore(store, product, lastUpdated))
          .filter((offer): offer is Offer => offer !== null);
      }),
    );

    const offers = [...direct];
    for (const entry of settled) {
      if (entry.status === 'fulfilled') offers.push(...entry.value);
      else console.warn('[serpapi] product lookup skipped:', entry.reason?.message ?? entry.reason);
    }

    return offers;
  },
};
