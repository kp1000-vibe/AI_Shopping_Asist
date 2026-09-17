'use client';

import Link from 'next/link';
import { ExternalLink, Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isRetailerId, getRetailer } from '@/lib/retailers';
import { searchPath } from '@/lib/slug';
import { formatUsd } from '@/lib/total-cost';
import { useSavedOffers } from '@/lib/use-saved';

export function SavedList() {
  const { items, remove, hydrated } = useSavedOffers();

  if (!hydrated) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Loading your saved items…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Heart className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-bold">Nothing saved yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Tap the heart on any offer to keep it here. Saved items stay in this browser only.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Find something to compare</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const retailerName = isRetailerId(item.retailer)
          ? getRetailer(item.retailer).name
          : item.retailer;
        return (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-muted-foreground">{retailerName}</p>
              <h2 className="mt-0.5 text-base font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved at <span className="tabular-nums">{formatUsd(item.price)}</span> ·{' '}
                <Link href={searchPath(item.title)} className="underline hover:text-foreground">
                  re-check current prices
                </Link>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button asChild variant="ink">
                <a href={`/go/${item.id}`} target="_blank" rel="sponsored nofollow noopener">
                  Go to store
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Remove ${item.title} from saved`}
                onClick={() => remove(item.id)}
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
