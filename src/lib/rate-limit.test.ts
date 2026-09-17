import { beforeEach, describe, expect, it } from 'vitest';
import { resetServerEnvCache } from '@/lib/env';
import {
  checkRateLimit,
  clientIdentifier,
  resetRateLimiter,
  SEARCH_RATE_LIMIT,
  SEARCH_RATE_WINDOW_SECONDS,
} from '@/lib/rate-limit';

describe('checkRateLimit (memory fallback)', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetServerEnvCache();
    resetRateLimiter();
  });

  it('allows 30 searches per minute and blocks the 31st', async () => {
    expect(SEARCH_RATE_LIMIT).toBe(30);
    expect(SEARCH_RATE_WINDOW_SECONDS).toBe(60);

    for (let i = 0; i < SEARCH_RATE_LIMIT; i += 1) {
      const result = await checkRateLimit('1.2.3.4');
      expect(result.success).toBe(true);
    }

    const blocked = await checkRateLimit('1.2.3.4');
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBeGreaterThan(Date.now());
  });

  it('counts each client separately', async () => {
    for (let i = 0; i < SEARCH_RATE_LIMIT; i += 1) await checkRateLimit('5.5.5.5');
    expect((await checkRateLimit('5.5.5.5')).success).toBe(false);
    expect((await checkRateLimit('6.6.6.6')).success).toBe(true);
  });

  it('decrements the remaining allowance', async () => {
    const first = await checkRateLimit('9.9.9.9');
    const second = await checkRateLimit('9.9.9.9');
    expect(first.remaining).toBe(SEARCH_RATE_LIMIT - 1);
    expect(second.remaining).toBe(SEARCH_RATE_LIMIT - 2);
  });
});

describe('clientIdentifier', () => {
  it('uses the first x-forwarded-for entry', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' });
    expect(clientIdentifier(headers)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    expect(clientIdentifier(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
  });

  it('falls back to anonymous when no proxy headers are present', () => {
    expect(clientIdentifier(new Headers())).toBe('anonymous');
    expect(clientIdentifier(new Headers({ 'x-forwarded-for': '  ' }))).toBe('anonymous');
  });
});
