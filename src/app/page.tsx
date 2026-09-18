import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CategoryTiles } from '@/components/category-tiles';
import { HeroBento } from '@/components/hero-bento';
import { RetailerStrip } from '@/components/retailer-strip';
import { TrendingDeals } from '@/components/trending-deals';
import { Skeleton } from '@/components/ui/skeleton';

// Kept in step with the trending tiles; see lib/cache-policy.ts.
export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'PriceShelf — Compare live prices across US retailers',
  description:
    'Search any product and see the cheapest total cost across Amazon, Walmart, Costco, Target, Best Buy, Shein, Sams Club, eBay and Home Depot, including shipping, tax and membership rules.',
  alternates: { canonical: '/' },
};

function TrendingFallback() {
  return (
    <section className="container py-14" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-40 w-full rounded-lg" />
        ))}
      </div>
      <span className="sr-only">Loading trending comparisons</span>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroBento />
      <Suspense fallback={<TrendingFallback />}>
        <TrendingDeals />
      </Suspense>
      <CategoryTiles />
      <RetailerStrip />
    </>
  );
}
