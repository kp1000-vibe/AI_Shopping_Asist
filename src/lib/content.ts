/**
 * Editorial content: the curated searches the home page and sitemap use.
 * These are search queries, not product data - every price shown for them is
 * fetched live from the providers.
 */

export interface Category {
  slug: string;
  name: string;
  description: string;
  /** The search PriceShelf runs when the tile is clicked. */
  query: string;
  /** Extra searches surfaced in the category dropdown. */
  examples: string[];
}

export const CATEGORIES: readonly Category[] = [
  {
    slug: 'headphones',
    name: 'Headphones',
    description: 'Earbuds, over-ear and noise cancelling',
    query: 'AirPods Pro 2',
    examples: ['AirPods Pro 2', 'Sony WH-1000XM5', 'Bose QuietComfort Ultra'],
  },
  {
    slug: 'gaming',
    name: 'Gaming',
    description: 'Consoles, handhelds and controllers',
    query: 'Nintendo Switch OLED',
    examples: ['Nintendo Switch OLED', 'PlayStation 5 Slim', 'Steam Deck OLED'],
  },
  {
    slug: 'home',
    name: 'Home',
    description: 'Vacuums, air purifiers and kitchen',
    query: 'Dyson V15 Detect',
    examples: ['Dyson V15 Detect', 'Ninja Creami', 'Instant Pot Duo 6qt'],
  },
  {
    slug: 'tablets',
    name: 'Tablets',
    description: 'iPads, Android tablets and e-readers',
    query: 'iPad Air M2',
    examples: ['iPad Air M2', 'Samsung Galaxy Tab S9', 'Kindle Paperwhite'],
  },
  {
    slug: 'laptops',
    name: 'Laptops',
    description: 'Ultrabooks, gaming and Chromebooks',
    query: 'MacBook Air M3',
    examples: ['MacBook Air M3', 'Dell XPS 13', 'ASUS ROG Zephyrus G14'],
  },
  {
    slug: 'tv',
    name: 'TV and audio',
    description: 'OLED, QLED, soundbars and projectors',
    query: 'LG C4 65 inch OLED',
    examples: ['LG C4 65 inch OLED', 'Samsung S90D', 'Sonos Arc Ultra'],
  },
  {
    slug: 'wearables',
    name: 'Wearables',
    description: 'Smart watches and fitness trackers',
    query: 'Apple Watch Series 10',
    examples: ['Apple Watch Series 10', 'Garmin Forerunner 265', 'Oura Ring 4'],
  },
  {
    slug: 'phones',
    name: 'Phones',
    description: 'Flagships, mid-range and accessories',
    query: 'iPhone 16 Pro',
    examples: ['iPhone 16 Pro', 'Google Pixel 9', 'Samsung Galaxy S24'],
  },
];

/** Searches featured on the home page grid. */
export const TRENDING_QUERIES: readonly string[] = [
  'AirPods Pro 2',
  'Nintendo Switch OLED',
  'Dyson V15 Detect',
  'iPad Air M2',
  'LG C4 65 inch OLED',
  'Apple Watch Series 10',
];

/** Popular searches used for suggestions and the sitemap. */
export const POPULAR_QUERIES: readonly string[] = [
  ...TRENDING_QUERIES,
  ...CATEGORIES.flatMap((category) => category.examples),
].filter((value, index, all) => all.indexOf(value) === index);

export function findCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

/** Simple prefix/substring suggestions over the curated query list. */
export function suggestQueries(input: string, limit = 6): string[] {
  const needle = input.trim().toLowerCase();
  if (needle.length < 2) return [];

  const startsWith: string[] = [];
  const contains: string[] = [];

  for (const query of POPULAR_QUERIES) {
    const haystack = query.toLowerCase();
    if (haystack.startsWith(needle)) startsWith.push(query);
    else if (haystack.includes(needle)) contains.push(query);
  }

  return [...startsWith, ...contains].slice(0, limit);
}
