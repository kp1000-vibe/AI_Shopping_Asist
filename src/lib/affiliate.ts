import { serverEnv } from '@/lib/env';
import type { RetailerId } from '@/lib/retailers';

/**
 * Turn a retailer product URL into a monetised outbound link.
 *
 * Amazon and eBay publish query-parameter tracking schemes, so those are built
 * in. The Impact-managed programmes (Walmart, Target, Best Buy) issue a
 * publisher-specific deep-link host, so those are driven by an optional
 * `*_DEEPLINK_TEMPLATE` environment variable containing `{url}` and `{subId}`
 * placeholders. Without a template the shopper is sent to the plain retailer
 * URL - never to a broken or invented tracking link.
 */

/** eBay Partner Network rotation id for the US (ebay.com) site. */
const EBAY_US_ROTATION_ID = '711-53200-19255-0';

function applyTemplate(template: string, url: string, subId: string | undefined): string | null {
  const filled = template
    .replace(/\{url\}/g, encodeURIComponent(url))
    .replace(/\{subId\}/g, encodeURIComponent(subId ?? 'priceshelf'));
  try {
    return new URL(filled).toString();
  } catch {
    return null;
  }
}

function deeplinkTemplateFor(retailer: RetailerId): string | undefined {
  const key = `${retailer.toUpperCase()}_DEEPLINK_TEMPLATE`;
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

export function withAffiliateTag(rawUrl: string, retailer: RetailerId): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return rawUrl;

  const env = serverEnv();

  switch (retailer) {
    case 'amazon': {
      if (env.AMAZON_ASSOCIATE_TAG) url.searchParams.set('tag', env.AMAZON_ASSOCIATE_TAG);
      return url.toString();
    }
    case 'ebay': {
      if (env.EBAY_CAMPAIGN_ID) {
        url.searchParams.set('mkevt', '1');
        url.searchParams.set('mkcid', '1');
        url.searchParams.set('mkrid', EBAY_US_ROTATION_ID);
        url.searchParams.set('toolid', '10001');
        url.searchParams.set('campid', env.EBAY_CAMPAIGN_ID);
      }
      return url.toString();
    }
    case 'walmart': {
      const template = deeplinkTemplateFor(retailer);
      if (template) {
        return applyTemplate(template, url.toString(), env.WALMART_AFFILIATE_ID) ?? url.toString();
      }
      return url.toString();
    }
    case 'target': {
      const template = deeplinkTemplateFor(retailer);
      if (template) {
        return applyTemplate(template, url.toString(), env.TARGET_AFFILIATE_ID) ?? url.toString();
      }
      return url.toString();
    }
    case 'bestbuy': {
      const template = deeplinkTemplateFor(retailer);
      if (template) {
        return applyTemplate(template, url.toString(), env.BESTBUY_AFFILIATE_ID) ?? url.toString();
      }
      return url.toString();
    }
    default:
      return url.toString();
  }
}

/** True when at least one affiliate programme is configured. */
export function hasAffiliateProgramme(): boolean {
  const env = serverEnv();
  return Boolean(env.AMAZON_ASSOCIATE_TAG || env.EBAY_CAMPAIGN_ID || env.WALMART_AFFILIATE_ID);
}
