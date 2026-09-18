import { describe, expect, it } from 'vitest';
import {
  consensusGtin,
  createOfferId,
  dedupeOffers,
  filterMatchingOffers,
  hash32,
  isAccessoryMismatch,
  normalizeGtin,
  normalizeTitle,
  parseMoney,
  parseShipping,
  parseUsdPrice,
  round2,
  titleSimilarity,
  tokenize,
} from '@/lib/normalize';
import { makeOffer } from '@/tests/fixtures';

describe('parseMoney', () => {
  it('parses US formatted prices', () => {
    expect(parseMoney('$1,299.00')).toEqual({ amount: 1299, currency: 'USD' });
    expect(parseMoney('$49.99')).toEqual({ amount: 49.99, currency: 'USD' });
    expect(parseMoney('US $45.99')).toEqual({ amount: 45.99, currency: 'USD' });
  });

  it('parses European decimal commas', () => {
    expect(parseMoney('45,99 €')).toEqual({ amount: 45.99, currency: 'EUR' });
    expect(parseMoney('1.299,00 €')).toEqual({ amount: 1299, currency: 'EUR' });
  });

  it('treats a comma before three digits as thousands grouping', () => {
    expect(parseMoney('1,299')?.amount).toBe(1299);
    expect(parseMoney('45,99')?.amount).toBe(45.99);
  });

  it('detects non-USD currencies', () => {
    expect(parseMoney('£29.99')).toEqual({ amount: 29.99, currency: 'GBP' });
    expect(parseMoney('CA$59.99')).toEqual({ amount: 59.99, currency: 'CAD' });
    expect(parseMoney('29.99 CAD')).toEqual({ amount: 29.99, currency: 'CAD' });
  });

  it('accepts plain numbers', () => {
    expect(parseMoney(19.995)).toEqual({ amount: 20, currency: 'USD' });
  });

  it('rejects values that are not prices', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('   ')).toBeNull();
    expect(parseMoney('free')).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(Number.NaN)).toBeNull();
    expect(parseMoney(-5)).toBeNull();
  });
});

describe('parseUsdPrice', () => {
  it('keeps USD amounts and drops other currencies', () => {
    expect(parseUsdPrice('$19.99')).toBe(19.99);
    expect(parseUsdPrice('£19.99')).toBeNull();
    expect(parseUsdPrice('nonsense')).toBeNull();
  });
});

describe('parseShipping', () => {
  it('returns 0 for free delivery wording', () => {
    expect(parseShipping('Free delivery')).toBe(0);
    expect(parseShipping('Free shipping on orders over $35')).toBe(0);
    expect(parseShipping('Free pickup today')).toBe(0);
  });

  it('extracts a delivery charge', () => {
    expect(parseShipping('$5.99 delivery')).toBe(5.99);
    expect(parseShipping(7.5)).toBe(7.5);
  });

  it('returns null when shipping is not stated', () => {
    expect(parseShipping(undefined)).toBeNull();
    expect(parseShipping('')).toBeNull();
    expect(parseShipping('Delivery by Tuesday')).toBeNull();
  });
});

describe('round2', () => {
  it('rounds to cents without float drift', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(199.994)).toBe(199.99);
  });
});

describe('normalizeTitle and tokenize', () => {
  it('strips punctuation and casing', () => {
    expect(normalizeTitle('AirPods Pro (2nd Gen.) — USB-C')).toBe('airpods pro 2nd gen usb c');
  });

  it('drops stopwords', () => {
    expect(tokenize('The Nintendo Switch OLED with Dock')).toEqual([
      'nintendo',
      'switch',
      'oled',
      'dock',
    ]);
  });
});

describe('titleSimilarity', () => {
  it('scores an exact product match highly', () => {
    expect(
      titleSimilarity('AirPods Pro 2', 'Apple AirPods Pro 2 Wireless Earbuds'),
    ).toBeGreaterThan(0.9);
  });

  it('scores an unrelated product low', () => {
    expect(titleSimilarity('AirPods Pro 2', 'Dyson V15 Detect Cordless Vacuum')).toBeLessThan(0.2);
  });

  it('gives partial credit for prefix variants', () => {
    const score = titleSimilarity('AirPods Pro 2nd generation', 'AirPods Pro 2nd gen');
    expect(score).toBeGreaterThan(0.7);
  });

  it('returns 0 for empty input', () => {
    expect(titleSimilarity('', 'AirPods')).toBe(0);
    expect(titleSimilarity('AirPods', '')).toBe(0);
  });
});

describe('isAccessoryMismatch', () => {
  it('flags accessories the shopper did not ask for', () => {
    expect(isAccessoryMismatch('AirPods Pro 2', 'Silicone Case for AirPods Pro 2')).toBe(true);
    expect(isAccessoryMismatch('AirPods Pro 2', 'Charging Cable for AirPods')).toBe(true);
  });

  it('allows the accessory through when it was searched for', () => {
    expect(isAccessoryMismatch('AirPods Pro 2 case', 'Silicone Case for AirPods Pro 2')).toBe(
      false,
    );
  });

  it('does not flag the product itself', () => {
    expect(isAccessoryMismatch('AirPods Pro 2', 'Apple AirPods Pro 2 Wireless Earbuds')).toBe(
      false,
    );
  });

  it('keeps a product whose official name bundles an accessory', () => {
    // Apple ships the case with the earbuds: this is the product, not a case.
    expect(
      isAccessoryMismatch('AirPods Pro 2', 'Apple AirPods Pro 2nd generation with MagSafe Case'),
    ).toBe(false);
    expect(
      isAccessoryMismatch('Nintendo Switch OLED', 'Nintendo Switch OLED including dock and stand'),
    ).toBe(false);
  });

  it('still rejects an accessory sold for the product', () => {
    expect(isAccessoryMismatch('AirPods Pro 2', 'MagSafe Case for AirPods Pro 2')).toBe(true);
    expect(isAccessoryMismatch('Apple Watch', 'Replacement band, fits Apple Watch')).toBe(true);
  });

  it('falls back to title similarity when the phrasing is ambiguous', () => {
    // Neither "for" nor "with": a weak title match is treated as an accessory.
    expect(isAccessoryMismatch('AirPods Pro 2', 'Generic Earbud Charging Dock')).toBe(true);
  });
});

describe('consensusGtin', () => {
  it('returns the GTIN shared by at least two offers', () => {
    const offers = [
      makeOffer({ retailer: 'amazon', gtin: '190199246850' }),
      makeOffer({ retailer: 'walmart', gtin: '190199246850' }),
      makeOffer({ retailer: 'target', gtin: '999999999999' }),
    ];
    expect(consensusGtin(offers)).toBe('190199246850');
  });

  it('returns null when every GTIN is unique', () => {
    const offers = [
      makeOffer({ retailer: 'amazon', gtin: '111111111111' }),
      makeOffer({ retailer: 'walmart', gtin: '222222222222' }),
    ];
    expect(consensusGtin(offers)).toBeNull();
  });
});

describe('filterMatchingOffers', () => {
  it('removes accessories and unrelated products', () => {
    const offers = [
      makeOffer({ retailer: 'amazon', title: 'Apple AirPods Pro 2 Wireless Earbuds' }),
      makeOffer({ retailer: 'walmart', title: 'Silicone Case for AirPods Pro 2' }),
      makeOffer({ retailer: 'target', title: 'Dyson V15 Detect Cordless Vacuum' }),
    ];
    const matched = filterMatchingOffers('AirPods Pro 2', offers);
    expect(matched).toHaveLength(1);
    expect(matched[0]?.retailer).toBe('amazon');
  });

  it('trusts a consensus GTIN over the title heuristic', () => {
    const offers = [
      makeOffer({ retailer: 'amazon', title: 'Apple AirPods Pro 2', gtin: '190199246850' }),
      makeOffer({ retailer: 'walmart', title: 'Totally different label', gtin: '190199246850' }),
      makeOffer({ retailer: 'target', title: 'Apple AirPods Pro 2', gtin: '000000000000' }),
    ];
    const matched = filterMatchingOffers('AirPods Pro 2', offers);
    expect(matched.map((offer) => offer.retailer)).toEqual(['amazon', 'walmart']);
  });

  it('respects a custom threshold', () => {
    const offers = [makeOffer({ title: 'AirPods Pro' })];
    expect(filterMatchingOffers('AirPods Pro 2 USB-C', offers, { threshold: 0.95 })).toHaveLength(
      0,
    );
    expect(filterMatchingOffers('AirPods Pro 2 USB-C', offers, { threshold: 0.2 })).toHaveLength(1);
  });
});

describe('dedupeOffers', () => {
  it('keeps the cheapest offer per retailer', () => {
    const offers = [
      makeOffer({ retailer: 'amazon', id: 'a1', price: 229 }),
      makeOffer({ retailer: 'amazon', id: 'a2', price: 199 }),
      makeOffer({ retailer: 'walmart', id: 'w1', price: 205 }),
    ];
    const deduped = dedupeOffers(offers);
    expect(deduped).toHaveLength(2);
    expect(deduped.find((offer) => offer.retailer === 'amazon')?.id).toBe('a2');
  });

  it('prefers an in-stock offer when prices tie', () => {
    const offers = [
      makeOffer({ retailer: 'target', id: 't-out', price: 150, inStock: false }),
      makeOffer({ retailer: 'target', id: 't-in', price: 150, inStock: true }),
    ];
    expect(dedupeOffers(offers)[0]?.id).toBe('t-in');
  });

  it('returns an empty array for no offers', () => {
    expect(dedupeOffers([])).toEqual([]);
  });
});

describe('identifiers', () => {
  it('hashes deterministically', () => {
    expect(hash32('https://example.com/a')).toBe(hash32('https://example.com/a'));
    expect(hash32('https://example.com/a')).not.toBe(hash32('https://example.com/b'));
  });

  it('builds a URL-safe offer id', () => {
    const id = createOfferId('amazon', 'https://www.amazon.com/dp/B0D1XD1ZV3');
    expect(id).toMatch(/^amazon-[a-z0-9]+$/);
  });

  it('normalises GTINs and rejects invalid ones', () => {
    expect(normalizeGtin('0190199246850')).toBe('190199246850');
    expect(normalizeGtin(190199246850)).toBe('190199246850');
    expect(normalizeGtin('12345')).toBeNull();
    expect(normalizeGtin(null)).toBeNull();
    expect(normalizeGtin({})).toBeNull();
  });
});
