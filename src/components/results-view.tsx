'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { BestPriceCard } from '@/components/best-price-card';
import { Filters } from '@/components/filters';
import { OfferCard } from '@/components/offer-card';
import { SortSelect } from '@/components/sort-select';
import { Button } from '@/components/ui/button';
import {
  applyFilters,
  availableRetailers,
  bestOffer,
  filtersToSearchParams,
  sortOffers,
  type OfferFilters,
} from '@/lib/offers';
import type { PricedOffer, SortOption } from '@/lib/types';

interface ResultsViewProps {
  query: string;
  offers: readonly PricedOffer[];
  initialFilters: OfferFilters;
  initialSort: SortOption;
}

export function ResultsView({ query, offers, initialFilters, initialSort }: ResultsViewProps) {
  const [filters, setFilters] = React.useState<OfferFilters>(initialFilters);
  const [sort, setSort] = React.useState<SortOption>(initialSort);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  // Keep the URL shareable without triggering a server round trip. The URL is
  // only rewritten when the state actually changed: rewriting it on every load
  // re-encodes the query for no reason and confuses crawlers and auditors.
  React.useEffect(() => {
    const params = filtersToSearchParams(filters, new URLSearchParams({ q: query }));
    if (sort !== 'lowest-total') params.set('sort', sort);
    else params.delete('sort');

    const next = `?${params.toString()}`;
    const current = window.location.search;
    if (next === current) return;

    // Ignore a pure encoding difference (%20 vs +) for identical state.
    const normalise = (value: string) =>
      [...new URLSearchParams(value).entries()]
        .sort()
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    if (normalise(next) === normalise(current)) return;

    window.history.replaceState(null, '', `/search${next}`);
  }, [filters, sort, query]);

  const retailers = React.useMemo(() => availableRetailers(offers), [offers]);
  const visible = React.useMemo(
    () => sortOffers(applyFilters(offers, filters), sort),
    [offers, filters, sort],
  );
  const best = React.useMemo(() => bestOffer(visible), [visible]);
  const rest = React.useMemo(
    () => visible.filter((offer) => offer.id !== best?.id),
    [visible, best],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Button
          type="button"
          variant="outline"
          className="w-full lg:hidden"
          aria-expanded={mobileFiltersOpen}
          aria-controls="filters-panel"
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {mobileFiltersOpen ? 'Hide filters' : 'Show filters'}
        </Button>

        <div
          id="filters-panel"
          className={mobileFiltersOpen ? 'mt-4 block' : 'mt-4 hidden lg:mt-0 lg:block'}
        >
          <Filters
            filters={filters}
            onChange={setFilters}
            retailers={retailers}
            resultCount={visible.length}
          />
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing <strong className="text-foreground">{visible.length}</strong> of {offers.length}{' '}
            offers for <strong className="text-foreground">{query}</strong>
          </p>
          <SortSelect value={sort} onChange={setSort} />
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <h2 className="text-lg font-bold">No offers match these filters</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try widening the price range or turning off the membership filter.
            </p>
          </div>
        ) : (
          <>
            {best ? <BestPriceCard offer={best} offerCount={visible.length} /> : null}

            {rest.length > 0 ? (
              <section aria-labelledby="all-offers-heading" className="space-y-4">
                <h2 id="all-offers-heading" className="text-lg font-bold">
                  All offers
                </h2>
                <ul className="space-y-4">
                  {rest.map((offer, index) => (
                    <li key={offer.id}>
                      <OfferCard offer={offer} index={index + 1} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
