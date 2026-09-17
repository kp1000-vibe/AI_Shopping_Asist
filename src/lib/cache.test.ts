import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  cacheGet,
  cacheSet,
  clearMemoryCache,
  getRedis,
  offerCacheKey,
  searchCacheKey,
  OFFER_CACHE_TTL_SECONDS,
  SEARCH_CACHE_TTL_SECONDS,
} from '@/lib/cache';
import { resetServerEnvCache } from '@/lib/env';

const Schema = z.object({ value: z.string() });

describe('cache keys and TTLs', () => {
  it('namespaces and lowercases search keys', () => {
    expect(searchCacheKey('AirPods Pro 2', 'CA')).toBe('priceshelf:search:v1:ca:airpods pro 2');
    expect(offerCacheKey('amazon-abc')).toBe('priceshelf:offer:v1:amazon-abc');
  });

  it('caches searches for 15 minutes and offers for a day', () => {
    expect(SEARCH_CACHE_TTL_SECONDS).toBe(900);
    expect(OFFER_CACHE_TTL_SECONDS).toBe(86_400);
  });
});

describe('memory fallback', () => {
  beforeEach(() => {
    clearMemoryCache();
    resetServerEnvCache();
    vi.useRealTimers();
  });

  afterEach(() => {
    clearMemoryCache();
    vi.useRealTimers();
  });

  it('round-trips a validated value', async () => {
    await cacheSet('k1', { value: 'hello' }, 60);
    await expect(cacheGet('k1', Schema)).resolves.toEqual({ value: 'hello' });
  });

  it('returns null for a missing key', async () => {
    await expect(cacheGet('missing', Schema)).resolves.toBeNull();
  });

  it('discards entries that no longer match the schema', async () => {
    await cacheSet('k2', { value: 42 }, 60);
    await expect(cacheGet('k2', Schema)).resolves.toBeNull();
  });

  it('expires entries once the TTL has passed', async () => {
    vi.useFakeTimers();
    await cacheSet('k3', { value: 'stale' }, 1);
    vi.advanceTimersByTime(1500);
    await expect(cacheGet('k3', Schema)).resolves.toBeNull();
  });

  it('parses JSON strings that were stored by Redis', async () => {
    await cacheSet('k4', JSON.stringify({ value: 'from-redis' }), 60);
    await expect(cacheGet('k4', Schema)).resolves.toEqual({ value: 'from-redis' });
  });

  it('returns null for an unparseable JSON string', async () => {
    await cacheSet('k5', '{not json', 60);
    await expect(cacheGet('k5', Schema)).resolves.toBeNull();
  });

  it('stays bounded under heavy write load', async () => {
    for (let i = 0; i < 600; i += 1) {
      await cacheSet(`bulk-${i}`, { value: String(i) }, 60);
    }
    await expect(cacheGet('bulk-599', Schema)).resolves.toEqual({ value: '599' });
  });
});

describe('getRedis', () => {
  it('returns null when Upstash is not configured', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetServerEnvCache();
    expect(getRedis()).toBeNull();
  });
});
