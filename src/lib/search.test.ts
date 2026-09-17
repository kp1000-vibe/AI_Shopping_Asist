import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMemoryCache } from '@/lib/cache';
import { resetServerEnvCache } from '@/lib/env';
import type { Provider } from '@/lib/providers/types';
import { getCachedOffer, searchOffers } from '@/lib/search';
import type { Offer } from '@/lib/types';
import { FIXED_NOW, makeOffer } from '@/tests/fixtures';

function provider(id: string, offers: Offer[] | (() => never), configured = true): Provider {
  return {
    id,
    label: id,
    isConfigured: () => configured,
    search: async () => (typeof offers === 'function' ? offers() : offers),
  };
}

const now = () => new Date(FIXED_NOW);

describe('searchOffers', () => {
  beforeEach(() => {
    clearMemoryCache();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetServerEnvCache();
  });

  it('matches, dedupes and price-sorts offers from every provider', async () => {
    const result = await searchOffers('AirPods Pro 2', {
      now,
      providers: [
        provider('a', [
          makeOffer({ retailer: 'amazon', id: 'amazon-1', price: 229 }),
          makeOffer({ retailer: 'amazon', id: 'amazon-2', price: 199 }),
          makeOffer({ retailer: 'walmart', id: 'walmart-1', price: 189 }),
        ]),
        provider('b', [
          makeOffer({
            retailer: 'target',
            id: 'target-1',
            price: 210,
            title: 'Silicone Case for AirPods Pro 2',
          }),
        ]),
      ],
    });

    expect(result.offers.map((offer) => offer.id)).toEqual(['walmart-1', 'amazon-2']);
    expect(result.partial).toBe(false);
    expect(result.providersConfigured).toBe(true);
    expect(result.cached).toBe(false);
    expect(result.slug).toBe('airpods-pro-2');
    expect(result.taxState).toBe('US');
  });

  it('serves the second identical search from the 15 minute cache', async () => {
    const providers = [provider('a', [makeOffer({ retailer: 'amazon' })])];

    const first = await searchOffers('AirPods Pro 2', { now, providers });
    expect(first.cached).toBe(false);

    const second = await searchOffers('AirPods Pro 2', { now, providers });
    expect(second.cached).toBe(true);
    expect(second.offers).toEqual(first.offers);
  });

  it('bypasses the cache when asked to', async () => {
    const providers = [provider('a', [makeOffer({ retailer: 'amazon' })])];
    await searchOffers('AirPods Pro 2', { now, providers });

    const fresh = await searchOffers('AirPods Pro 2', { now, providers, skipCache: true });
    expect(fresh.cached).toBe(false);
  });

  it('keys the cache by ship-to state', async () => {
    const providers = [provider('a', [makeOffer({ retailer: 'amazon' })])];
    await searchOffers('AirPods Pro 2', { now, providers, state: 'CA' });

    const other = await searchOffers('AirPods Pro 2', { now, providers, state: 'TX' });
    expect(other.cached).toBe(false);
    expect(other.taxState).toBe('TX');
  });

  it('falls back to the national average for an unknown state', async () => {
    const result = await searchOffers('AirPods Pro 2', {
      now,
      state: 'ZZ',
      providers: [provider('a', [makeOffer({ retailer: 'amazon' })])],
    });
    expect(result.taxState).toBe('US');
  });

  it('reports a partial result when a provider fails', async () => {
    const result = await searchOffers('AirPods Pro 2', {
      now,
      providers: [
        provider('ok', [makeOffer({ retailer: 'amazon' })]),
        provider('bad', () => {
          throw new Error('boom');
        }),
      ],
    });

    expect(result.partial).toBe(true);
    expect(result.offers).toHaveLength(1);
  });

  it('flags a deployment with no configured providers', async () => {
    const result = await searchOffers('AirPods Pro 2', {
      now,
      providers: [provider('off', [], false)],
    });

    expect(result.providersConfigured).toBe(false);
    expect(result.offers).toEqual([]);
  });

  it('does not cache an empty result set', async () => {
    const search = vi.fn().mockResolvedValue([]);
    const providers: Provider[] = [{ id: 'a', label: 'a', isConfigured: () => true, search }];

    await searchOffers('Nothing At All', { now, providers });
    await searchOffers('Nothing At All', { now, providers });

    expect(search).toHaveBeenCalledTimes(2);
  });
});

describe('getCachedOffer', () => {
  beforeEach(() => {
    clearMemoryCache();
    resetServerEnvCache();
  });

  it('resolves an offer stored by a previous search', async () => {
    await searchOffers('AirPods Pro 2', {
      now,
      providers: [provider('a', [makeOffer({ retailer: 'amazon', id: 'amazon-lookup' })])],
    });

    const offer = await getCachedOffer('amazon-lookup');
    expect(offer?.url).toContain('amazon.com');
  });

  it('returns null for an unknown offer id', async () => {
    await expect(getCachedOffer('amazon-doesnotexist')).resolves.toBeNull();
  });
});
