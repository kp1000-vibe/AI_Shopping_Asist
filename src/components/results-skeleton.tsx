import { Skeleton } from '@/components/ui/skeleton';

/** Loading state for the search results stream. Mirrors the final layout so
 *  nothing shifts when the real offers arrive. */
export function ResultsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]" aria-busy="true">
      <div className="hidden space-y-4 lg:block">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-11 w-60 rounded-full" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-40 w-full rounded-lg" />
        ))}
        {/* A product nobody has searched recently is fetched from the retailers
            live, which can take up to a minute. Repeat searches are instant. */}
        <p className="pt-2 text-center text-sm text-muted-foreground">
          Checking every store for live prices. The first search for a product can take up to a
          minute; after that it is instant for 15 minutes.
        </p>
        <span className="sr-only">Loading live prices</span>
      </div>
    </div>
  );
}
