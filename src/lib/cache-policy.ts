/**
 * Page-level revalidation windows.
 *
 * These are separate from the 15 minute search cache in `lib/cache.ts`. That
 * one governs a shopper's own search; these govern pages PriceShelf refreshes
 * on its own, without anyone asking for that particular product.
 *
 * The distinction matters because provider calls are metered. One search costs
 * up to four SerpApi credits (one product search plus up to three seller
 * lookups), so the home page's six trending tiles cost up to 24 credits every
 * time they refresh. At a 15 minute window that is ~2,300 credits a day, which
 * exhausts a free plan within the hour. Six hours keeps it near 100 a day while
 * the tiles stay useful - they are a teaser, and clicking one runs a live
 * search that is at most 15 minutes old.
 *
 * Override either value in the environment if your plan has room for fresher
 * numbers.
 */

function seconds(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Home page trending tiles. Default 6 hours. */
export const TRENDING_REVALIDATE_SECONDS = seconds('PRICESHELF_TRENDING_TTL_SECONDS', 6 * 60 * 60);

/** Pre-rendered /product/[slug] pages. Default 1 hour. */
export const PRODUCT_REVALIDATE_SECONDS = seconds('PRICESHELF_PRODUCT_TTL_SECONDS', 60 * 60);
