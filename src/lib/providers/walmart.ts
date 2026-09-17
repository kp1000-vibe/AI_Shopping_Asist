import { z } from 'zod';
import { deriveConditions } from '@/lib/conditions';
import { serverEnv } from '@/lib/env';
import { buildUrl, fetchJson } from '@/lib/http';
import { createOfferId, normalizeGtin, parseUsdPrice } from '@/lib/normalize';
import { OfferSchema, type Offer } from '@/lib/types';
import { nowIso, type Provider, type ProviderContext } from '@/lib/providers/types';

/**
 * Walmart catalogue access through the Impact affiliate network
 * (Walmart runs its affiliate programme on Impact). Credentials are the Impact
 * Account SID and Auth Token issued to the publisher account.
 */
const ENDPOINT_BASE = 'https://api.impact.com/Mediapartners';

const ItemSchema = z
  .object({
    Name: z.string().min(1),
    Url: z.string().optional(),
    ImageUrl: z.string().optional(),
    CurrentPrice: z.union([z.string(), z.number()]).optional(),
    OriginalPrice: z.union([z.string(), z.number()]).optional(),
    Currency: z.string().optional(),
    StockAvailability: z.string().optional(),
    Condition: z.string().optional(),
    Gtin: z.union([z.string(), z.number()]).optional(),
    Upc: z.union([z.string(), z.number()]).optional(),
    ShippingRate: z.union([z.string(), z.number()]).optional(),
    Manufacturer: z.string().optional(),
  })
  .passthrough();

const ResponseSchema = z
  .object({
    Items: z.array(ItemSchema).optional(),
    Message: z.string().optional(),
  })
  .passthrough();

export type ImpactCatalogItem = z.infer<typeof ItemSchema>;

function inStockFrom(value: string | undefined): boolean {
  if (!value) return true;
  return !/out\s*of\s*stock|discontinued|unavailable|backorder/i.test(value);
}

/** Map one Impact catalogue item onto our Offer shape, or drop it. */
export function mapWalmartItem(item: ImpactCatalogItem, lastUpdated: string): Offer | null {
  if (!item.Url || !item.Url.startsWith('http')) return null;
  if (item.Currency && item.Currency.toUpperCase() !== 'USD') return null;

  const price = parseUsdPrice(item.CurrentPrice);
  if (price === null || price <= 0) return null;

  const originalPrice = parseUsdPrice(item.OriginalPrice);
  const shipping = parseUsdPrice(item.ShippingRate);
  const inStock = inStockFrom(item.StockAvailability);

  const candidate = {
    id: createOfferId('walmart', item.Url),
    retailer: 'walmart' as const,
    title: item.Name.trim(),
    image: item.ImageUrl && item.ImageUrl.startsWith('http') ? item.ImageUrl : null,
    price,
    originalPrice: originalPrice !== null && originalPrice > price ? originalPrice : null,
    shipping,
    inStock,
    rating: null,
    reviewCount: null,
    url: item.Url,
    condition: deriveConditions({
      retailer: 'walmart',
      price,
      shipping,
      inStock,
      title: item.Name,
      conditionText: item.Condition ?? null,
      tagText: item.StockAvailability ?? null,
    }),
    gtin: normalizeGtin(item.Gtin ?? item.Upc),
    lastUpdated,
  };

  const parsed = OfferSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function basicAuth(accountSid: string, authToken: string): string {
  const credentials = `${accountSid}:${authToken}`;
  const encoded =
    typeof btoa === 'function'
      ? btoa(credentials)
      : Buffer.from(credentials, 'utf8').toString('base64');
  return `Basic ${encoded}`;
}

export const walmartProvider: Provider = {
  id: 'walmart',
  label: 'Walmart',

  isConfigured() {
    const env = serverEnv();
    return Boolean(env.WALMART_API_KEY && env.WALMART_API_SECRET);
  },

  async search(context: ProviderContext): Promise<Offer[]> {
    const env = serverEnv();
    if (!env.WALMART_API_KEY || !env.WALMART_API_SECRET) return [];

    const url = buildUrl(
      `${ENDPOINT_BASE}/${encodeURIComponent(env.WALMART_API_KEY)}/Catalogs/ItemSearch`,
      { Query: context.query, PageSize: 25 },
    );

    const payload = await fetchJson(url, {
      provider: 'Walmart',
      timeoutMs: context.timeoutMs,
      signal: context.signal,
      headers: {
        Authorization: basicAuth(env.WALMART_API_KEY, env.WALMART_API_SECRET),
        Accept: 'application/json',
      },
    });

    const parsed = ResponseSchema.safeParse(payload);
    if (!parsed.success) return [];

    const lastUpdated = nowIso(context);
    return (parsed.data.Items ?? [])
      .map((item) => mapWalmartItem(item, lastUpdated))
      .filter((offer): offer is Offer => offer !== null);
  },
};
