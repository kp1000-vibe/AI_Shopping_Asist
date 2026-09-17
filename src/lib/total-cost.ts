import { requiresMembership } from '@/lib/conditions';
import { round2 } from '@/lib/normalize';
import type { Offer, PricedOffer } from '@/lib/types';

/**
 * Combined average state + local sales tax rates, as published by the Tax
 * Foundation (percent). These drive the *estimated* tax line only - the
 * retailer charges the exact rate for the shopper's delivery address.
 *
 * `US` is the population-weighted national average and is the default.
 */
export const SALES_TAX_RATES: Readonly<Record<string, number>> = {
  US: 7.49,
  AL: 9.29,
  AK: 1.82,
  AZ: 8.38,
  AR: 9.45,
  CA: 8.85,
  CO: 7.81,
  CT: 6.35,
  DE: 0,
  DC: 6.0,
  FL: 7.0,
  GA: 7.38,
  HI: 4.5,
  ID: 6.03,
  IL: 8.86,
  IN: 7.0,
  IA: 6.94,
  KS: 8.65,
  KY: 6.0,
  LA: 10.11,
  ME: 5.5,
  MD: 6.0,
  MA: 6.25,
  MI: 6.0,
  MN: 8.04,
  MS: 7.06,
  MO: 8.39,
  MT: 0,
  NE: 6.97,
  NV: 8.24,
  NH: 0,
  NJ: 6.6,
  NM: 7.62,
  NY: 8.53,
  NC: 7.0,
  ND: 7.04,
  OH: 7.24,
  OK: 8.99,
  OR: 0,
  PA: 6.34,
  RI: 7.0,
  SC: 7.5,
  SD: 6.11,
  TN: 9.55,
  TX: 8.2,
  UT: 7.25,
  VT: 6.36,
  VA: 5.77,
  WA: 9.38,
  WV: 6.57,
  WI: 5.7,
  WY: 5.44,
};

export const DEFAULT_TAX_STATE = 'US';

export const TAX_STATE_OPTIONS: ReadonlyArray<{ code: string; label: string }> = Object.keys(
  SALES_TAX_RATES,
).map((code) => ({
  code,
  label: code === 'US' ? 'United States (average)' : code,
}));

/** Sales tax rate as a fraction, e.g. 0.0885 for California. */
export function taxRateFor(state: string | null | undefined): number {
  const code = (state ?? DEFAULT_TAX_STATE).toUpperCase();
  const percent = SALES_TAX_RATES[code] ?? SALES_TAX_RATES[DEFAULT_TAX_STATE] ?? 0;
  return percent / 100;
}

export function isTaxState(value: unknown): value is string {
  return typeof value === 'string' && value.toUpperCase() in SALES_TAX_RATES;
}

/**
 * Estimated sales tax on an item price. Shipping is excluded because most
 * states that tax shipping only do so for taxable goods, and the difference is
 * within the error bars of an estimate.
 */
export function estimateTax(itemPrice: number, state?: string | null): number {
  if (itemPrice <= 0) return 0;
  return round2(itemPrice * taxRateFor(state));
}

export interface TotalCostBreakdown {
  price: number;
  shipping: number;
  shippingUnknown: boolean;
  tax: number;
  total: number;
}

/**
 * Total landed cost: item price + shipping + estimated sales tax.
 * Unreported shipping is treated as $0 and flagged so the UI can say so.
 */
export function totalCost(
  offer: Pick<Offer, 'price' | 'shipping'>,
  state?: string | null,
): TotalCostBreakdown {
  const price = round2(offer.price);
  const shippingUnknown = offer.shipping === null;
  const shipping = shippingUnknown ? 0 : round2(offer.shipping ?? 0);
  const tax = estimateTax(price, state);
  return {
    price,
    shipping,
    shippingUnknown,
    tax,
    total: round2(price + shipping + tax),
  };
}

/**
 * Attach totals, membership flags and savings to a list of offers.
 * Savings are measured against the most expensive offer in the same list.
 */
export function priceOffers(offers: readonly Offer[], state?: string | null): PricedOffer[] {
  const withTotals = offers.map((offer) => {
    const breakdown = totalCost(offer, state);
    return { offer, breakdown };
  });

  const highestTotal = withTotals.reduce((max, entry) => Math.max(max, entry.breakdown.total), 0);

  return withTotals.map(({ offer, breakdown }) => ({
    ...offer,
    totalCost: breakdown.total,
    estimatedTax: breakdown.tax,
    effectiveShipping: breakdown.shipping,
    shippingUnknown: breakdown.shippingUnknown,
    requiresMembership: requiresMembership(offer.condition),
    savingsVsHighest: round2(Math.max(0, highestTotal - breakdown.total)),
  }));
}

/** Discount percentage versus the retailer's own list price, when there is one. */
export function discountPercent(offer: Pick<Offer, 'price' | 'originalPrice'>): number | null {
  if (offer.originalPrice === null || offer.originalPrice <= offer.price) return null;
  return Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100);
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function formatUsd(value: number): string {
  return usd.format(value);
}
