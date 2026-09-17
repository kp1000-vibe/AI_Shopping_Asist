import { isRetailerId, type RetailerId } from '@/lib/retailers';
import type { PricedOffer, SortOption } from '@/lib/types';

export type ConditionFilter = 'any' | 'new' | 'used';

export interface OfferFilters {
  /** Empty means "every retailer". */
  retailers: RetailerId[];
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  /** Hide offers that need a paid membership to buy at the listed price. */
  hideMembership: boolean;
  condition: ConditionFilter;
}

export const DEFAULT_FILTERS: OfferFilters = {
  retailers: [],
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  hideMembership: false,
  condition: 'any',
};

function isSecondHand(offer: PricedOffer): boolean {
  return offer.condition.includes('used') || offer.condition.includes('renewed');
}

export function applyFilters(offers: readonly PricedOffer[], filters: OfferFilters): PricedOffer[] {
  return offers.filter((offer) => {
    if (filters.retailers.length > 0 && !filters.retailers.includes(offer.retailer)) return false;
    if (filters.minPrice !== null && offer.price < filters.minPrice) return false;
    if (filters.maxPrice !== null && offer.price > filters.maxPrice) return false;
    if (filters.inStockOnly && !offer.inStock) return false;
    if (filters.hideMembership && offer.requiresMembership) return false;
    if (filters.condition === 'new' && isSecondHand(offer)) return false;
    if (filters.condition === 'used' && !isSecondHand(offer)) return false;
    return true;
  });
}

export function sortOffers(offers: readonly PricedOffer[], sort: SortOption): PricedOffer[] {
  const copy = [...offers];

  // Every comparator ends with the retailer id so the order is deterministic
  // for offers that tie on the primary key.
  const byRetailer = (a: PricedOffer, b: PricedOffer) => a.retailer.localeCompare(b.retailer);

  switch (sort) {
    case 'lowest-price':
      copy.sort((a, b) => a.price - b.price || a.totalCost - b.totalCost || byRetailer(a, b));
      break;
    case 'no-membership':
      copy.sort(
        (a, b) =>
          Number(a.requiresMembership) - Number(b.requiresMembership) ||
          a.totalCost - b.totalCost ||
          byRetailer(a, b),
      );
      break;
    case 'rating':
      copy.sort(
        (a, b) =>
          (b.rating ?? -1) - (a.rating ?? -1) || a.totalCost - b.totalCost || byRetailer(a, b),
      );
      break;
    case 'lowest-total':
    default:
      copy.sort((a, b) => a.totalCost - b.totalCost || byRetailer(a, b));
      break;
  }

  return copy;
}

/** The offer PriceShelf recommends: the lowest landed cost that is in stock. */
export function bestOffer(offers: readonly PricedOffer[]): PricedOffer | null {
  if (offers.length === 0) return null;
  const inStock = offers.filter((offer) => offer.inStock);
  const pool = inStock.length > 0 ? inStock : offers;
  return pool.reduce((best, offer) => (offer.totalCost < best.totalCost ? offer : best));
}

export interface PriceRange {
  min: number;
  max: number;
}

export function priceRange(offers: readonly PricedOffer[]): PriceRange | null {
  if (offers.length === 0) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const offer of offers) {
    min = Math.min(min, offer.price);
    max = Math.max(max, offer.price);
  }
  return { min, max };
}

/** Retailers present in a result set, for the retailer filter checkboxes. */
export function availableRetailers(offers: readonly PricedOffer[]): RetailerId[] {
  const seen = new Set<RetailerId>();
  for (const offer of offers) seen.add(offer.retailer);
  return [...seen];
}

// ---------------------------------------------------------------------------
// URL <-> filter serialisation (search page state lives in the query string)
// ---------------------------------------------------------------------------

function parsePositiveNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function filtersFromSearchParams(params: URLSearchParams): OfferFilters {
  const retailers = (params.get('retailers') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(isRetailerId);

  const condition = params.get('condition');

  return {
    retailers,
    minPrice: parsePositiveNumber(params.get('min')),
    maxPrice: parsePositiveNumber(params.get('max')),
    inStockOnly: params.get('instock') === '1',
    hideMembership: params.get('nomembership') === '1',
    condition: condition === 'new' || condition === 'used' ? condition : 'any',
  };
}

export function filtersToSearchParams(
  filters: OfferFilters,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const params = new URLSearchParams(base);

  const set = (key: string, value: string | null) => {
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
  };

  set('retailers', filters.retailers.length > 0 ? filters.retailers.join(',') : null);
  set('min', filters.minPrice === null ? null : String(filters.minPrice));
  set('max', filters.maxPrice === null ? null : String(filters.maxPrice));
  set('instock', filters.inStockOnly ? '1' : null);
  set('nomembership', filters.hideMembership ? '1' : null);
  set('condition', filters.condition === 'any' ? null : filters.condition);

  return params;
}

export function hasActiveFilters(filters: OfferFilters): boolean {
  return (
    filters.retailers.length > 0 ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.inStockOnly ||
    filters.hideMembership ||
    filters.condition !== 'any'
  );
}
