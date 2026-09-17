import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TAX_STATE,
  discountPercent,
  estimateTax,
  formatUsd,
  isTaxState,
  priceOffers,
  SALES_TAX_RATES,
  TAX_STATE_OPTIONS,
  taxRateFor,
  totalCost,
} from '@/lib/total-cost';
import { makeOffer } from '@/tests/fixtures';

describe('taxRateFor', () => {
  it('returns the state rate as a fraction', () => {
    expect(taxRateFor('CA')).toBeCloseTo(0.0885, 5);
    expect(taxRateFor('ca')).toBeCloseTo(0.0885, 5);
  });

  it('returns zero for states with no sales tax', () => {
    for (const state of ['OR', 'DE', 'MT', 'NH']) {
      expect(taxRateFor(state)).toBe(0);
    }
  });

  it('falls back to the national average for unknown input', () => {
    expect(taxRateFor('ZZ')).toBeCloseTo(taxRateFor(DEFAULT_TAX_STATE), 10);
    expect(taxRateFor(null)).toBeCloseTo(taxRateFor(DEFAULT_TAX_STATE), 10);
    expect(taxRateFor(undefined)).toBeCloseTo(taxRateFor(DEFAULT_TAX_STATE), 10);
  });

  it('covers every state plus DC and the national average', () => {
    expect(Object.keys(SALES_TAX_RATES)).toHaveLength(52);
    expect(TAX_STATE_OPTIONS[0]).toEqual({ code: 'US', label: 'United States (average)' });
  });
});

describe('isTaxState', () => {
  it('accepts known codes only', () => {
    expect(isTaxState('TX')).toBe(true);
    expect(isTaxState('tx')).toBe(true);
    expect(isTaxState('XX')).toBe(false);
    expect(isTaxState(42)).toBe(false);
  });
});

describe('estimateTax', () => {
  it('applies the state rate to the item price', () => {
    expect(estimateTax(100, 'CA')).toBe(8.85);
    expect(estimateTax(0, 'CA')).toBe(0);
    expect(estimateTax(-10, 'CA')).toBe(0);
  });
});

describe('totalCost', () => {
  it('adds price, shipping and estimated tax', () => {
    const result = totalCost({ price: 100, shipping: 10 }, 'CA');
    expect(result).toEqual({
      price: 100,
      shipping: 10,
      shippingUnknown: false,
      tax: 8.85,
      total: 118.85,
    });
  });

  it('treats unreported shipping as zero but flags it', () => {
    const result = totalCost({ price: 50, shipping: null }, 'OR');
    expect(result.shipping).toBe(0);
    expect(result.shippingUnknown).toBe(true);
    expect(result.total).toBe(50);
  });

  it('keeps free shipping distinct from unknown shipping', () => {
    expect(totalCost({ price: 50, shipping: 0 }, 'OR').shippingUnknown).toBe(false);
  });
});

describe('priceOffers', () => {
  it('computes savings against the most expensive offer', () => {
    const priced = priceOffers(
      [
        makeOffer({ retailer: 'amazon', price: 100, shipping: 0 }),
        makeOffer({ retailer: 'walmart', price: 150, shipping: 0 }),
      ],
      'OR',
    );
    expect(priced[0]?.savingsVsHighest).toBe(50);
    expect(priced[1]?.savingsVsHighest).toBe(0);
  });

  it('marks membership-gated offers', () => {
    const priced = priceOffers(
      [
        makeOffer({ retailer: 'costco', condition: ['membership-required'] }),
        makeOffer({ retailer: 'amazon', condition: ['prime-shipping'] }),
      ],
      'OR',
    );
    expect(priced[0]?.requiresMembership).toBe(true);
    expect(priced[1]?.requiresMembership).toBe(false);
  });

  it('handles an empty list', () => {
    expect(priceOffers([], 'US')).toEqual([]);
  });
});

describe('discountPercent', () => {
  it('computes a discount when there is a higher list price', () => {
    expect(discountPercent({ price: 150, originalPrice: 200 })).toBe(25);
  });

  it('returns null when there is no genuine discount', () => {
    expect(discountPercent({ price: 200, originalPrice: 200 })).toBeNull();
    expect(discountPercent({ price: 200, originalPrice: 150 })).toBeNull();
    expect(discountPercent({ price: 200, originalPrice: null })).toBeNull();
  });
});

describe('formatUsd', () => {
  it('formats as US currency', () => {
    expect(formatUsd(1299)).toBe('$1,299.00');
    expect(formatUsd(0)).toBe('$0.00');
  });
});
