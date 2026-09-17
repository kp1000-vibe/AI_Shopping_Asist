import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvCache } from '@/lib/env';
import { mapWalmartItem, walmartProvider } from '@/lib/providers/walmart';
import { FIXED_NOW } from '@/tests/fixtures';

/** Trimmed but structurally faithful Impact Catalogs ItemSearch payload. */
const PAYLOAD = {
  Items: [
    {
      Name: 'Apple AirPods Pro 2 Wireless Earbuds with USB-C',
      Url: 'https://www.walmart.com/ip/apple-airpods-pro-2/1234567',
      ImageUrl: 'https://i5.walmartimages.com/asr/airpods.jpeg',
      CurrentPrice: '189.00',
      OriginalPrice: '249.00',
      Currency: 'USD',
      StockAvailability: 'InStock',
      Condition: 'New',
      Gtin: '0190199246850',
      ShippingRate: '0',
    },
    {
      Name: 'Apple AirPods Pro 2 - open box',
      Url: 'https://www.walmart.com/ip/apple-airpods-pro-2-open-box/7654321',
      CurrentPrice: '149.00',
      StockAvailability: 'OutOfStock',
      Condition: 'Used',
    },
    {
      Name: 'Listing priced in CAD',
      Url: 'https://www.walmart.ca/ip/1',
      CurrentPrice: '199.00',
      Currency: 'CAD',
    },
    {
      Name: 'Listing with no URL',
      CurrentPrice: '99.00',
    },
    {
      Name: 'Listing with no price',
      Url: 'https://www.walmart.com/ip/nope/1',
    },
  ],
};

function mockFetch(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 403,
    json: async () => payload,
  } as Response);
}

describe('mapWalmartItem', () => {
  it('maps an in-stock item', () => {
    const offer = mapWalmartItem(PAYLOAD.Items[0]!, FIXED_NOW);
    expect(offer).toMatchObject({
      retailer: 'walmart',
      price: 189,
      originalPrice: 249,
      shipping: 0,
      inStock: true,
      gtin: '190199246850',
    });
    expect(offer?.condition).toContain('free-shipping');
  });

  it('flags used and out-of-stock items', () => {
    const offer = mapWalmartItem(PAYLOAD.Items[1]!, FIXED_NOW);
    expect(offer?.inStock).toBe(false);
    expect(offer?.condition).toEqual(expect.arrayContaining(['used', 'out-of-stock']));
  });

  it('drops non-USD, URL-less and price-less items', () => {
    expect(mapWalmartItem(PAYLOAD.Items[2]!, FIXED_NOW)).toBeNull();
    expect(mapWalmartItem(PAYLOAD.Items[3]!, FIXED_NOW)).toBeNull();
    expect(mapWalmartItem(PAYLOAD.Items[4]!, FIXED_NOW)).toBeNull();
  });
});

describe('walmartProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.WALMART_API_KEY = 'IRaccount123';
    process.env.WALMART_API_SECRET = 'secret-token';
    resetServerEnvCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.WALMART_API_KEY;
    delete process.env.WALMART_API_SECRET;
    resetServerEnvCache();
  });

  it('needs both the account id and the token', () => {
    expect(walmartProvider.isConfigured()).toBe(true);
    delete process.env.WALMART_API_SECRET;
    resetServerEnvCache();
    expect(walmartProvider.isConfigured()).toBe(false);
  });

  it('sends Basic auth and maps the catalogue items', async () => {
    const fetchMock = mockFetch(PAYLOAD);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const offers = await walmartProvider.search({
      query: 'AirPods Pro 2',
      timeoutMs: 8000,
      now: () => new Date(FIXED_NOW),
    });

    expect(offers).toHaveLength(2);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/Mediapartners/IRaccount123/Catalogs/ItemSearch');
    const headers = (init as RequestInit | undefined)?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${btoa('IRaccount123:secret-token')}`);
  });

  it('returns nothing when not configured', async () => {
    delete process.env.WALMART_API_KEY;
    resetServerEnvCache();
    await expect(walmartProvider.search({ query: 'AirPods', timeoutMs: 8000 })).resolves.toEqual(
      [],
    );
  });

  it('returns an empty list for an unexpected payload', async () => {
    globalThis.fetch = mockFetch(42) as unknown as typeof fetch;
    await expect(walmartProvider.search({ query: 'AirPods', timeoutMs: 8000 })).resolves.toEqual(
      [],
    );
  });

  it('throws a ProviderError on an HTTP failure', async () => {
    globalThis.fetch = mockFetch({}, false) as unknown as typeof fetch;
    await expect(walmartProvider.search({ query: 'AirPods', timeoutMs: 8000 })).rejects.toThrow(
      /HTTP 403/,
    );
  });
});
