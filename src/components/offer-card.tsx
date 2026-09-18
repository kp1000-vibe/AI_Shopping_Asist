'use client';

import * as React from 'react';
import { ExternalLink, Heart, Star } from 'lucide-react';
import { ConditionBadgeList } from '@/components/condition-badges';
import { OfferImage } from '@/components/offer-image';
import { RetailerName } from '@/components/retailer-name';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRetailer } from '@/lib/retailers';
import { discountPercent, formatUsd } from '@/lib/total-cost';
import type { PricedOffer } from '@/lib/types';
import { useSavedOffers } from '@/lib/use-saved';
import { cn, formatCompactNumber, formatRelativeTime, truncate } from '@/lib/utils';

export interface OfferCardProps {
  offer: PricedOffer;
  /** Highlights the card as the cheapest landed cost. */
  best?: boolean;
  /** Index in the list, used to prioritise the first image for LCP. */
  index?: number;
}

export function OfferCard({ offer, best = false, index = 0 }: OfferCardProps) {
  const retailer = getRetailer(offer.retailer);
  const discount = discountPercent(offer);
  const { isSaved, toggle, hydrated } = useSavedOffers();
  const saved = hydrated && isSaved(offer.id);

  return (
    <article
      data-testid="offer-card"
      data-retailer={offer.retailer}
      data-membership={offer.requiresMembership ? 'required' : 'none'}
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:p-5 lg:flex-col xl:flex-row',
        best ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border',
      )}
    >
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:h-28 sm:w-28 lg:h-32 lg:w-full xl:h-28 xl:w-28">
        <OfferImage
          src={offer.image}
          alt={offer.title}
          sizes="(max-width: 640px) 100vw, 112px"
          priority={index === 0}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm">
              <RetailerName retailer={offer.retailer} />
            </p>
            <h3 className="mt-0.5 text-balance text-base font-semibold leading-snug">
              <span title={offer.title}>{truncate(offer.title, 110)}</span>
            </h3>
          </div>
          {best ? (
            <Badge variant="best" className="shrink-0 px-3 py-1">
              Best price
            </Badge>
          ) : null}
        </div>

        {offer.rating !== null ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
            <span className="font-semibold text-foreground">{offer.rating.toFixed(1)}</span>
            {offer.reviewCount !== null ? (
              <span>({formatCompactNumber(offer.reviewCount)} reviews)</span>
            ) : null}
          </p>
        ) : null}

        <ConditionBadgeList conditions={offer.condition} retailer={offer.retailer} />

        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(offer.lastUpdated)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col justify-between gap-3 sm:w-52 sm:items-end sm:text-right lg:w-full lg:items-stretch lg:text-left xl:w-52 xl:items-end xl:text-right">
        <div>
          <p className="flex flex-wrap items-baseline gap-2 sm:justify-end lg:justify-start xl:justify-end">
            <span className="text-2xl font-bold tabular-nums">{formatUsd(offer.price)}</span>
            {offer.originalPrice !== null ? (
              <span className="text-sm tabular-nums text-muted-foreground line-through">
                {formatUsd(offer.originalPrice)}
              </span>
            ) : null}
            {discount !== null ? (
              <Badge variant="shipping" className="align-middle">
                -{discount}%
              </Badge>
            ) : null}
          </p>

          <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <div className="flex gap-1 sm:justify-end lg:justify-start xl:justify-end">
              <dt>Shipping:</dt>
              <dd className="tabular-nums">
                {offer.shippingUnknown
                  ? 'calculated at checkout'
                  : offer.effectiveShipping === 0
                    ? 'Free'
                    : formatUsd(offer.effectiveShipping)}
              </dd>
            </div>
            <div className="flex gap-1 sm:justify-end lg:justify-start xl:justify-end">
              <dt>Est. tax:</dt>
              <dd className="tabular-nums">{formatUsd(offer.estimatedTax)}</dd>
            </div>
            <div className="flex gap-1 font-semibold text-foreground sm:justify-end lg:justify-start xl:justify-end">
              <dt>Total:</dt>
              <dd className="tabular-nums" data-testid="offer-total">
                {formatUsd(offer.totalCost)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex items-center gap-2 sm:justify-end lg:justify-start xl:justify-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-pressed={saved}
            aria-label={saved ? `Remove ${offer.title} from saved` : `Save ${offer.title}`}
            onClick={() => toggle(offer)}
          >
            <Heart
              className={cn('size-5', saved && 'fill-current text-primary')}
              aria-hidden="true"
            />
          </Button>

          <Button asChild variant={best ? 'default' : 'ink'} className="flex-1 sm:flex-none">
            <a
              href={`/go/${offer.id}`}
              target="_blank"
              rel="sponsored nofollow noopener"
              data-testid="go-to-store"
            >
              Go to store
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">{` at ${retailer.name} (opens in a new tab)`}</span>
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
