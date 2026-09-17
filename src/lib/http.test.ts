import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUrl, fetchJson, ProviderError } from '@/lib/http';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

describe('buildUrl', () => {
  it('appends defined parameters only', () => {
    const url = buildUrl('https://api.example.com/search', {
      q: 'AirPods',
      num: 60,
      empty: '',
      missing: undefined,
      nothing: null,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('q')).toBe('AirPods');
    expect(parsed.searchParams.get('num')).toBe('60');
    expect(parsed.searchParams.has('empty')).toBe(false);
    expect(parsed.searchParams.has('missing')).toBe(false);
    expect(parsed.searchParams.has('nothing')).toBe(false);
  });
});

describe('fetchJson', () => {
  it('returns the parsed body on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    } as Response) as unknown as typeof fetch;

    await expect(fetchJson('https://api.example.com', { provider: 'Test' })).resolves.toEqual({
      hello: 'world',
    });
  });

  it('throws a ProviderError for a non-2xx status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response) as unknown as typeof fetch;

    await expect(fetchJson('https://api.example.com', { provider: 'Test' })).rejects.toThrow(
      ProviderError,
    );
  });

  it('throws a ProviderError for a malformed JSON body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('invalid json');
      },
    } as unknown as Response) as unknown as typeof fetch;

    await expect(fetchJson('https://api.example.com', { provider: 'Test' })).rejects.toThrow(
      /malformed JSON/,
    );
  });

  it('wraps a transport failure', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('ECONNRESET')) as unknown as typeof fetch;

    await expect(fetchJson('https://api.example.com', { provider: 'Test' })).rejects.toThrow(
      'Test request failed',
    );
  });

  it('aborts and reports a timeout', async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    ) as unknown as typeof fetch;

    await expect(
      fetchJson('https://api.example.com', { provider: 'Test', timeoutMs: 10 }),
    ).rejects.toThrow(/timed out after 10ms/);
  });

  it('carries the provider name on the error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response) as unknown as typeof fetch;

    await expect(
      fetchJson('https://api.example.com', { provider: 'Google Shopping' }),
    ).rejects.toMatchObject({ provider: 'Google Shopping', name: 'ProviderError' });
  });
});
