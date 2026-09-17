import type { Offer } from '@/lib/types';

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export interface Money {
  amount: number;
  /** ISO 4217 code. Providers occasionally return non-USD listings. */
  currency: string;
}

const SYMBOL_CURRENCIES: ReadonlyArray<[RegExp, string]> = [
  [/^(us\s*\$|usd)/i, 'USD'],
  [/^(ca\s*\$|c\s*\$|cad)/i, 'CAD'],
  [/^(au\s*\$|a\s*\$|aud)/i, 'AUD'],
  [/^(eur|€)/i, 'EUR'],
  [/^(gbp|£)/i, 'GBP'],
  [/^(jpy|¥)/i, 'JPY'],
  [/^(inr|₹)/i, 'INR'],
  [/^\$/, 'USD'],
];

/**
 * Parse a numeric string that may use either US ("1,299.00") or European
 * ("1.299,00") grouping. Returns null when no number is present.
 */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalised: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever separator comes last is the decimal separator.
    normalised =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    // "45,99" is a decimal comma; "1,299" is thousands grouping.
    normalised = decimals === 3 ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  } else {
    normalised = cleaned;
  }

  const value = Number.parseFloat(normalised);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parse a price from a provider payload. Accepts numbers and strings such as
 * "$1,299.00", "US $45.99", "45,99 €" or "from $29".
 */
export function parseMoney(input: unknown): Money | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? { amount: round2(input), currency: 'USD' } : null;
  }
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  let currency = 'USD';
  let matched = false;
  for (const [pattern, code] of SYMBOL_CURRENCIES) {
    if (pattern.test(trimmed)) {
      currency = code;
      matched = true;
      break;
    }
  }
  if (!matched) {
    const suffix = /(€|£|¥|₹|\b(usd|cad|eur|gbp|aud|jpy|inr)\b)\s*$/i.exec(trimmed);
    if (suffix) {
      const token = suffix[0].trim().toUpperCase();
      const bySymbol: Record<string, string> = {
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        '₹': 'INR',
      };
      currency = bySymbol[token] ?? token;
    }
  }

  const amount = parseAmount(trimmed);
  if (amount === null || amount < 0) return null;
  return { amount: round2(amount), currency };
}

/** Parse a price and keep it only when it is a USD amount. */
export function parseUsdPrice(input: unknown): number | null {
  const money = parseMoney(input);
  if (!money || money.currency !== 'USD') return null;
  return money.amount;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Parse shipping cost from provider delivery text.
 * Returns 0 for free delivery and null when nothing is stated.
 */
export function parseShipping(input: unknown): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? round2(input) : null;
  }
  if (typeof input !== 'string') return null;

  const text = input.trim().toLowerCase();
  if (!text) return null;
  if (/free (delivery|shipping|pickup)|free\b.*\b(delivery|shipping)/.test(text)) return 0;
  if (/pickup|collect/.test(text) && !/\d/.test(text)) return 0;

  const money = parseMoney(text);
  if (!money || money.currency !== 'USD') return null;
  return money.amount;
}

// ---------------------------------------------------------------------------
// Titles and product matching
// ---------------------------------------------------------------------------

const STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'with',
  'new',
  'in',
  'of',
  'by',
  'to',
  'at',
  'on',
]);

/** Words that mean the listing is an accessory rather than the product itself. */
const ACCESSORY_WORDS: readonly string[] = [
  'case',
  'cover',
  'skin',
  'sleeve',
  'screen protector',
  'protector',
  'charger',
  'charging cable',
  'cable',
  'adapter',
  'stand',
  'mount',
  'holder',
  'strap',
  'band',
  'replacement',
  'compatible with',
  'for use with',
  'ear tips',
  'eartips',
  'tips',
  'carrying',
  'dock',
  'grip',
  'pouch',
  'decal',
  'sticker',
];

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(value: string): string[] {
  return normalizeTitle(value)
    .split(' ')
    .filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

/** Tokens that carry identity: model numbers, capacities, longer words. */
function isSignificant(token: string): boolean {
  return /\d/.test(token) || token.length >= 4;
}

function weightOf(token: string): number {
  return isSignificant(token) ? 2 : 1;
}

/**
 * Weighted token overlap between a query and a listing title, in [0, 1].
 * Model numbers and capacities count double so "AirPods Pro 2" does not match
 * "AirPods Pro" as strongly as it matches "AirPods Pro (2nd generation)".
 */
export function titleSimilarity(a: string, b: string): number {
  const left = tokenize(a);
  const right = new Set(tokenize(b));
  if (left.length === 0 || right.size === 0) return 0;

  let matchedWeight = 0;
  let totalWeight = 0;
  for (const token of new Set(left)) {
    const weight = weightOf(token);
    totalWeight += weight;
    if (right.has(token)) {
      matchedWeight += weight;
      continue;
    }
    // "2nd" should still match "2", "gen" should match "generation".
    for (const candidate of right) {
      if (candidate.startsWith(token) || token.startsWith(candidate)) {
        if (Math.min(candidate.length, token.length) >= 3) {
          matchedWeight += weight * 0.75;
          break;
        }
      }
    }
  }

  return totalWeight === 0 ? 0 : Math.min(1, matchedWeight / totalWeight);
}

/** True when the listing looks like an accessory the shopper did not ask for. */
export function isAccessoryMismatch(query: string, title: string): boolean {
  const queryText = normalizeTitle(query);
  const titleText = normalizeTitle(title);
  return ACCESSORY_WORDS.some(
    (word) => titleText.includes(normalizeTitle(word)) && !queryText.includes(normalizeTitle(word)),
  );
}

/** A GTIN shared by at least two offers is treated as the product identity. */
export function consensusGtin(offers: readonly Offer[]): string | null {
  const counts = new Map<string, number>();
  for (const offer of offers) {
    if (!offer.gtin) continue;
    counts.set(offer.gtin, (counts.get(offer.gtin) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 1;
  for (const [gtin, count] of counts) {
    if (count > bestCount) {
      best = gtin;
      bestCount = count;
    }
  }
  return best;
}

export interface MatchOptions {
  /** Minimum title similarity, 0-1. Defaults to 0.45. */
  threshold?: number;
}

/**
 * Drop listings that are not the product the shopper searched for: accessories,
 * unrelated items, and offers whose GTIN contradicts the consensus GTIN.
 */
export function filterMatchingOffers(
  query: string,
  offers: readonly Offer[],
  options: MatchOptions = {},
): Offer[] {
  const threshold = options.threshold ?? 0.45;
  const gtin = consensusGtin(offers);

  return offers.filter((offer) => {
    if (gtin && offer.gtin) {
      // A confirmed GTIN match beats every heuristic; a mismatch is decisive.
      return offer.gtin === gtin;
    }
    if (isAccessoryMismatch(query, offer.title)) return false;
    return titleSimilarity(query, offer.title) >= threshold;
  });
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Keep a single offer per retailer - the cheapest one. In-stock offers win ties
 * so shoppers are not sent to an unavailable listing for the same money.
 */
export function dedupeOffers(offers: readonly Offer[]): Offer[] {
  const best = new Map<string, Offer>();

  for (const offer of offers) {
    const current = best.get(offer.retailer);
    if (!current) {
      best.set(offer.retailer, offer);
      continue;
    }
    if (offer.price < current.price) {
      best.set(offer.retailer, offer);
      continue;
    }
    if (offer.price === current.price && offer.inStock && !current.inStock) {
      best.set(offer.retailer, offer);
    }
  }

  return [...best.values()];
}

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** FNV-1a, 32 bit. Deterministic across processes, unlike Object hashing. */
export function hash32(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

/** Stable, URL-safe id for an offer. Used by the /go/[offerId] redirect. */
export function createOfferId(retailer: string, url: string): string {
  return `${retailer}-${hash32(url)}`;
}

/** Normalise a GTIN/UPC/EAN, or return null when it is not a valid one. */
export function normalizeGtin(value: unknown): string | null {
  if (typeof value === 'number') return normalizeGtin(String(value));
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits.replace(/^0+(?=\d{8,})/, '');
}
