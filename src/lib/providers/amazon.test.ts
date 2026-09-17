import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvCache } from '@/lib/env';
import { amazonProvider, mapAmazonResult } from '@/lib/providers/amazon';
import { FIXED_NOW } from '@/tests/fixtures';

/** Trimmed but structurally faithful Rainforest API search payload. */
const PAYLOAD = {
  request_info: { success: true },
  search_results: [
    {
      position: 1,
      title: 'Apple AirPods Pro 2 Wireless Earbuds, USB-C',
      asin: 'B0D1XD1ZV3',
      link: 'https://www.amazon.com/dp/B0D1XD1ZV3',
      image: 'https://m.media-amazon.com/images/I/airpods.jpg',
      rating: 4.8,
      ratings_total: 15234,
      price: { symbol: '$', value: 199.99, currency: 'USD', raw: '$199.99' },
      rrp: { symbol: '$', value: 249, currency: 'USD', raw: '$249.00' },
      is_prime: true,
      availability: { raw: 'In Stock.' },
      gtin: '0190199246850',
    },
    {
      position: 2,
      title: 'Apple AirPods Pro 2 (Prime exclusive)',
      asin: 'B0PRIME001',
      image: 'https://m.media-amazon.com/images/I/airpods2.jpg',
      price: { value: 179.99, currency: 'USD' },
      is_prime_exclusive_deal: true,
      availability: { raw: 'Currently unavailable' },
      delivery: { tagline: 'FREE delivery' },
    },
    {
      position: 3,
      title: 'Listing priced in another currency',
      asin: 'B0EURO001',
      price: { value: 189, currency: 'EUR' },
    },
    {
      position: 4,
      title: 'Listing with no price at all',
      asin: 'B0NOPRICE1',
    },
  ],
};

function mockFetch(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 401,
    json: async () => payload,
  } as Response);
}

describe('mapAmazonResult', () => {
  it('maps a Prime listing', () => {
    const offer = mapAmazonResult(PAYLOAD.search_results[0]!, FIXED_NOW);
    expect(offer).toMatchObject({
      retailer: 'amazon',
      price: 199.99,
      originalPrice: 249,
      shipping: 0,
      inStock: true,
      rating: 4.8,
      reviewCount: 15234,
      gtin: '190199246850',
      url: 'https://www.amazon.com/dp/B0D1XD1ZV3',
    });
    expect(offer?.condition).toContain('prime-shipping');
  });

  it('detects a Prime exclusive price and out-of-stock availability', () => {
    const offer = mapAmazonResult(PAYLOAD.search_results[1]!, FIXED_NOW);
    expect(offer?.condition).toContain('prime-exclusive');
    expect(offer?.inStock).toBe(false);
    // Falls back to the ASIN when no link is supplied.
    expect(offer?.url).toBe('https://www.amazon.com/dp/B0PRIME001');
  });

  it('drops non-USD listings', () => {
    expect(mapAmazonResult(PAYLOAD.search_results[2]!, FIXED_NOW)).toBeNull();
  });

  it('drops listings with no price', () => {
    expect(mapAmazonResult(PAYLOAD.search_results[3]!, FIXED_NOW)).toBeNull();
  });

  it('drops listings with no ASIN and no link', () => {
    expect(mapAmazonResult({ title: 'Orphan', price: { value: 10 } }, FIXED_NOW)).toBeNull();
  });

  it('uses a reported delivery charge over the Prime default', () => {
    const offer = mapAmazonResult(
      {
        title: 'AirPods',
        asin: 'B0SHIP0001',
        price: { value: 100 },
        delivery: { price: { value: 6.99, currency: 'USD' } },
      },
      FIXED_NOW,
    );
    expect(offer?.shipping).toBe(6.99);
  });
});

describe('amazonProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.RAINFOREST_API_KEY = 'test-rainforest-key';
    resetServerEnvCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.RAINFOREST_API_KEY;
    resetServerEnvCache();
  });

  it('is configured only with an API key', () => {
    expect(amazonProvider.isConfigured()).toBe(true);
    delete process.env.RAINFOREST_API_KEY;
    resetServerEnvCache();
    expect(amazonProvider.isConfigured()).toBe(false);
  });

  it('returns the usable offers from a search response', async () => {
    const fetchMock = mockFetch(PAYLOAD);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const offers = await amazonProvider.search({
      query: 'AirPods Pro 2',
      timeoutMs: 8000,
      now: () => new Date(FIXED_NOW),
    });

    expect(offers).toHaveLength(2);
    expect(offers.every((offer) => offer.retailer === 'amazon')).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('amazon_domain=amazon.com');
  });

  it('returns nothing when not configured', async () => {
    delete process.env.RAINFOREST_API_KEY;
    resetServerEnvCache();
    await expect(amazonProvider.search({ query: 'AirPods', timeoutMs: 8000 })).resolves.toEqual([]);
  });

  it('throws when the request is rejected upstream', async () => {
    globalThis.fetch = mockFetch({
      request_info: { success: false, message: 'Invalid API key' },
    }) as unknown as typeof fetch;

    await expect(amazonProvider.search({ query: 'AirPods', timeoutMs: 8000 })).rejects.toThrow(
      'Invalid API key',
    );
  });

  it('throws a ProviderError on an HTTP failure', async () => {
    globalThis.fetch = mockFetch({}, false) as unknown as typeof fetch;
    await expect(amazonProvider.search({ query: 'AirPods', timeoutMs: 8000 })).rejects.toThrow(
      /HTTP 401/,
    );
  });
});
