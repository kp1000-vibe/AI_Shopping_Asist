import { Redis } from '@upstash/redis';
import type { z } from 'zod';
import { serverEnv } from '@/lib/env';

/** Search results are considered fresh for 15 minutes. */
export const SEARCH_CACHE_TTL_SECONDS = 15 * 60;
/** Individual offers stay resolvable by /go/[offerId] for a day. */
export const OFFER_CACHE_TTL_SECONDS = 24 * 60 * 60;

let redis: Redis | null | undefined;

/** Upstash client, or null when Redis is not configured. */
export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const env = serverEnv();
  redis =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
      : null;
  return redis;
}

/**
 * Per-instance fallback so local development and preview deployments work
 * without a Redis database. It is not shared between serverless instances, so
 * production should always configure Upstash.
 */
const memory = new Map<string, { value: unknown; expiresAt: number }>();

function memoryGet(key: string): unknown {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
  // Keep the fallback bounded; it only ever backs a single warm instance.
  if (memory.size > 500) {
    const oldest = memory.keys().next();
    if (!oldest.done) memory.delete(oldest.value);
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Test helper. */
export function clearMemoryCache(): void {
  memory.clear();
}

/**
 * Read a cached value and validate it against `schema`. Cached data that no
 * longer matches the current schema is discarded rather than returned.
 */
export async function cacheGet<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  let raw: unknown = null;
  const client = getRedis();

  if (client) {
    try {
      raw = await client.get(key);
    } catch (error) {
      console.warn('[cache] Redis read failed, falling back to memory', error);
      raw = memoryGet(key);
    }
  } else {
    raw = memoryGet(key);
  }

  if (raw === null || raw === undefined) return null;

  const candidate = typeof raw === 'string' ? safeJsonParse(raw) : raw;
  if (candidate === null) return null;

  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    } catch (error) {
      console.warn('[cache] Redis write failed, falling back to memory', error);
    }
  }
  memorySet(key, value, ttlSeconds);
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function searchCacheKey(query: string, state: string): string {
  return `priceshelf:search:v1:${state.toLowerCase()}:${query.toLowerCase()}`;
}

export function offerCacheKey(offerId: string): string {
  return `priceshelf:offer:v1:${offerId}`;
}
