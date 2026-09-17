import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/env';
import { getRetailer } from '@/lib/retailers';
import type { PricedOffer } from '@/lib/types';

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    logo: absoluteUrl('/icon.svg'),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Product + AggregateOffer markup for a comparison page. Only emitted when
 * there is at least one live offer, so Google never sees an empty aggregate.
 */
export function productJsonLd(params: {
  name: string;
  path: string;
  offers: readonly PricedOffer[];
}): Record<string, unknown> | null {
  const { name, path, offers } = params;
  if (offers.length === 0) return null;

  const prices = offers.map((offer) => offer.price);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const image = offers.find((offer) => offer.image)?.image ?? undefined;

  const rated = offers.filter((offer) => offer.rating !== null && offer.reviewCount !== null);
  const reviewCount = rated.reduce((sum, offer) => sum + (offer.reviewCount ?? 0), 0);
  const ratingValue =
    rated.length > 0 && reviewCount > 0
      ? rated.reduce((sum, offer) => sum + (offer.rating ?? 0) * (offer.reviewCount ?? 0), 0) /
        reviewCount
      : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image,
    description: `Compare live prices for ${name} across ${offers.length} US retailers.`,
    url: absoluteUrl(path),
    ...(ratingValue !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(ratingValue.toFixed(2)),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: lowPrice.toFixed(2),
      highPrice: highPrice.toFixed(2),
      offerCount: offers.length,
      offers: offers.map((offer) => ({
        '@type': 'Offer',
        url: absoluteUrl(`/go/${offer.id}`),
        priceCurrency: 'USD',
        price: offer.price.toFixed(2),
        availability: offer.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: offer.condition.includes('used')
          ? 'https://schema.org/UsedCondition'
          : offer.condition.includes('renewed')
            ? 'https://schema.org/RefurbishedCondition'
            : 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: getRetailer(offer.retailer).name,
        },
      })),
    },
  };
}
