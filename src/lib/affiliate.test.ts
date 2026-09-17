import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hasAffiliateProgramme, withAffiliateTag } from '@/lib/affiliate';
import { resetServerEnvCache } from '@/lib/env';

const KEYS = [
  'AMAZON_ASSOCIATE_TAG',
  'EBAY_CAMPAIGN_ID',
  'WALMART_AFFILIATE_ID',
  'TARGET_AFFILIATE_ID',
  'BESTBUY_AFFILIATE_ID',
  'WALMART_DEEPLINK_TEMPLATE',
  'TARGET_DEEPLINK_TEMPLATE',
  'BESTBUY_DEEPLINK_TEMPLATE',
];

describe('withAffiliateTag', () => {
  beforeEach(() => {
    for (const key of KEYS) delete process.env[key];
    resetServerEnvCache();
  });

  afterEach(() => {
    for (const key of KEYS) delete process.env[key];
    resetServerEnvCache();
  });

  it('appends the Amazon Associates tag', () => {
    process.env.AMAZON_ASSOCIATE_TAG = 'priceshelf-20';
    resetServerEnvCache();
    const url = withAffiliateTag('https://www.amazon.com/dp/B0D1XD1ZV3', 'amazon');
    expect(new URL(url).searchParams.get('tag')).toBe('priceshelf-20');
  });

  it('leaves the Amazon URL untouched with no tag configured', () => {
    expect(withAffiliateTag('https://www.amazon.com/dp/B0D1XD1ZV3', 'amazon')).toBe(
      'https://www.amazon.com/dp/B0D1XD1ZV3',
    );
  });

  it('adds the full eBay Partner Network parameter set', () => {
    process.env.EBAY_CAMPAIGN_ID = '5338888888';
    resetServerEnvCache();
    const params = new URL(withAffiliateTag('https://www.ebay.com/itm/1', 'ebay')).searchParams;
    expect(params.get('campid')).toBe('5338888888');
    expect(params.get('mkevt')).toBe('1');
    expect(params.get('mkcid')).toBe('1');
    expect(params.get('mkrid')).toBe('711-53200-19255-0');
  });

  it('uses a deep link template for Impact-managed retailers', () => {
    process.env.WALMART_AFFILIATE_ID = 'pub-123';
    process.env.WALMART_DEEPLINK_TEMPLATE =
      'https://goto.walmart.com/c/12345/9383?u1={subId}&url={url}';
    resetServerEnvCache();

    const result = withAffiliateTag('https://www.walmart.com/ip/1', 'walmart');
    const url = new URL(result);
    expect(url.hostname).toBe('goto.walmart.com');
    expect(url.searchParams.get('u1')).toBe('pub-123');
    expect(url.searchParams.get('url')).toBe('https://www.walmart.com/ip/1');
  });

  it('falls back to the plain URL when the template is malformed', () => {
    process.env.TARGET_DEEPLINK_TEMPLATE = 'not a url {url}';
    resetServerEnvCache();
    expect(withAffiliateTag('https://www.target.com/p/1', 'target')).toBe(
      'https://www.target.com/p/1',
    );
  });

  it('falls back to the plain URL when no template is configured', () => {
    expect(withAffiliateTag('https://www.bestbuy.com/site/1.p', 'bestbuy')).toBe(
      'https://www.bestbuy.com/site/1.p',
    );
    expect(withAffiliateTag('https://www.costco.com/x.html', 'costco')).toBe(
      'https://www.costco.com/x.html',
    );
  });

  it('refuses to rewrite a non-http URL or invalid input', () => {
    expect(withAffiliateTag('javascript:alert(1)', 'amazon')).toBe('javascript:alert(1)');
    expect(withAffiliateTag('nonsense', 'amazon')).toBe('nonsense');
  });
});

describe('hasAffiliateProgramme', () => {
  it('reflects whether any programme is configured', () => {
    for (const key of KEYS) delete process.env[key];
    resetServerEnvCache();
    expect(hasAffiliateProgramme()).toBe(false);

    process.env.AMAZON_ASSOCIATE_TAG = 'priceshelf-20';
    resetServerEnvCache();
    expect(hasAffiliateProgramme()).toBe(true);

    delete process.env.AMAZON_ASSOCIATE_TAG;
    resetServerEnvCache();
  });
});
