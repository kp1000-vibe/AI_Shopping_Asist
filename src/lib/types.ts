import { z } from 'zod';
import { RETAILER_IDS } from '@/lib/retailers';

/**
 * Buying conditions attached to an offer. These drive the coloured badges and
 * the "hide offers that need a membership" filter.
 */
export const CONDITION_CODES = [
  'membership-required',
  'membership-surcharge',
  'prime-shipping',
  'prime-exclusive',
  'walmart-plus',
  'free-shipping-threshold',
  'circle-deal',
  'free-shipping',
  'used',
  'renewed',
  'out-of-stock',
  'third-party-seller',
  'pickup-only',
] as const;

export type ConditionCode = (typeof CONDITION_CODES)[number];

export const ConditionSchema = z.enum(CONDITION_CODES);
export const RetailerIdSchema = z.enum(RETAILER_IDS);

/** A single normalised offer. Every provider adapter returns this shape. */
export const OfferSchema = z.object({
  /** Stable id derived from retailer + product URL. Used by /go/[offerId]. */
  id: z.string().min(1),
  retailer: RetailerIdSchema,
  title: z.string().min(1),
  image: z.string().url().nullable(),
  /** Current price in USD. */
  price: z.number().nonnegative().finite(),
  /** List/strike-through price in USD, when the retailer advertises one. */
  originalPrice: z.number().nonnegative().finite().nullable(),
  /** Shipping cost in USD. `0` means free, `null` means "not reported". */
  shipping: z.number().nonnegative().finite().nullable(),
  inStock: z.boolean(),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
  url: z.string().url(),
  condition: z.array(ConditionSchema),
  /** GTIN/UPC/EAN when the provider supplies one - used for exact matching. */
  gtin: z.string().nullable(),
  /** ISO 8601 timestamp of when this offer was fetched. */
  lastUpdated: z.string().datetime(),
});

export type Offer = z.infer<typeof OfferSchema>;

/** Offer plus the derived totals the UI sorts and renders. */
export interface PricedOffer extends Offer {
  /** price + shipping + estimated sales tax, in USD. */
  totalCost: number;
  /** Estimated sales tax included in `totalCost`. */
  estimatedTax: number;
  /** Shipping actually used in the total (0 when not reported). */
  effectiveShipping: number;
  /** True when the retailer did not report a shipping cost. */
  shippingUnknown: boolean;
  /** True when buying at this price needs a paid membership. */
  requiresMembership: boolean;
  /** Saving versus the most expensive comparable offer, in USD. */
  savingsVsHighest: number;
}

export const ProviderStatusSchema = z.object({
  provider: z.string().min(1),
  ok: z.boolean(),
  /** Milliseconds the provider call took. */
  durationMs: z.number().nonnegative(),
  offers: z.number().int().nonnegative(),
  /** Present when `ok` is false. Safe to show to users. */
  reason: z.string().optional(),
});

export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(120, 'Search terms are limited to 120 characters'),
  /** Two-letter US state code used for the sales tax estimate. */
  state: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase())
    .optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  slug: z.string(),
  offers: z.array(OfferSchema),
  providers: z.array(ProviderStatusSchema),
  /** True when at least one provider failed or timed out. */
  partial: z.boolean(),
  /** False when the deployment has no provider credentials configured at all. */
  providersConfigured: z.boolean(),
  /** True when the payload was served from the 15 minute cache. */
  cached: z.boolean(),
  generatedAt: z.string().datetime(),
  /** State code used for the tax estimate. */
  taxState: z.string().length(2),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const SORT_OPTIONS = ['lowest-total', 'lowest-price', 'no-membership', 'rating'] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  'lowest-total': 'Lowest total cost',
  'lowest-price': 'Lowest price',
  'no-membership': 'Cheapest with no membership',
  rating: 'Highest rated',
};

export function isSortOption(value: unknown): value is SortOption {
  return typeof value === 'string' && (SORT_OPTIONS as readonly string[]).includes(value);
}
