import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvCache, serverEnv } from '@/lib/env';

const KEYS = [
  'SERPAPI_KEY',
  'RAINFOREST_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'AMAZON_ASSOCIATE_TAG',
];

describe('serverEnv', () => {
  beforeEach(() => {
    for (const key of KEYS) delete process.env[key];
    resetServerEnvCache();
  });

  afterEach(() => {
    for (const key of KEYS) delete process.env[key];
    resetServerEnvCache();
    vi.restoreAllMocks();
  });

  it('reads configured credentials', () => {
    process.env.SERPAPI_KEY = 'abc123';
    resetServerEnvCache();
    expect(serverEnv().SERPAPI_KEY).toBe('abc123');
  });

  it('treats an empty string as unset', () => {
    process.env.SERPAPI_KEY = '';
    resetServerEnvCache();
    expect(serverEnv().SERPAPI_KEY).toBeUndefined();
  });

  it('keeps valid credentials when another variable is malformed', () => {
    // Regression: parsing the whole object at once meant one bad value threw
    // away every other credential, and the site reported that no price sources
    // were configured while the provider key was perfectly fine.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.SERPAPI_KEY = 'good-key';
    process.env.UPSTASH_REDIS_REST_URL = 'not-a-url';
    resetServerEnvCache();

    const env = serverEnv();
    expect(env.SERPAPI_KEY).toBe('good-key');
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it('names the offending variable in the logs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.UPSTASH_REDIS_REST_URL = 'not-a-url';
    resetServerEnvCache();
    serverEnv();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('UPSTASH_REDIS_REST_URL'));
  });

  it('never leaks a value into the warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.UPSTASH_REDIS_REST_URL = 'super-secret-token-value';
    resetServerEnvCache();
    serverEnv();

    for (const call of warn.mock.calls) {
      expect(String(call[0])).not.toContain('super-secret-token-value');
    }
  });

  it('caches until explicitly reset', () => {
    process.env.SERPAPI_KEY = 'first';
    resetServerEnvCache();
    expect(serverEnv().SERPAPI_KEY).toBe('first');

    process.env.SERPAPI_KEY = 'second';
    expect(serverEnv().SERPAPI_KEY).toBe('first');

    resetServerEnvCache();
    expect(serverEnv().SERPAPI_KEY).toBe('second');
  });
});
