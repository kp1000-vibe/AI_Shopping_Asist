import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetServerEnvCache } from '@/lib/env';
import { demoOffers, demoProvider } from '@/lib/providers/demo';
import { OfferSchema } from '@/lib/types';
import { FIXED_NOW } from '@/tests/fixtures';

describe('demo provider', () => {
  beforeEach(() => {
    delete process.env.PRICESHELF_DEMO_PROVIDER;
    resetServerEnvCache();
  });

  afterEach(() => {
    delete process.env.PRICESHELF_DEMO_PROVIDER;
    resetServerEnvCache();
  });

  it('is disabled unless the flag is set', () => {
    expect(demoProvider.isConfigured()).toBe(false);

    process.env.PRICESHELF_DEMO_PROVIDER = '1';
    resetServerEnvCache();
    expect(demoProvider.isConfigured()).toBe(true);

    process.env.PRICESHELF_DEMO_PROVIDER = '0';
    resetServerEnvCache();
    expect(demoProvider.isConfigured()).toBe(false);
  });

  it('produces schema-valid offers across every retailer', () => {
    const offers = demoOffers('AirPods Pro 2', FIXED_NOW);
    expect(offers.length).toBeGreaterThanOrEqual(8);
    for (const offer of offers) {
      expect(() => OfferSchema.parse(offer)).not.toThrow();
    }
  });

  it('is deterministic for the same query', () => {
    expect(demoOffers('Dyson V15', FIXED_NOW)).toEqual(demoOffers('Dyson V15', FIXED_NOW));
  });

  it('produces different prices for different queries', () => {
    const a = demoOffers('Dyson V15', FIXED_NOW)[0]?.price;
    const b = demoOffers('Nintendo Switch OLED', FIXED_NOW)[0]?.price;
    expect(a).not.toBe(b);
  });

  it('includes membership, used and out-of-stock cases for the e2e suite', () => {
    const offers = demoOffers('AirPods Pro 2', FIXED_NOW);
    const conditions = offers.flatMap((offer) => offer.condition);
    expect(conditions).toContain('membership-required');
    expect(conditions).toContain('used');
    expect(conditions).toContain('out-of-stock');
  });

  it('returns offers through the provider interface', async () => {
    const offers = await demoProvider.search({
      query: 'AirPods Pro 2',
      timeoutMs: 8000,
      now: () => new Date(FIXED_NOW),
    });
    expect(offers[0]?.lastUpdated).toBe(FIXED_NOW);
  });
});
