import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CATEGORIES } from '@/lib/content';
import { searchPath } from '@/lib/slug';

export function CategoryTiles() {
  return (
    <section aria-labelledby="categories-heading" className="container py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="categories-heading" className="text-2xl font-bold sm:text-3xl">
            Browse by category
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump straight into the comparisons shoppers run most.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CATEGORIES.map((category) => (
          <li key={category.slug}>
            <Link
              href={searchPath(category.query)}
              className="group flex h-full flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-visible:-translate-y-1"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-base font-bold">{category.name}</span>
                <ArrowUpRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-2 text-sm text-muted-foreground">{category.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
