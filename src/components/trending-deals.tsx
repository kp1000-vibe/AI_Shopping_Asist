import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TRENDING_QUERIES } from '@/lib/content';
import { bestOffer } from '@/lib/offers';
import { getRetailer } from '@/lib/retailers';
import { searchOffers } from '@/lib/search';
import { searchPath } from '@/lib/slug';
import { formatUsd, priceOffers } from '@/lib/total-cost';
import type { PricedOffer } from '@/lib/types';

interface TrendingEntry {
  query: string;
  best: PricedOffer | null;
  offerCount: number;
}

/**
 * Cached at the route level for 15 minutes so the home page stays statically
 * rendered and the provider quota is not spent on every visit.
 */
const loadTrending = unstable_cache(
  async (): Promise<TrendingEntry[]> => {
    const settled = await Promise.allSettled(
      TRENDING_QUERIES.map(async (query) => {
        const result = await searchOffers(query);
        const priced = priceOffers(result.offers, result.taxState);
        return { query, best: bestOffer(priced), offerCount: priced.length };
      }),
    );

    return settled.map((entry, index) =>
      entry.status === 'fulfilled'
        ? entry.value
        : { query: TRENDING_QUERIES[index] ?? '', best: null, offerCount: 0 },
    );
  },
  ['priceshelf:trending:v1'],
  { revalidate: 900, tags: ['trending'] },
);

/**
 * Trending comparisons on the home page. Prices are live provider data behind
 * the 15 minute cache; when no provider is configured the tiles still render as
 * plain search shortcuts rather than showing invented prices.
 */
export async function TrendingDeals() {
  const entries = await loadTrending();

  return (
    <section
      id="trending"
      aria-labelledby="trending-heading"
      className="container scroll-mt-24 py-14"
    >
      <div className="mb-8">
        <h2 id="trending-heading" className="text-2xl font-bold sm:text-3xl">
          Trending comparisons
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The searches shoppers are running right now, priced across every store we track.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ query, best, offerCount }) => (
          <li key={query}>
            <Link
              href={searchPath(query)}
              className="group flex h-full flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-visible:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold leading-snug">{query}</h3>
                <ArrowUpRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>

              {best ? (
                <div className="space-y-1">
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">{formatUsd(best.price)}</span>
                    <span className="text-xs text-muted-foreground">
                      at {getRetailer(best.retailer).name}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatUsd(best.totalCost)} total · {offerCount}{' '}
                    {offerCount === 1 ? 'store' : 'stores'} compared
                  </p>
                  {best.savingsVsHighest > 0 ? (
                    <Badge variant="shipping">Save {formatUsd(best.savingsVsHighest)}</Badge>
                  ) : null}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Search className="size-4" aria-hidden="true" />
                  Run this comparison
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
