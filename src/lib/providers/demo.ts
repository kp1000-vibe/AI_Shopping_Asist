import { deriveConditions } from '@/lib/conditions';
import { isDemoMode } from '@/lib/env';
import { createOfferId, hash32, round2 } from '@/lib/normalize';
import { RETAILERS, type RetailerId } from '@/lib/retailers';
import { OfferSchema, type Offer } from '@/lib/types';
import { nowIso, type Provider, type ProviderContext } from '@/lib/providers/types';

/**
 * Deterministic fixture provider used ONLY by the end-to-end suite, so CI can
 * exercise the full search -> filter -> redirect flow without live API keys.
 *
 * It is inert unless `PRICESHELF_DEMO_PROVIDER=1`, which production never sets.
 * The prices it returns are derived from a hash of the query and are clearly
 * not live retail data.
 */

interface DemoSpec {
  retailer: RetailerId;
  /** Price offset applied to the query-derived base price. */
  delta: number;
  shipping: number | null;
  inStock: boolean;
  rating: number | null;
  reviewCount: number | null;
  titleSuffix: string;
  deliveryText?: string;
  tagText?: string;
  conditionText?: string;
  prime?: boolean;
}

const SPECS: readonly DemoSpec[] = [
  {
    retailer: 'costco',
    delta: -24,
    shipping: 0,
    inStock: true,
    rating: 4.7,
    reviewCount: 812,
    titleSuffix: '- 2 pack',
    deliveryText: 'Free delivery',
  },
  {
    retailer: 'walmart',
    delta: -12,
    shipping: 0,
    inStock: true,
    rating: 4.5,
    reviewCount: 4321,
    titleSuffix: '',
    deliveryText: 'Free delivery with Walmart+',
  },
  {
    retailer: 'amazon',
    delta: -8,
    shipping: 0,
    inStock: true,
    rating: 4.8,
    reviewCount: 15234,
    titleSuffix: '',
    deliveryText: 'FREE delivery with Prime',
    prime: true,
  },
  {
    retailer: 'target',
    delta: 4,
    shipping: 0,
    inStock: true,
    rating: 4.4,
    reviewCount: 980,
    titleSuffix: '',
    tagText: 'Target Circle deal',
  },
  {
    retailer: 'bestbuy',
    delta: 10,
    shipping: 5.99,
    inStock: true,
    rating: 4.6,
    reviewCount: 2210,
    titleSuffix: '',
    deliveryText: '$5.99 delivery',
  },
  {
    retailer: 'samsclub',
    delta: -18,
    shipping: 0,
    inStock: true,
    rating: 4.3,
    reviewCount: 145,
    titleSuffix: '',
    deliveryText: 'Free delivery',
  },
  {
    retailer: 'ebay',
    delta: -35,
    shipping: 4.5,
    inStock: true,
    rating: 4.1,
    reviewCount: 64,
    titleSuffix: '',
    conditionText: 'Used - Very good',
  },
  {
    retailer: 'homedepot',
    delta: 18,
    shipping: null,
    inStock: false,
    rating: 4.2,
    reviewCount: 310,
    titleSuffix: '',
    tagText: 'Out of stock online',
  },
];

function basePrice(query: string): number {
  // 79.00 - 578.00, stable for a given query.
  const seed = Number.parseInt(hash32(query.toLowerCase()).slice(0, 5), 36);
  return round2(79 + (seed % 500));
}

export function demoOffers(query: string, lastUpdated: string): Offer[] {
  const base = basePrice(query);
  const cleaned = query.trim();

  return SPECS.map((spec) => {
    const retailer = RETAILERS[spec.retailer];
    const price = round2(Math.max(9.99, base + spec.delta));
    const url = `https://${retailer.domain}/priceshelf-demo/${encodeURIComponent(
      cleaned.toLowerCase().replace(/\s+/g, '-'),
    )}`;
    const title = `${cleaned} ${spec.titleSuffix}`.trim();

    const candidate = {
      id: createOfferId(spec.retailer, url),
      retailer: spec.retailer,
      title,
      image: null,
      price,
      originalPrice: round2(price + 40),
      shipping: spec.shipping,
      inStock: spec.inStock,
      rating: spec.rating,
      reviewCount: spec.reviewCount,
      url,
      condition: deriveConditions({
        retailer: spec.retailer,
        price,
        shipping: spec.shipping,
        inStock: spec.inStock,
        title,
        deliveryText: spec.deliveryText ?? null,
        tagText: spec.tagText ?? null,
        conditionText: spec.conditionText ?? null,
        prime: spec.prime,
      }),
      gtin: null,
      lastUpdated,
    };

    return OfferSchema.parse(candidate);
  });
}

export const demoProvider: Provider = {
  id: 'demo',
  label: 'Demo catalogue',

  isConfigured() {
    return isDemoMode();
  },

  async search(context: ProviderContext): Promise<Offer[]> {
    return demoOffers(context.query, nowIso(context));
  },
};
