import type { Offer } from '@/lib/types';

export interface ProviderContext {
  /** Raw shopper query, already trimmed and length-validated. */
  query: string;
  /** Per-provider hard timeout in milliseconds. */
  timeoutMs: number;
  /** Aborts when the incoming request is cancelled. */
  signal?: AbortSignal;
  /** Injectable clock so adapters are deterministic under test. */
  now?: () => Date;
}

export interface Provider {
  /** Stable id used in cache keys and the "did not respond" notice. */
  id: string;
  /** Shopper-facing name. */
  label: string;
  /**
   * Per-provider deadline, when the shared default is wrong for this upstream.
   * SerpApi scrapes Google live for a query it has not seen, which its own
   * `total_time_taken` puts at 15-37s, so it needs far longer than the rest.
   */
  timeoutMs?: number;
  /** False when the provider has no credentials configured. */
  isConfigured(): boolean;
  search(context: ProviderContext): Promise<Offer[]>;
}

export function nowIso(context: ProviderContext): string {
  return (context.now?.() ?? new Date()).toISOString();
}
