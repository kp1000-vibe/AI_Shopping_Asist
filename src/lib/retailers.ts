/**
 * The retailer catalogue PriceShelf compares against. Offers from merchants
 * outside this list are discarded so results stay comparable and trustworthy.
 */
export const RETAILER_IDS = [
  'amazon',
  'walmart',
  'costco',
  'target',
  'bestbuy',
  'shein',
  'samsclub',
  'ebay',
  'homedepot',
] as const;

export type RetailerId = (typeof RETAILER_IDS)[number];

export interface Retailer {
  id: RetailerId;
  /** Display name shown on badges and cards. */
  name: string;
  /** Primary storefront hostname, used for link building and logo strips. */
  domain: string;
  /** Lowercase fragments that identify this retailer in provider payloads. */
  matchers: string[];
  /** Whether a paid membership is needed to buy at the advertised price. */
  membership: 'required' | 'optional' | null;
  /** Human readable membership programme name, when there is one. */
  membershipName?: string;
  /** Order value above which standard shipping is free, when published. */
  freeShippingThreshold?: number;
  /** Brand colour for the retailer wordmark strip. */
  color: string;
}

export const RETAILERS: Record<RetailerId, Retailer> = {
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    domain: 'www.amazon.com',
    matchers: ['amazon', 'amazon.com'],
    membership: 'optional',
    membershipName: 'Prime',
    color: '#FF9900',
  },
  walmart: {
    id: 'walmart',
    name: 'Walmart',
    domain: 'www.walmart.com',
    matchers: ['walmart', 'walmart.com'],
    membership: 'optional',
    membershipName: 'Walmart+',
    freeShippingThreshold: 35,
    color: '#0071DC',
  },
  costco: {
    id: 'costco',
    name: 'Costco',
    domain: 'www.costco.com',
    matchers: ['costco', 'costco.com', 'costco wholesale'],
    membership: 'required',
    membershipName: 'Costco membership',
    color: '#E31837',
  },
  target: {
    id: 'target',
    name: 'Target',
    domain: 'www.target.com',
    matchers: ['target', 'target.com'],
    membership: null,
    freeShippingThreshold: 35,
    color: '#CC0000',
  },
  bestbuy: {
    id: 'bestbuy',
    name: 'Best Buy',
    domain: 'www.bestbuy.com',
    matchers: ['best buy', 'bestbuy', 'bestbuy.com'],
    membership: null,
    freeShippingThreshold: 35,
    color: '#0046BE',
  },
  shein: {
    id: 'shein',
    name: 'SHEIN',
    domain: 'us.shein.com',
    matchers: ['shein', 'shein.com', 'us.shein.com'],
    membership: null,
    color: '#111111',
  },
  samsclub: {
    id: 'samsclub',
    name: 'Sams Club',
    domain: 'www.samsclub.com',
    matchers: ['sam’s club', "sam's club", 'sams club', 'samsclub', 'samsclub.com'],
    membership: 'required',
    membershipName: 'Sams Club membership',
    color: '#0067A0',
  },
  ebay: {
    id: 'ebay',
    name: 'eBay',
    domain: 'www.ebay.com',
    matchers: ['ebay', 'ebay.com'],
    membership: null,
    color: '#E53238',
  },
  homedepot: {
    id: 'homedepot',
    name: 'Home Depot',
    domain: 'www.homedepot.com',
    matchers: ['home depot', 'the home depot', 'homedepot', 'homedepot.com'],
    membership: null,
    freeShippingThreshold: 45,
    color: '#F96302',
  },
};

export const RETAILER_LIST: Retailer[] = RETAILER_IDS.map((id) => RETAILERS[id]);

export function isRetailerId(value: unknown): value is RetailerId {
  return typeof value === 'string' && (RETAILER_IDS as readonly string[]).includes(value);
}

export function getRetailer(id: RetailerId): Retailer {
  return RETAILERS[id];
}

/** Every matcher, longest first, so "sams club" wins over a bare "sam". */
const RANKED_MATCHERS: ReadonlyArray<{ id: RetailerId; matcher: string }> = RETAILER_LIST.flatMap(
  (retailer) => retailer.matchers.map((matcher) => ({ id: retailer.id, matcher })),
).sort((a, b) => b.matcher.length - a.matcher.length);

/**
 * Resolve a provider merchant string ("Walmart", "Best Buy", "amazon.com -
 * Seller") to one of our retailers. Returns null for merchants we do not track.
 */
export function resolveRetailer(source: string | null | undefined): RetailerId | null {
  if (!source) return null;
  const needle = source.trim().toLowerCase();
  if (!needle) return null;

  for (const { id, matcher } of RANKED_MATCHERS) {
    if (needle === matcher) return id;
  }
  for (const { id, matcher } of RANKED_MATCHERS) {
    if (needle.includes(matcher)) return id;
  }
  return null;
}

/** Resolve a retailer from a product URL hostname. */
export function resolveRetailerFromUrl(url: string): RetailerId | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return resolveRetailer(host);
  } catch {
    return null;
  }
}
