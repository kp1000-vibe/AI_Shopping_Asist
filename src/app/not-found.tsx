import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { POPULAR_QUERIES } from '@/lib/content';
import { searchPath } from '@/lib/slug';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="container flex max-w-2xl flex-col items-center py-20 text-center">
      <Compass className="size-12 text-primary" aria-hidden="true" />
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Error 404
      </p>
      <h1 className="mt-2 text-balance text-4xl font-bold">This shelf is empty</h1>
      <p className="mt-3 text-muted-foreground">
        The page you were looking for does not exist, or an offer link has expired. Prices only stay
        linkable for 24 hours after they are fetched.
      </p>

      <div className="mt-8 w-full">
        <SearchBar placeholder="Search for a product instead" />
      </div>

      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {POPULAR_QUERIES.slice(0, 6).map((query) => (
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

      <Button asChild className="mt-10">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
