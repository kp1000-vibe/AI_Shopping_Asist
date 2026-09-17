import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/cache';

export const SEARCH_RATE_LIMIT = 30;
export const SEARCH_RATE_WINDOW_SECONDS = 60;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch milliseconds when the current window resets. */
  reset: number;
}

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  const redis = getRedis();
  limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(SEARCH_RATE_LIMIT, `${SEARCH_RATE_WINDOW_SECONDS} s`),
        prefix: 'priceshelf:ratelimit:search',
        analytics: false,
      })
    : null;
  return limiter;
}

/** Fallback counter for environments without Redis (local dev, previews). */
const buckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const windowMs = SEARCH_RATE_WINDOW_SECONDS * 1000;
  const bucket = buckets.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      limit: SEARCH_RATE_LIMIT,
      remaining: SEARCH_RATE_LIMIT - 1,
      reset: resetAt,
    };
  }

  bucket.count += 1;
  return {
    success: bucket.count <= SEARCH_RATE_LIMIT,
    limit: SEARCH_RATE_LIMIT,
    remaining: Math.max(0, SEARCH_RATE_LIMIT - bucket.count),
    reset: bucket.resetAt,
  };
}

/** Test helper. */
export function resetRateLimiter(): void {
  buckets.clear();
  limiter = undefined;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const instance = getLimiter();
  if (!instance) return memoryLimit(identifier);

  try {
    const result = await instance.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.warn('[rate-limit] Redis limiter failed, falling back to memory', error);
    return memoryLimit(identifier);
  }
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIdentifier(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'anonymous';
}
