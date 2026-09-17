import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  availableRetailers,
  bestOffer,
  DEFAULT_FILTERS,
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  priceRange,
  sortOffers,
  type OfferFilters,
} from '@/lib/offers';
import { makeOfferSet } from '@/tests/fixtures';

function filters(overrides: Partial<OfferFilters> = {}): OfferFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe('applyFilters', () => {
  const offers = makeOfferSet();

  it('returns everything by default', () => {
    expect(applyFilters(offers, filters())).toHaveLength(offers.length);
  });

  it('filters by retailer', () => {
    const result = applyFilters(offers, filters({ retailers: ['amazon', 'walmart'] }));
    expect(result.map((offer) => offer.retailer).sort()).toEqual(['amazon', 'walmart']);
  });

  it('filters by price range', () => {
    const result = applyFilters(offers, filters({ minPrice: 180, maxPrice: 200 }));
    expect(result.every((offer) => offer.price >= 180 && offer.price <= 200)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('filters out of stock offers', () => {
    const result = applyFilters(offers, filters({ inStockOnly: true }));
    expect(result.every((offer) => offer.inStock)).toBe(true);
    expect(result.some((offer) => offer.retailer === 'homedepot')).toBe(false);
  });

  it('hides offers that need a membership', () => {
    const result = applyFilters(offers, filters({ hideMembership: true }));
    expect(result.some((offer) => offer.retailer === 'costco')).toBe(false);
    expect(result.every((offer) => !offer.requiresMembership)).toBe(true);
  });

  it('filters to new items only', () => {
    const result = applyFilters(offers, filters({ condition: 'new' }));
    expect(result.some((offer) => offer.retailer === 'ebay')).toBe(false);
  });

  it('filters to used items only', () => {
    const result = applyFilters(offers, filters({ condition: 'used' }));
    expect(result.map((offer) => offer.retailer)).toEqual(['ebay']);
  });
});

describe('sortOffers', () => {
  const offers = makeOfferSet();

  it('sorts by total cost by default', () => {
    const sorted = sortOffers(offers, 'lowest-total');
    const totals = sorted.map((offer) => offer.totalCost);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
  });

  it('sorts by item price', () => {
    const sorted = sortOffers(offers, 'lowest-price');
    expect(sorted[0]?.retailer).toBe('ebay');
  });

  it('puts membership-free offers first when sorting by no-membership', () => {
    const sorted = sortOffers(offers, 'no-membership');
    expect(sorted[0]?.requiresMembership).toBe(false);
    const firstMembershipIndex = sorted.findIndex((offer) => offer.requiresMembership);
    const lastFreeIndex = sorted.map((offer) => offer.requiresMembership).lastIndexOf(false);
    expect(firstMembershipIndex).toBeGreaterThan(lastFreeIndex);
  });

  it('sorts by rating with unrated offers last', () => {
    const sorted = sortOffers(offers, 'rating');
    expect(sorted[0]?.rating).toBe(4.7);
    expect(sorted[sorted.length - 1]?.rating).toBeNull();
  });

  it('does not mutate the input array', () => {
    const original = [...offers];
    sortOffers(offers, 'lowest-price');
    expect(offers).toEqual(original);
  });
});

describe('bestOffer', () => {
  it('picks the cheapest in-stock total', () => {
    const best = bestOffer(makeOfferSet());
    expect(best?.retailer).toBe('ebay');
  });

  it('falls back to out-of-stock offers when nothing is in stock', () => {
    const offers = makeOfferSet().map((offer) => ({ ...offer, inStock: false }));
    expect(bestOffer(offers)).not.toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(bestOffer([])).toBeNull();
  });
});

describe('priceRange and availableRetailers', () => {
  it('reports the min and max item price', () => {
    expect(priceRange(makeOfferSet())).toEqual({ min: 164.5, max: 219 });
  });

  it('returns null for no offers', () => {
    expect(priceRange([])).toBeNull();
  });

  it('lists the retailers present', () => {
    expect(availableRetailers(makeOfferSet()).sort()).toEqual([
      'amazon',
      'costco',
      'ebay',
      'homedepot',
      'walmart',
    ]);
  });
});

describe('filter serialisation', () => {
  it('round-trips through search params', () => {
    const original = filters({
      retailers: ['amazon', 'costco'],
      minPrice: 100,
      maxPrice: 500,
      inStockOnly: true,
      hideMembership: true,
      condition: 'new',
    });
    const params = filtersToSearchParams(original);
    expect(filtersFromSearchParams(params)).toEqual(original);
  });

  it('omits default values from the query string', () => {
    const params = filtersToSearchParams(filters());
    expect(params.toString()).toBe('');
  });

  it('preserves the base params it is given', () => {
    const params = filtersToSearchParams(
      filters({ inStockOnly: true }),
      new URLSearchParams({ q: 'AirPods Pro 2' }),
    );
    expect(params.get('q')).toBe('AirPods Pro 2');
    expect(params.get('instock')).toBe('1');
  });

  it('ignores unknown retailers and malformed numbers', () => {
    const parsed = filtersFromSearchParams(
      new URLSearchParams({ retailers: 'amazon,notastore', min: 'abc', max: '-5' }),
    );
    expect(parsed.retailers).toEqual(['amazon']);
    expect(parsed.minPrice).toBeNull();
    expect(parsed.maxPrice).toBeNull();
  });

  it('defaults an unknown condition to any', () => {
    expect(filtersFromSearchParams(new URLSearchParams({ condition: 'bogus' })).condition).toBe(
      'any',
    );
  });
});

describe('hasActiveFilters', () => {
  it('is false for the defaults and true for any change', () => {
    expect(hasActiveFilters(filters())).toBe(false);
    expect(hasActiveFilters(filters({ inStockOnly: true }))).toBe(true);
    expect(hasActiveFilters(filters({ retailers: ['ebay'] }))).toBe(true);
    expect(hasActiveFilters(filters({ minPrice: 5 }))).toBe(true);
    expect(hasActiveFilters(filters({ maxPrice: 5 }))).toBe(true);
    expect(hasActiveFilters(filters({ hideMembership: true }))).toBe(true);
    expect(hasActiveFilters(filters({ condition: 'used' }))).toBe(true);
  });
});
