import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import { makeOfferSet, makePricedOffer } from '@/tests/fixtures';

describe('absoluteUrl', () => {
  it('prefixes relative paths and leaves absolute ones alone', () => {
    expect(absoluteUrl('/about')).toMatch(/\/about$/);
    expect(absoluteUrl('about')).toMatch(/\/about$/);
    expect(absoluteUrl('https://example.com/x')).toBe('https://example.com/x');
  });
});

describe('organizationJsonLd and websiteJsonLd', () => {
  it('emits valid Organization markup', () => {
    const data = organizationJsonLd();
    expect(data['@type']).toBe('Organization');
    expect(data.name).toBe('PriceShelf');
  });

  it('emits a WebSite SearchAction', () => {
    const data = websiteJsonLd() as {
      potentialAction: { target: { urlTemplate: string }; 'query-input': string };
    };
    expect(data.potentialAction.target.urlTemplate).toContain('/search?q={search_term_string}');
    expect(data.potentialAction['query-input']).toBe('required name=search_term_string');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the breadcrumb positions from one', () => {
    const data = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'AirPods Pro 2', path: '/product/airpods-pro-2' },
    ]) as { itemListElement: Array<{ position: number; name: string }> };

    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0]?.position).toBe(1);
    expect(data.itemListElement[1]?.name).toBe('AirPods Pro 2');
  });
});

describe('productJsonLd', () => {
  it('returns null when there are no offers', () => {
    expect(productJsonLd({ name: 'AirPods Pro 2', path: '/product/x', offers: [] })).toBeNull();
  });

  it('builds an AggregateOffer with the true price span', () => {
    const data = productJsonLd({
      name: 'AirPods Pro 2',
      path: '/product/airpods-pro-2',
      offers: makeOfferSet(),
    }) as {
      offers: { lowPrice: string; highPrice: string; offerCount: number; offers: unknown[] };
      aggregateRating?: { ratingValue: number; reviewCount: number };
    };

    expect(data.offers.lowPrice).toBe('164.50');
    expect(data.offers.highPrice).toBe('219.00');
    expect(data.offers.offerCount).toBe(5);
    expect(data.offers.offers).toHaveLength(5);
    expect(data.aggregateRating?.reviewCount).toBeGreaterThan(0);
  });

  it('marks availability and item condition per offer', () => {
    const data = productJsonLd({
      name: 'AirPods Pro 2',
      path: '/product/airpods-pro-2',
      offers: [
        makePricedOffer({ retailer: 'ebay', condition: ['used'], inStock: true }),
        makePricedOffer({ retailer: 'amazon', condition: ['renewed'], inStock: false }),
        makePricedOffer({ retailer: 'target', condition: [], inStock: true }),
      ],
    }) as { offers: { offers: Array<{ availability: string; itemCondition: string }> } };

    expect(data.offers.offers[0]?.itemCondition).toContain('UsedCondition');
    expect(data.offers.offers[1]?.itemCondition).toContain('RefurbishedCondition');
    expect(data.offers.offers[1]?.availability).toContain('OutOfStock');
    expect(data.offers.offers[2]?.itemCondition).toContain('NewCondition');
  });

  it('omits aggregateRating when nothing is rated', () => {
    const data = productJsonLd({
      name: 'AirPods Pro 2',
      path: '/product/airpods-pro-2',
      offers: [makePricedOffer({ rating: null, reviewCount: null })],
    }) as { aggregateRating?: unknown };

    expect(data.aggregateRating).toBeUndefined();
  });
});
