import 'server-only';

import {
  cacheGet,
  cacheSet,
  offerCacheKey,
  searchCacheKey,
  OFFER_CACHE_TTL_SECONDS,
  SEARCH_CACHE_TTL_SECONDS,
} from '@/lib/cache';
import { dedupeOffers, filterMatchingOffers } from '@/lib/normalize';
import { runProviders } from '@/lib/providers';
import type { Provider } from '@/lib/providers/types';
import { slugify } from '@/lib/slug';
import { DEFAULT_TAX_STATE, isTaxState } from '@/lib/total-cost';
import { OfferSchema, SearchResponseSchema, type Offer, type SearchResponse } from '@/lib/types';

export interface SearchOptions {
  /** Two-letter state code for the tax estimate. */
  state?: string | null;
  signal?: AbortSignal;
  /** Skip the 15 minute cache (used by the cache-busting refresh action). */
  skipCache?: boolean;
  /** Injectable for tests. */
  providers?: readonly Provider[];
  now?: () => Date;
}

function resolveState(state: string | null | undefined): string {
  if (state && isTaxState(state)) return state.toUpperCase();
  return DEFAULT_TAX_STATE;
}

/**
 * Full search pipeline: cache -> providers in parallel -> product matching ->
 * deduplication -> cache write. Always resolves; provider failures are reported
 * in `providers` rather than thrown.
 */
export async function searchOffers(
  rawQuery: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const query = rawQuery.trim();
  const state = resolveState(options.state);
  const slug = slugify(query);
  const key = searchCacheKey(query, state);

  if (!options.skipCache) {
    const cached = await cacheGet(key, SearchResponseSchema);
    if (cached) return { ...cached, cached: true };
  }

  const run = await runProviders(query, {
    signal: options.signal,
    providers: options.providers,
    now: options.now,
  });

  const matched = filterMatchingOffers(query, run.offers);
  const offers = dedupeOffers(matched).sort((a, b) => a.price - b.price);

  const response: SearchResponse = {
    query,
    slug,
    offers,
    providers: run.statuses,
    partial: run.partial,
    providersConfigured: !run.noProvidersConfigured,
    cached: false,
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    taxState: state,
  };

  // Only cache a result that actually has something in it, so a transient
  // total outage does not pin an empty page for 15 minutes.
  if (offers.length > 0) {
    await Promise.all([
      cacheSet(key, response, SEARCH_CACHE_TTL_SECONDS),
      ...offers.map((offer) => cacheSet(offerCacheKey(offer.id), offer, OFFER_CACHE_TTL_SECONDS)),
    ]);
  }

  return response;
}

/** Resolve a single offer for the /go/[offerId] redirect. */
export async function getCachedOffer(offerId: string): Promise<Offer | null> {
  return cacheGet(offerCacheKey(offerId), OfferSchema);
}
