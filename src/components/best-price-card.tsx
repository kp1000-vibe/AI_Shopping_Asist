'use client';

import { ExternalLink, Star, TrendingDown } from 'lucide-react';
import { ConditionBadgeList } from '@/components/condition-badges';
import { OfferImage } from '@/components/offer-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRetailer } from '@/lib/retailers';
import { discountPercent, formatUsd } from '@/lib/total-cost';
import type { PricedOffer } from '@/lib/types';
import { formatCompactNumber, truncate } from '@/lib/utils';

interface BestPriceCardProps {
  offer: PricedOffer;
  /** How many offers were compared to reach this recommendation. */
  offerCount: number;
}

export function BestPriceCard({ offer, offerCount }: BestPriceCardProps) {
  const retailer = getRetailer(offer.retailer);
  const discount = discountPercent(offer);
  const savings = offer.savingsVsHighest;

  return (
    <article
      data-testid="best-price-card"
      data-retailer={offer.retailer}
      className="overflow-hidden rounded-lg border border-primary/40 bg-card shadow-card-hover"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-5 py-2.5 text-primary-foreground">
        <p className="flex items-center gap-2 text-sm font-bold">
          <TrendingDown className="size-4" aria-hidden="true" />
          Best price of {offerCount} {offerCount === 1 ? 'offer' : 'offers'}
        </p>
        {savings > 0 ? (
          <p className="text-sm font-semibold">Saves {formatUsd(savings)} vs the priciest store</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:h-40 sm:w-40">
          <OfferImage
            src={offer.image}
            alt={offer.title}
            sizes="(max-width: 640px) 100vw, 160px"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <p className="text-sm font-bold" style={{ color: retailer.color }}>
              {retailer.name}
            </p>
            <h2 className="mt-1 text-balance text-xl font-bold leading-snug sm:text-2xl">
              <span title={offer.title}>{truncate(offer.title, 120)}</span>
            </h2>
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
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-4 sm:w-56 sm:text-right">
          <div>
            <p className="flex flex-wrap items-baseline gap-2 sm:justify-end">
              <span className="text-3xl font-bold tabular-nums">{formatUsd(offer.price)}</span>
              {offer.originalPrice !== null ? (
                <span className="text-base tabular-nums text-muted-foreground line-through">
                  {formatUsd(offer.originalPrice)}
                </span>
              ) : null}
            </p>
            {discount !== null ? (
              <Badge variant="shipping" className="mt-1">
                {discount}% off list
              </Badge>
            ) : null}

            <dl className="mt-3 space-y-0.5 text-sm text-muted-foreground">
              <div className="flex gap-1 sm:justify-end">
                <dt>Shipping:</dt>
                <dd className="tabular-nums">
                  {offer.shippingUnknown
                    ? 'at checkout'
                    : offer.effectiveShipping === 0
                      ? 'Free'
                      : formatUsd(offer.effectiveShipping)}
                </dd>
              </div>
              <div className="flex gap-1 sm:justify-end">
                <dt>Est. tax:</dt>
                <dd className="tabular-nums">{formatUsd(offer.estimatedTax)}</dd>
              </div>
              <div className="flex gap-1 text-base font-bold text-foreground sm:justify-end">
                <dt>Total:</dt>
                <dd className="tabular-nums" data-testid="best-total">
                  {formatUsd(offer.totalCost)}
                </dd>
              </div>
            </dl>
          </div>

          <Button asChild size="lg" className="w-full">
            <a href={`/go/${offer.id}`} target="_blank" rel="sponsored nofollow noopener">
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
