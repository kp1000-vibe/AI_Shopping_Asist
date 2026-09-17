import { priceOffers } from '@/lib/total-cost';
import type { Offer, PricedOffer } from '@/lib/types';
import type { RetailerId } from '@/lib/retailers';

export const FIXED_NOW = '2026-03-01T12:00:00.000Z';

export function makeOffer(overrides: Partial<Offer> & { retailer?: RetailerId } = {}): Offer {
  const retailer = overrides.retailer ?? 'amazon';
  return {
    id: `${retailer}-test01`,
    retailer,
    title: 'AirPods Pro 2 Wireless Earbuds',
    image: 'https://images.example.com/airpods.jpg',
    price: 199.99,
    originalPrice: 249.99,
    shipping: 0,
    inStock: true,
    rating: 4.7,
    reviewCount: 12345,
    url: `https://www.${retailer}.com/product/airpods-pro-2`,
    condition: [],
    gtin: null,
    lastUpdated: FIXED_NOW,
    ...overrides,
  };
}

export function makePricedOffer(
  overrides: Partial<Offer> & { retailer?: RetailerId } = {},
  state = 'US',
): PricedOffer {
  const [priced] = priceOffers([makeOffer(overrides)], state);
  if (!priced) throw new Error('fixture failed to price');
  return priced;
}

/** A realistic multi-retailer result set used across component tests. */
export function makeOfferSet(): PricedOffer[] {
  return priceOffers(
    [
      makeOffer({
        retailer: 'walmart',
        id: 'walmart-aaa111',
        price: 189.0,
        shipping: 0,
        condition: ['walmart-plus', 'free-shipping'],
        url: 'https://www.walmart.com/ip/airpods-pro-2',
      }),
      makeOffer({
        retailer: 'costco',
        id: 'costco-bbb222',
        price: 179.99,
        shipping: 0,
        rating: 4.6,
        reviewCount: 420,
        condition: ['membership-required', 'free-shipping'],
        url: 'https://www.costco.com/airpods-pro-2.product.1000.html',
      }),
      makeOffer({
        retailer: 'amazon',
        id: 'amazon-ccc333',
        price: 199.99,
        shipping: 0,
        condition: ['prime-shipping', 'free-shipping'],
        url: 'https://www.amazon.com/dp/B0D1XD1ZV3',
      }),
      makeOffer({
        retailer: 'ebay',
        id: 'ebay-ddd444',
        price: 164.5,
        shipping: 4.5,
        rating: 4.1,
        reviewCount: 64,
        inStock: true,
        condition: ['used', 'third-party-seller'],
        url: 'https://www.ebay.com/itm/1234567890',
      }),
      makeOffer({
        retailer: 'homedepot',
        id: 'homedepot-eee555',
        price: 219.0,
        shipping: null,
        inStock: false,
        rating: null,
        reviewCount: null,
        condition: ['out-of-stock'],
        url: 'https://www.homedepot.com/p/airpods-pro-2/123456',
      }),
    ],
    'US',
  );
}
