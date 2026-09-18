import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/json-ld';
import { OffersTable } from '@/components/offers-table';
import { ProductGallery } from '@/components/product-gallery';
import { ProviderNotice } from '@/components/provider-notice';
import { SearchBar } from '@/components/search-bar';
import { Badge } from '@/components/ui/badge';
import { PRODUCT_REVALIDATE_SECONDS } from '@/lib/cache-policy';
import { POPULAR_QUERIES } from '@/lib/content';
import { bestOffer, priceRange, sortOffers } from '@/lib/offers';
import { searchOffers } from '@/lib/search';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo';
import { productPath, searchPath, slugify, titleCase, unslugify } from '@/lib/slug';
import { DEFAULT_TAX_STATE, formatUsd, priceOffers } from '@/lib/total-cost';
import type { PricedOffer, ProviderStatus } from '@/lib/types';

// Page-level ISR window; the underlying search cache is still 15 minutes.
export const revalidate = 3600;

interface ProductData {
  name: string;
  offers: PricedOffer[];
  providers: ProviderStatus[];
  partial: boolean;
  providersConfigured: boolean;
}

/**
 * Product pages use the national average tax rate so they can be statically
 * rendered and indexed. The search page personalises tax by ship-to state.
 */
const loadProduct = unstable_cache(
  async (slug: string): Promise<ProductData> => {
    const name = titleCase(unslugify(slug));
    const result = await searchOffers(name, { state: DEFAULT_TAX_STATE });
    return {
      name,
      offers: sortOffers(priceOffers(result.offers, result.taxState), 'lowest-total'),
      providers: result.providers,
      partial: result.partial,
      providersConfigured: result.providersConfigured,
    };
  },
  ['priceshelf:product:v1'],
  { revalidate: PRODUCT_REVALIDATE_SECONDS },
);

export function generateStaticParams(): Array<{ slug: string }> {
  return POPULAR_QUERIES.map((query) => ({ slug: slugify(query) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = titleCase(unslugify(slug));
  if (!name) return { title: 'Product not found', robots: { index: false, follow: false } };

  const title = `${name} — compare prices at 9 US stores`;
  const description = `Live ${name} prices from Amazon, Walmart, Costco, Target, Best Buy and more. See the cheapest total cost including shipping, estimated tax and membership requirements.`;

  return {
    title,
    description,
    alternates: { canonical: productPath(name) },
    openGraph: { title, description, url: productPath(name), type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug || slugify(slug) !== slug.toLowerCase()) notFound();

  const data = await loadProduct(slug);
  if (!data.name) notFound();

  const best = bestOffer(data.offers);
  const range = priceRange(data.offers);
  const images = [
    ...new Set(
      data.offers.map((offer) => offer.image).filter((src): src is string => Boolean(src)),
    ),
  ];
  const product = productJsonLd({
    name: data.name,
    path: productPath(data.name),
    offers: data.offers,
  });

  return (
    <div className="container py-10">
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: data.name, path: productPath(data.name) },
        ])}
      />
      {product ? <JsonLd id="ld-product" data={product} /> : null}

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {data.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <div>
          <ProductGallery images={images} alt={data.name} />
        </div>

        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="text-balance text-3xl font-bold sm:text-4xl">{data.name}</h1>
            {range ? (
              <p className="mt-2 text-lg text-muted-foreground">
                Price range{' '}
                <strong className="tabular-nums text-foreground">{formatUsd(range.min)}</strong> –{' '}
                <strong className="tabular-nums text-foreground">{formatUsd(range.max)}</strong>{' '}
                across {data.offers.length} {data.offers.length === 1 ? 'store' : 'stores'}
              </p>
            ) : null}
            {best ? (
              <p className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="best">Best total {formatUsd(best.totalCost)}</Badge>
                {best.savingsVsHighest > 0 ? (
                  <Badge variant="shipping">Save {formatUsd(best.savingsVsHighest)}</Badge>
                ) : null}
              </p>
            ) : null}
          </div>

          <ProviderNotice
            providers={data.providers}
            partial={data.partial}
            providersConfigured={data.providersConfigured}
          />

          {data.offers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <h2 className="text-lg font-bold">No live offers right now</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                No tracked retailer is listing this product at the moment. Try searching for a
                different model or wait for the next price refresh.
              </p>
              <div className="mx-auto mt-6 max-w-md">
                <SearchBar defaultValue={data.name} />
              </div>
            </div>
          ) : (
            <section aria-labelledby="offers-heading" className="space-y-4">
              <h2 id="offers-heading" className="text-xl font-bold">
                All offers
              </h2>
              <OffersTable offers={data.offers} bestOfferId={best?.id} />
              <p className="text-xs text-muted-foreground">
                Totals use the US average sales tax rate. Your exact tax is set by the retailer at
                checkout.{' '}
                <Link href={searchPath(data.name)} className="underline hover:text-foreground">
                  Set your state on the search page
                </Link>
                .
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
