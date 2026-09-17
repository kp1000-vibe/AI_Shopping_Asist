/** Shared HTTP helper for provider adapters: timeouts, typed errors, no keys in logs. */

export class ProviderError extends Error {
  readonly provider: string;

  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProviderError';
    this.provider = provider;
  }
}

export interface FetchJsonOptions {
  provider: string;
  /** Hard timeout for the request. Providers are given 8 seconds by default. */
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Outer signal, e.g. the incoming request being aborted. */
  signal?: AbortSignal;
}

export const DEFAULT_PROVIDER_TIMEOUT_MS = 8_000;

/**
 * GET a JSON document with a hard timeout. Throws `ProviderError` on timeout,
 * transport failure, non-2xx status or a non-JSON body.
 */
export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  const { provider, timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS, headers, signal } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onOuterAbort = () => controller.abort(new Error('aborted'));
  signal?.addEventListener('abort', onOuterAbort, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', ...headers },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new ProviderError(provider, `${provider} responded with HTTP ${response.status}`);
    }

    try {
      return (await response.json()) as unknown;
    } catch (error) {
      throw new ProviderError(provider, `${provider} returned a malformed JSON body`, {
        cause: error,
      });
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderError(provider, `${provider} timed out after ${timeoutMs}ms`, {
        cause: error,
      });
    }
    throw new ProviderError(provider, `${provider} request failed`, { cause: error });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

/** Build a URL with query parameters, skipping undefined/empty values. */
export function buildUrl(
  base: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}
