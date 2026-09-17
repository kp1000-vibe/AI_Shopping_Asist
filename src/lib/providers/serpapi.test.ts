import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvCache } from '@/lib/env';
import { mapShoppingResult, serpapiProvider, unwrapGoogleUrl } from '@/lib/providers/serpapi';
import { FIXED_NOW } from '@/tests/fixtures';

/** Trimmed but structurally faithful SerpApi google_shopping payload. */
const PAYLOAD = {
  search_metadata: { status: 'Success' },
  shopping_results: [
    {
      position: 1,
      title: 'Apple AirPods Pro 2 Wireless Earbuds with USB-C',
      link: 'https://www.walmart.com/ip/apple-airpods-pro-2/1234567',
      source: 'Walmart',
      price: '$189.00',
      extracted_price: 189,
      old_price: '$249.00',
      extracted_old_price: 249,
      rating: 4.6,
      reviews: 4321,
      thumbnail: 'https://serpapi.com/images/airpods.jpg',
      delivery: 'Free delivery with Walmart+',
    },
    {
      position: 2,
      title: 'Apple AirPods Pro 2',
      link: 'https://www.costco.com/apple-airpods-pro-2.product.100.html',
      source: 'Costco Wholesale',
      extracted_price: 179.99,
      delivery: '$5.99 delivery',
      thumbnail: 'https://serpapi.com/images/airpods-costco.jpg',
    },
    {
      position: 3,
      title: 'Apple AirPods Pro 2 refurbished',
      link: 'https://www.ebay.com/itm/1234567890',
      source: 'eBay',
      extracted_price: 149,
      second_hand_condition: 'Renewed',
      delivery: 'Free delivery',
    },
    {
      position: 4,
      title: 'Unknown merchant listing',
      link: 'https://www.some-random-shop.com/p/1',
      source: 'Some Random Shop',
      extracted_price: 99,
    },
    {
      position: 5,
      title: 'Listing with no usable price',
      link: 'https://www.target.com/p/airpods/-/A-1',
      source: 'Target',
      price: 'See price in cart',
    },
  ],
};

function mockFetch(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  } as Response);
}

describe('unwrapGoogleUrl', () => {
  it('returns non-Google URLs unchanged', () => {
    expect(unwrapGoogleUrl('https://www.walmart.com/ip/1')).toBe('https://www.walmart.com/ip/1');
  });

  it('extracts the merchant URL from a Google redirect', () => {
    const wrapped = 'https://www.google.com/url?q=https%3A%2F%2Fwww.target.com%2Fp%2F1&sa=U';
    expect(unwrapGoogleUrl(wrapped)).toBe('https://www.target.com/p/1');
  });

  it('returns null for a Google URL with no nested target', () => {
    expect(unwrapGoogleUrl('https://www.google.com/shopping/product/1')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(unwrapGoogleUrl('not-a-url')).toBeNull();
  });
});

describe('mapShoppingResult', () => {
  it('maps a full result to a normalised offer', () => {
    const offer = mapShoppingResult(PAYLOAD.shopping_results[0]!, FIXED_NOW);
    expect(offer).toMatchObject({
      retailer: 'walmart',
      price: 189,
      originalPrice: 249,
      shipping: 0,
      inStock: true,
      rating: 4.6,
      reviewCount: 4321,
      lastUpdated: FIXED_NOW,
    });
    expect(offer?.condition).toContain('walmart-plus');
    expect(offer?.id).toMatch(/^walmart-/);
  });

  it('parses a paid delivery charge and membership requirement', () => {
    const offer = mapShoppingResult(PAYLOAD.shopping_results[1]!, FIXED_NOW);
    expect(offer?.retailer).toBe('costco');
    expect(offer?.shipping).toBe(5.99);
    expect(offer?.condition).toContain('membership-required');
  });

  it('detects a renewed condition', () => {
    const offer = mapShoppingResult(PAYLOAD.shopping_results[2]!, FIXED_NOW);
    expect(offer?.condition).toContain('renewed');
  });

  it('drops merchants that are not tracked retailers', () => {
    expect(mapShoppingResult(PAYLOAD.shopping_results[3]!, FIXED_NOW)).toBeNull();
  });

  it('drops listings with no parseable price', () => {
    expect(mapShoppingResult(PAYLOAD.shopping_results[4]!, FIXED_NOW)).toBeNull();
  });

  it('ignores a strike-through price that is not a discount', () => {
    const offer = mapShoppingResult(
      {
        title: 'AirPods',
        link: 'https://www.target.com/p/1',
        source: 'Target',
        extracted_price: 200,
        extracted_old_price: 180,
      },
      FIXED_NOW,
    );
    expect(offer?.originalPrice).toBeNull();
  });

  it('marks sold-out listings as out of stock', () => {
    const offer = mapShoppingResult(
      {
        title: 'AirPods',
        link: 'https://www.target.com/p/1',
        source: 'Target',
        extracted_price: 200,
        tag: 'Out of stock',
      },
      FIXED_NOW,
    );
    expect(offer?.inStock).toBe(false);
    expect(offer?.condition).toContain('out-of-stock');
  });
});

describe('serpapiProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.SERPAPI_KEY = 'test-serpapi-key';
    resetServerEnvCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SERPAPI_KEY;
    resetServerEnvCache();
  });

  it('reports itself configured only when a key is present', () => {
    expect(serpapiProvider.isConfigured()).toBe(true);
    delete process.env.SERPAPI_KEY;
    resetServerEnvCache();
    expect(serpapiProvider.isConfigured()).toBe(false);
  });

  it('returns only offers from tracked retailers', async () => {
    const fetchMock = mockFetch(PAYLOAD);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const offers = await serpapiProvider.search({
      query: 'AirPods Pro 2',
      timeoutMs: 8000,
      now: () => new Date(FIXED_NOW),
    });

    expect(offers.map((offer) => offer.retailer)).toEqual(['walmart', 'costco', 'ebay']);
    const requested = String(fetchMock.mock.calls[0]?.[0]);
    expect(requested).toContain('engine=google_shopping');
    expect(requested).toContain('gl=us');
  });

  it('returns an empty list when no key is configured', async () => {
    delete process.env.SERPAPI_KEY;
    resetServerEnvCache();
    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).resolves.toEqual(
      [],
    );
  });

  it('throws when SerpApi reports an error', async () => {
    globalThis.fetch = mockFetch({ error: 'Invalid API key' }) as unknown as typeof fetch;
    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).rejects.toThrow(
      'Invalid API key',
    );
  });

  it('throws a ProviderError on a non-2xx response', async () => {
    globalThis.fetch = mockFetch({}, false) as unknown as typeof fetch;
    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it('returns an empty list when the payload shape is unusable', async () => {
    globalThis.fetch = mockFetch('not an object') as unknown as typeof fetch;
    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).resolves.toEqual(
      [],
    );
  });
});
