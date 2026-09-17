import { DEFAULT_PROVIDER_TIMEOUT_MS } from '@/lib/http';
import type { Offer, ProviderStatus } from '@/lib/types';
import { amazonProvider } from '@/lib/providers/amazon';
import { demoProvider } from '@/lib/providers/demo';
import { serpapiProvider } from '@/lib/providers/serpapi';
import { walmartProvider } from '@/lib/providers/walmart';
import type { Provider, ProviderContext } from '@/lib/providers/types';

export const ALL_PROVIDERS: readonly Provider[] = [
  serpapiProvider,
  amazonProvider,
  walmartProvider,
  demoProvider,
];

export interface RunProvidersOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Injectable for tests. Defaults to every built-in provider. */
  providers?: readonly Provider[];
  now?: () => Date;
}

export interface ProviderRunResult {
  offers: Offer[];
  /** One entry per provider that was actually attempted. */
  statuses: ProviderStatus[];
  /** True when at least one attempted provider failed or timed out. */
  partial: boolean;
  /** True when no provider has credentials configured. */
  noProvidersConfigured: boolean;
}

/** Reject if the provider has not settled within `timeoutMs`. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function reasonFor(error: unknown, label: string): string {
  if (error instanceof Error) {
    if (/timed out/i.test(error.message)) return `${label} did not respond in time`;
    return `${label} is temporarily unavailable`;
  }
  return `${label} is temporarily unavailable`;
}

/**
 * Query every configured provider in parallel. A provider that fails or times
 * out never blocks the others - the caller renders whatever arrived and shows a
 * "some stores did not respond" notice.
 */
export async function runProviders(
  query: string,
  options: RunProvidersOptions = {},
): Promise<ProviderRunResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  const registry = options.providers ?? ALL_PROVIDERS;
  const active = registry.filter((provider) => provider.isConfigured());

  if (active.length === 0) {
    return { offers: [], statuses: [], partial: false, noProvidersConfigured: true };
  }

  const context: Omit<ProviderContext, 'query'> = {
    timeoutMs,
    signal: options.signal,
    now: options.now,
  };

  const settled = await Promise.allSettled(
    active.map(async (provider) => {
      const startedAt = Date.now();
      try {
        const offers = await withTimeout(
          provider.search({ ...context, query }),
          timeoutMs,
          provider.label,
        );
        return { provider, offers, durationMs: Date.now() - startedAt };
      } catch (error) {
        throw Object.assign(new Error(reasonFor(error, provider.label)), {
          provider,
          durationMs: Date.now() - startedAt,
          cause: error,
        });
      }
    }),
  );

  const offers: Offer[] = [];
  const statuses: ProviderStatus[] = [];

  for (const [index, result] of settled.entries()) {
    const provider = active[index];
    if (!provider) continue;

    if (result.status === 'fulfilled') {
      offers.push(...result.value.offers);
      statuses.push({
        provider: provider.label,
        ok: true,
        durationMs: result.value.durationMs,
        offers: result.value.offers.length,
      });
    } else {
      const error = result.reason as Error & { durationMs?: number };
      console.warn(`[providers] ${provider.id} failed:`, error.message);
      statuses.push({
        provider: provider.label,
        ok: false,
        durationMs: error.durationMs ?? timeoutMs,
        offers: 0,
        reason: error.message,
      });
    }
  }

  return {
    offers,
    statuses,
    partial: statuses.some((status) => !status.ok),
    noProvidersConfigured: false,
  };
}

export type { Provider, ProviderContext } from '@/lib/providers/types';
