import { describe, expect, it, vi } from 'vitest';
import { ALL_PROVIDERS, runProviders } from '@/lib/providers';
import type { Provider } from '@/lib/providers/types';
import { makeOffer } from '@/tests/fixtures';

function fakeProvider(overrides: Partial<Provider> & { id: string }): Provider {
  return {
    label: overrides.id,
    isConfigured: () => true,
    search: async () => [],
    ...overrides,
  };
}

describe('runProviders', () => {
  it('merges offers from every configured provider', async () => {
    const result = await runProviders('AirPods Pro 2', {
      providers: [
        fakeProvider({
          id: 'a',
          label: 'Provider A',
          search: async () => [makeOffer({ retailer: 'amazon' })],
        }),
        fakeProvider({
          id: 'b',
          label: 'Provider B',
          search: async () => [makeOffer({ retailer: 'walmart' })],
        }),
      ],
    });

    expect(result.offers).toHaveLength(2);
    expect(result.partial).toBe(false);
    expect(result.noProvidersConfigured).toBe(false);
    expect(result.statuses.every((status) => status.ok)).toBe(true);
  });

  it('keeps working when one provider fails', async () => {
    const result = await runProviders('AirPods Pro 2', {
      providers: [
        fakeProvider({
          id: 'ok',
          label: 'Working store',
          search: async () => [makeOffer({ retailer: 'target' })],
        }),
        fakeProvider({
          id: 'broken',
          label: 'Broken store',
          search: async () => {
            throw new Error('upstream 500');
          },
        }),
      ],
    });

    expect(result.offers).toHaveLength(1);
    expect(result.partial).toBe(true);
    const failed = result.statuses.find((status) => !status.ok);
    expect(failed?.provider).toBe('Broken store');
    expect(failed?.reason).toBe('Broken store is temporarily unavailable');
  });

  it('times out a provider that hangs and reports it', async () => {
    const result = await runProviders('AirPods Pro 2', {
      timeoutMs: 20,
      providers: [
        fakeProvider({
          id: 'slow',
          label: 'Slow store',
          search: () => new Promise(() => {}),
        }),
        fakeProvider({
          id: 'fast',
          label: 'Fast store',
          search: async () => [makeOffer({ retailer: 'bestbuy' })],
        }),
      ],
    });

    expect(result.offers).toHaveLength(1);
    expect(result.partial).toBe(true);
    expect(result.statuses.find((status) => !status.ok)?.reason).toBe(
      'Slow store did not respond in time',
    );
  });

  it('skips providers that are not configured', async () => {
    const search = vi.fn();
    const result = await runProviders('AirPods Pro 2', {
      providers: [fakeProvider({ id: 'off', isConfigured: () => false, search })],
    });

    expect(search).not.toHaveBeenCalled();
    expect(result.noProvidersConfigured).toBe(true);
    expect(result.statuses).toEqual([]);
    expect(result.partial).toBe(false);
  });

  it('normalises a non-Error rejection', async () => {
    const result = await runProviders('AirPods Pro 2', {
      providers: [
        fakeProvider({
          id: 'weird',
          label: 'Weird store',
          search: async () => {
            throw 'just a string';
          },
        }),
      ],
    });

    expect(result.partial).toBe(true);
    expect(result.statuses[0]?.reason).toBe('Weird store is temporarily unavailable');
  });

  it('honours a per-provider timeout when the run sets none', async () => {
    const result = await runProviders('AirPods Pro 2', {
      providers: [
        fakeProvider({
          id: 'patient',
          label: 'Patient store',
          timeoutMs: 400,
          search: async (context) => {
            // The provider is told its own budget, not the shared default.
            expect(context.timeoutMs).toBe(400);
            await new Promise((resolve) => setTimeout(resolve, 20));
            return [makeOffer({ retailer: 'amazon' })];
          },
        }),
      ],
    });

    expect(result.partial).toBe(false);
    expect(result.offers).toHaveLength(1);
  });

  it('lets an explicit run timeout override the provider preference', async () => {
    const result = await runProviders('AirPods Pro 2', {
      timeoutMs: 30,
      providers: [
        fakeProvider({
          id: 'slow',
          label: 'Slow store',
          timeoutMs: 60_000,
          search: () => new Promise(() => {}),
        }),
      ],
    });

    expect(result.partial).toBe(true);
    expect(result.statuses[0]?.reason).toBe('Slow store did not respond in time');
  });

  it('gives SerpApi a longer budget than the shared default', () => {
    const serpapi = ALL_PROVIDERS.find((provider) => provider.id === 'serpapi');
    // SerpApi scrapes Google live for a cold query: 15-37s by its own clock.
    expect(serpapi?.timeoutMs ?? 0).toBeGreaterThan(30_000);
  });

  it('registers the built-in providers', () => {
    expect(ALL_PROVIDERS.map((provider) => provider.id)).toEqual([
      'serpapi',
      'amazon',
      'walmart',
      'demo',
    ]);
  });
});
