import { z } from 'zod';

/**
 * Server-side environment. Every provider credential is optional: PriceShelf
 * degrades gracefully and reports non-configured providers as "did not respond"
 * rather than failing the whole search.
 *
 * This module must never be imported from a client component.
 */
const serverEnvSchema = z.object({
  SERPAPI_KEY: z.string().trim().min(1).optional(),
  RAINFOREST_API_KEY: z.string().trim().min(1).optional(),
  AMAZON_ASSOCIATE_TAG: z.string().trim().min(1).optional(),
  WALMART_AFFILIATE_ID: z.string().trim().min(1).optional(),
  WALMART_API_KEY: z.string().trim().min(1).optional(),
  WALMART_API_SECRET: z.string().trim().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().trim().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().min(1).optional(),
  EBAY_CAMPAIGN_ID: z.string().trim().min(1).optional(),
  TARGET_AFFILIATE_ID: z.string().trim().min(1).optional(),
  BESTBUY_AFFILIATE_ID: z.string().trim().min(1).optional(),
  PRICESHELF_DEMO_PROVIDER: z.string().trim().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Empty strings in `.env` files mean "not set". */
function compact(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = value === '' ? undefined : value;
  }
  return out;
}

let cached: ServerEnv | null = null;

/**
 * Validate each variable on its own.
 *
 * Parsing the whole object at once means a single malformed value - a
 * mistyped Redis URL, say - fails the parse and discards *every* other
 * credential with it, including a perfectly good provider key. That failure is
 * invisible: the site simply reports that no price sources are configured.
 * Per-key validation keeps the good values and names the bad one in the logs.
 */
function parseEachKey(source: Record<string, string | undefined>): ServerEnv {
  const result: Record<string, string | undefined> = {};

  for (const [key, schema] of Object.entries(serverEnvSchema.shape)) {
    const parsed = (schema as z.ZodTypeAny).safeParse(source[key]);
    if (parsed.success) {
      result[key] = parsed.data as string | undefined;
    } else {
      console.warn(
        `[env] ignoring ${key}: ${parsed.error.issues[0]?.message ?? 'failed validation'}`,
      );
    }
  }

  return result as ServerEnv;
}

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  cached = parseEachKey(compact(process.env));
  return cached;
}

/** Test helper - forces the next `serverEnv()` call to re-read `process.env`. */
export function resetServerEnvCache(): void {
  cached = null;
}

export function isDemoMode(): boolean {
  const flag = serverEnv().PRICESHELF_DEMO_PROVIDER;
  return flag === '1' || flag === 'true';
}

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** Canonical origin, without a trailing slash. */
export const SITE_URL: string = (() => {
  if (rawSiteUrl && /^https?:\/\//.test(rawSiteUrl)) return rawSiteUrl.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
})();

export const SITE_NAME = 'PriceShelf';
export const SITE_TAGLINE = 'Compare live prices across the stores Americans actually shop.';
