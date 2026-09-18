import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvCache } from '@/lib/env';
import {
  detailText,
  mapShoppingResult,
  mapStore,
  parseShoppingResults,
  parseStores,
  rankProducts,
  serpapiProvider,
  splitMerchantName,
  unwrapGoogleUrl,
  type ProductContext,
} from '@/lib/providers/serpapi';
import { FIXED_NOW } from '@/tests/fixtures';

/**
 * Payloads below mirror what serpapi.com actually returned for these engines:
 * `google_shopping` carries no merchant link, only an immersive page token,
 * and `details_and_offers` is a list of plain strings.
 */
const SEARCH_PAYLOAD = {
  search_metadata: { status: 'Success' },
  shopping_results: [
    {
      position: 1,
      title: 'Apple AirPods Pro 2',
      product_id: '109082299',
      product_link: 'https://www.google.com/search?ibp=oshop&q=AirPods Pro 2&prds=catalogid:109',
      immersive_product_page_token: 'token-airpods-pro-2',
      source: 'Walmart - Cellfeee',
      price: '$154.99',
      extracted_price: 154.99,
      rating: 4.7,
      reviews: 15234,
      thumbnail: 'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:abc',
      delivery: 'Free delivery',
    },
    {
      position: 2,
      title: 'Silicone Case for AirPods Pro 2',
      immersive_product_page_token: 'token-case',
      source: 'Amazon.com',
      extracted_price: 9.99,
    },
    {
      position: 3,
      title: 'Dyson V15 Detect Cordless Vacuum',
      immersive_product_page_token: 'token-unrelated',
      source: 'Best Buy',
      extracted_price: 599,
    },
  ],
};

const IMMERSIVE_PAYLOAD = {
  search_metadata: { status: 'Success' },
  product_results: {
    title: 'Apple AirPods Pro 2',
    rating: 4.7,
    reviews: 15234,
    thumbnails: ['https://encrypted-tbn3.gstatic.com/shopping?q=tbn:abc'],
    stores: [
      {
        name: 'Walmart - Cellfeee',
        link: 'https://www.walmart.com/ip/Apple-AirPods-Pro-2nd-generation/5233405730',
        title: 'Apple AirPods Pro 2nd generation with MagSafe Case',
        price: '$154.99',
        extracted_price: 154.99,
        shipping: 'Free',
        total: '$154.99',
        extracted_total: 154.99,
        details_and_offers: ['In stock online', 'Free delivery'],
      },
      {
        name: 'eBay',
        link: 'https://www.ebay.com/itm/358128155517',
        price: '$170.00',
        extracted_price: 170,
        shipping: '+ $19.95',
        details_and_offers: ['In stock online', 'Delivery $19.95'],
      },
      {
        name: 'Poshmark',
        link: 'https://poshmark.com/listing/abc',
        extracted_price: 75,
        details_and_offers: ['In stock online'],
      },
      { name: 'No link merchant', extracted_price: 100 },
    ],
  },
};

function mockTwoStageFetch() {
  return vi.fn().mockImplementation((input: unknown) => {
    const url = String(input);
    const body = url.includes('google_immersive_product') ? IMMERSIVE_PAYLOAD : SEARCH_PAYLOAD;
    return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
  });
}

const PRODUCT: ProductContext = {
  title: 'Apple AirPods Pro 2',
  image: 'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:abc',
  rating: 4.7,
  reviewCount: 15234,
  gtin: null,
};

describe('unwrapGoogleUrl', () => {
  it('returns non-Google URLs unchanged', () => {
    expect(unwrapGoogleUrl('https://www.walmart.com/ip/1')).toBe('https://www.walmart.com/ip/1');
  });

  it('extracts the merchant URL from a Google redirect', () => {
    const wrapped = 'https://www.google.com/url?q=https%3A%2F%2Fwww.target.com%2Fp%2F1&sa=U';
    expect(unwrapGoogleUrl(wrapped)).toBe('https://www.target.com/p/1');
  });

  it('returns null for a Google URL whose nested param is not a URL', () => {
    expect(unwrapGoogleUrl('https://www.google.com/search?ibp=oshop&q=AirPods+Pro+2')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(unwrapGoogleUrl('not-a-url')).toBeNull();
  });
});

describe('splitMerchantName', () => {
  it('separates a marketplace seller from the retailer', () => {
    expect(splitMerchantName('Walmart - Cellfeee')).toEqual({
      retailer: 'Walmart',
      seller: 'Cellfeee',
    });
  });

  it('leaves a plain retailer name alone', () => {
    expect(splitMerchantName('Best Buy')).toEqual({ retailer: 'Best Buy', seller: null });
  });
});

describe('detailText', () => {
  it('flattens plain string entries', () => {
    expect(
      detailText({ name: 'x', details_and_offers: ['In stock online', 'Free delivery'] }),
    ).toBe('In stock online Free delivery');
  });

  it('also accepts the older object form', () => {
    expect(detailText({ name: 'x', details_and_offers: [{ text: 'Free delivery' }] })).toBe(
      'Free delivery',
    );
  });

  it('is empty when the field is missing', () => {
    expect(detailText({ name: 'x' })).toBe('');
  });
});

describe('per-item validation', () => {
  it('keeps good rows and drops malformed ones', () => {
    const stores = parseStores([
      { name: 'Walmart', link: 'https://www.walmart.com/ip/1' },
      { notAStore: true },
      42,
    ]);
    expect(stores).toHaveLength(1);
    expect(stores[0]?.name).toBe('Walmart');
  });

  it('does not let one bad shopping result discard the page', () => {
    const results = parseShoppingResults([{ title: 'Real product' }, { title: '' }, null]);
    expect(results).toHaveLength(1);
  });
});

describe('mapStore', () => {
  it('maps a marketplace seller row to an offer', () => {
    const offer = mapStore(IMMERSIVE_PAYLOAD.product_results.stores[0]!, PRODUCT, FIXED_NOW);

    expect(offer).toMatchObject({
      retailer: 'walmart',
      price: 154.99,
      shipping: 0,
      inStock: true,
      rating: 4.7,
      reviewCount: 15234,
      url: 'https://www.walmart.com/ip/Apple-AirPods-Pro-2nd-generation/5233405730',
    });
    expect(offer?.condition).toEqual(
      expect.arrayContaining(['free-shipping', 'third-party-seller']),
    );
  });

  it('parses a shipping charge from the shipping field', () => {
    const offer = mapStore(IMMERSIVE_PAYLOAD.product_results.stores[1]!, PRODUCT, FIXED_NOW);
    expect(offer?.retailer).toBe('ebay');
    expect(offer?.shipping).toBe(19.95);
  });

  it('falls back to the detail line when there is no shipping field', () => {
    const offer = mapStore(
      {
        name: 'eBay',
        link: 'https://www.ebay.com/itm/1',
        extracted_price: 170,
        details_and_offers: ['In stock online', 'Delivery $12.50'],
      },
      PRODUCT,
      FIXED_NOW,
    );
    expect(offer?.shipping).toBe(12.5);
  });

  it('drops merchants that are not tracked retailers', () => {
    expect(mapStore(IMMERSIVE_PAYLOAD.product_results.stores[2]!, PRODUCT, FIXED_NOW)).toBeNull();
  });

  it('drops rows with no link', () => {
    expect(mapStore(IMMERSIVE_PAYLOAD.product_results.stores[3]!, PRODUCT, FIXED_NOW)).toBeNull();
  });

  it('drops rows with no usable price', () => {
    expect(
      mapStore({ name: 'Target', link: 'https://www.target.com/p/1' }, PRODUCT, FIXED_NOW),
    ).toBeNull();
  });

  it('marks an out-of-stock seller', () => {
    const offer = mapStore(
      {
        name: 'Target',
        link: 'https://www.target.com/p/1',
        extracted_price: 199,
        details_and_offers: ['Out of stock'],
      },
      PRODUCT,
      FIXED_NOW,
    );
    expect(offer?.inStock).toBe(false);
    expect(offer?.condition).toContain('out-of-stock');
  });
});

describe('rankProducts', () => {
  it('keeps matching products and drops accessories and unrelated items', () => {
    const results = parseShoppingResults(SEARCH_PAYLOAD.shopping_results);
    const ranked = rankProducts('AirPods Pro 2', results);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Apple AirPods Pro 2');
  });

  it('ignores products with no immersive token', () => {
    const ranked = rankProducts('AirPods Pro 2', [{ title: 'Apple AirPods Pro 2' }]);
    expect(ranked).toEqual([]);
  });

  it('respects the lookup limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      title: 'Apple AirPods Pro 2',
      immersive_product_page_token: `token-${i}`,
    }));
    expect(rankProducts('AirPods Pro 2', many, 3)).toHaveLength(3);
  });
});

describe('mapShoppingResult (direct-link fast path)', () => {
  it('maps a result that already carries a merchant link', () => {
    const offer = mapShoppingResult(
      {
        title: 'Apple AirPods Pro 2',
        link: 'https://www.walmart.com/ip/apple-airpods-pro-2/1234567',
        source: 'Walmart',
        extracted_price: 189,
        extracted_old_price: 249,
        rating: 4.6,
        reviews: 4321,
        thumbnail: 'https://serpapi.com/images/airpods.jpg',
        delivery: 'Free delivery with Walmart+',
      },
      FIXED_NOW,
    );

    expect(offer).toMatchObject({
      retailer: 'walmart',
      price: 189,
      originalPrice: 249,
      shipping: 0,
    });
    expect(offer?.condition).toContain('walmart-plus');
  });

  it('refuses a Google Shopping product page as a destination', () => {
    expect(
      mapShoppingResult(
        {
          title: 'Apple AirPods Pro 2',
          product_link: 'https://www.google.com/search?ibp=oshop&q=AirPods+Pro+2',
          source: 'Walmart',
          extracted_price: 154.99,
        },
        FIXED_NOW,
      ),
    ).toBeNull();
  });

  it('drops untracked merchants and unusable prices', () => {
    expect(
      mapShoppingResult(
        {
          title: 'x',
          link: 'https://www.some-shop.com/p/1',
          source: 'Some Shop',
          extracted_price: 9,
        },
        FIXED_NOW,
      ),
    ).toBeNull();
    expect(
      mapShoppingResult(
        {
          title: 'x',
          link: 'https://www.target.com/p/1',
          source: 'Target',
          price: 'See price in cart',
        },
        FIXED_NOW,
      ),
    ).toBeNull();
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

  it('searches, then resolves seller lists for the matching product', async () => {
    const fetchMock = mockTwoStageFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const offers = await serpapiProvider.search({
      query: 'AirPods Pro 2',
      timeoutMs: 8000,
      now: () => new Date(FIXED_NOW),
    });

    // Walmart and eBay are tracked; Poshmark and the link-less row are not.
    expect(offers.map((offer) => offer.retailer).sort()).toEqual(['ebay', 'walmart']);

    const calls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calls[0]).toContain('engine=google_shopping');
    // Only the one matching product earns an immersive lookup.
    expect(calls.filter((url) => url.includes('google_immersive_product'))).toHaveLength(1);
  });

  it('returns an empty list when no key is configured', async () => {
    delete process.env.SERPAPI_KEY;
    resetServerEnvCache();
    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).resolves.toEqual(
      [],
    );
  });

  it('throws when SerpApi reports an error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: 'Invalid API key' }),
    } as Response) as unknown as typeof fetch;

    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).rejects.toThrow(
      'Invalid API key',
    );
  });

  it('throws a ProviderError on a non-2xx response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response) as unknown as typeof fetch;

    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it('survives an immersive lookup failing', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: unknown) => {
      if (String(input).includes('google_immersive_product')) {
        return Promise.reject(new Error('upstream down'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => SEARCH_PAYLOAD,
      } as Response);
    }) as unknown as typeof fetch;

    await expect(
      serpapiProvider.search({ query: 'AirPods Pro 2', timeoutMs: 8000 }),
    ).resolves.toEqual([]);
  });

  it('skips lookups once the time budget is spent', async () => {
    const fetchMock = mockTwoStageFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await serpapiProvider.search({ query: 'AirPods Pro 2', timeoutMs: 1 });

    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('immersive'))).toHaveLength(0);
  });

  it('returns an empty list when the payload shape is unusable', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => 'not an object',
    } as Response) as unknown as typeof fetch;

    await expect(serpapiProvider.search({ query: 'AirPods', timeoutMs: 8000 })).resolves.toEqual(
      [],
    );
  });
});
