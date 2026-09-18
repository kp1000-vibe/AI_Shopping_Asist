import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/cache';
import { serverEnv, SITE_URL } from '@/lib/env';
import { ALL_PROVIDERS } from '@/lib/providers';

export const dynamic = 'force-dynamic';

/**
 * Configuration health check.
 *
 * Reports which providers a deployment can actually use, so "no price sources
 * are configured" can be diagnosed without redeploying blind. It returns
 * booleans and variable *names* only - never a value, never a fragment of one -
 * so it is safe to expose. `/api/` is already disallowed in robots.txt and the
 * response is sent with `noindex`.
 *
 * The `visibleNames` list is the useful part when a key looks missing: it shows
 * whether the platform is passing the variable at all, which catches typos like
 * SERP_API_KEY or a value set only on Preview.
 */
const RELEVANT_PREFIXES = [
  'SERPAPI',
  'RAINFOREST',
  'WALMART',
  'AMAZON',
  'EBAY',
  'TARGET',
  'BESTBUY',
  'UPSTASH',
  'PRICESHELF',
  'NEXT_PUBLIC_SITE_URL',
];

export async function GET(): Promise<NextResponse> {
  const env = serverEnv();

  const providers = Object.fromEntries(
    ALL_PROVIDERS.map((provider) => [provider.id, provider.isConfigured()]),
  );

  const visibleNames = Object.keys(process.env)
    .filter((name) => RELEVANT_PREFIXES.some((prefix) => name.startsWith(prefix)))
    .sort();

  const anyProvider = Object.values(providers).some(Boolean);

  return NextResponse.json(
    {
      ok: anyProvider,
      siteUrl: SITE_URL,
      providers,
      cache: {
        redis: getRedis() !== null,
        note: getRedis() === null ? 'Falling back to per-instance memory cache' : undefined,
      },
      affiliate: {
        amazonTag: Boolean(env.AMAZON_ASSOCIATE_TAG),
        ebayCampaign: Boolean(env.EBAY_CAMPAIGN_ID),
        walmartId: Boolean(env.WALMART_AFFILIATE_ID),
      },
      // Names only. No values are ever included here.
      visibleNames,
      hint: anyProvider
        ? undefined
        : 'No provider is configured. If the variable name appears in visibleNames the value failed validation (check the server logs); if it is absent, the platform is not passing it to this deployment - set it for the Production environment and redeploy.',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}
