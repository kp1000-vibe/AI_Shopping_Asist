import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { JsonLd } from '@/components/json-ld';
import { ProviderNotice } from '@/components/provider-notice';
import { ResultsSkeleton } from '@/components/results-skeleton';
import { ResultsView } from '@/components/results-view';
import { SearchBar } from '@/components/search-bar';
import { POPULAR_QUERIES } from '@/lib/content';
import { filtersFromSearchParams } from '@/lib/offers';
import { searchOffers } from '@/lib/search';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo';
import { productPath, searchPath } from '@/lib/slug';
import { STATE_COOKIE } from '@/lib/state-cookie';
import { DEFAULT_TAX_STATE, isTaxState, priceOffers } from '@/lib/total-cost';
import { isSortOption, SearchQuerySchema, type SortOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function toUrlSearchParams(params: SearchParams): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = firstValue(value);
    if (single !== '') result.set(key, single);
  }
  return result;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const parsed = SearchQuerySchema.safeParse({ q: firstValue(params.q) });

  if (!parsed.success) {
    return {
      title: 'Search',
      description: 'Search any product and compare live prices across major US retailers.',
      robots: { index: false, follow: true },
    };
  }

  const query = parsed.data.q;
  const title = `${query} price comparison`;
  const description = `Compare live ${query} prices across Amazon, Walmart, Costco, Target, Best Buy and more. Totals include shipping, estimated tax and membership requirements.`;

  return {
    title,
    description,
    alternates: { canonical: searchPath(query) },
    openGraph: { title, description, url: searchPath(query), type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

async function resolveTaxState(): Promise<string> {
  const store = await cookies();
  const value = store.get(STATE_COOKIE)?.value;
  return value && isTaxState(value) ? value.toUpperCase() : DEFAULT_TAX_STATE;
}

function EmptyQueryState() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold">Search for a product</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Type at least two characters to compare live prices across every store we track.
      </p>
      <div className="mt-6 max-w-xl">
        <SearchBar autoFocus />
      </div>

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Popular right now
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {POPULAR_QUERIES.slice(0, 10).map((query) => (
          <li key={query}>
            <Link
              href={searchPath(query)}
              className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function SearchResults({
  query,
  sort,
  params,
}: {
  query: string;
  sort: SortOption;
  params: SearchParams;
}) {
  const state = await resolveTaxState();
  const result = await searchOffers(query, { state });
  const offers = priceOffers(result.offers, result.taxState);
  const filters = filtersFromSearchParams(toUrlSearchParams(params));
  const product = productJsonLd({ name: query, path: productPath(query), offers });

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: `${query} prices`, path: searchPath(query) },
        ])}
      />
      {product ? <JsonLd id="ld-product" data={product} /> : null}

      <div className="space-y-6">
        <ProviderNotice
          providers={result.providers}
          partial={result.partial}
          providersConfigured={result.providersConfigured}
        />

        {offers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <SearchX className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold">No live offers for “{query}”</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              No tracked retailer is listing a matching product right now. Try a broader search
              term, or check the spelling of the model name.
            </p>
            <ul className="mt-6 flex flex-wrap justify-center gap-2">
              {POPULAR_QUERIES.slice(0, 6).map((popular) => (
                <li key={popular}>
                  <Link
                    href={searchPath(popular)}
                    className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {popular}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ResultsView query={query} offers={offers} initialFilters={filters} initialSort={sort} />
        )}
      </div>
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const parsed = SearchQuerySchema.safeParse({ q: firstValue(params.q) });

  if (!parsed.success) return <EmptyQueryState />;

  const query = parsed.data.q;
  const sortParam = firstValue(params.sort);
  const sort: SortOption = isSortOption(sortParam) ? sortParam : 'lowest-total';

  return (
    <div className="container py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {query}
          </li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold sm:text-4xl">
        <span className="text-balance">{query} price comparison</span>
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Ranked by total cost: item price plus shipping plus estimated sales tax. Membership
        requirements are shown on every offer.
      </p>

      <div className="mt-8">
        <Suspense key={`${query}-${sort}`} fallback={<ResultsSkeleton />}>
          <SearchResults query={query} sort={sort} params={params} />
        </Suspense>
      </div>
    </div>
  );
}
