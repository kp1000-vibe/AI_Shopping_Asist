import { ExternalLink } from 'lucide-react';
import { ConditionBadgeList } from '@/components/condition-badges';
import { RetailerName } from '@/components/retailer-name';
import { Badge } from '@/components/ui/badge';
import { getRetailer } from '@/lib/retailers';
import { formatUsd } from '@/lib/total-cost';
import type { PricedOffer } from '@/lib/types';

interface OffersTableProps {
  offers: readonly PricedOffer[];
  /** Offer id highlighted as the best total cost. */
  bestOfferId?: string;
}

/**
 * Full comparison table for a product page. Server rendered so the offer data
 * is in the HTML Google receives.
 */
export function OffersTable({ offers, bestOfferId }: OffersTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <caption className="sr-only">
          Every live offer, ordered by total cost including shipping and estimated tax
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/60 text-left">
            <th scope="col" className="px-4 py-3 font-bold">
              Store
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Conditions
            </th>
            <th scope="col" className="px-4 py-3 text-right font-bold">
              Price
            </th>
            <th scope="col" className="px-4 py-3 text-right font-bold">
              Shipping
            </th>
            <th scope="col" className="px-4 py-3 text-right font-bold">
              Est. tax
            </th>
            <th scope="col" className="px-4 py-3 text-right font-bold">
              Total
            </th>
            <th scope="col" className="px-4 py-3 text-right font-bold">
              <span className="sr-only">Go to store</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => {
            const retailer = getRetailer(offer.retailer);
            const isBest = offer.id === bestOfferId;
            return (
              <tr
                key={offer.id}
                data-testid="offer-row"
                className={isBest ? 'bg-primary/5' : undefined}
              >
                <th scope="row" className="border-t border-border px-4 py-3 text-left align-top">
                  <RetailerName retailer={offer.retailer} />
                  {isBest ? (
                    <Badge variant="best" className="ml-2 align-middle">
                      Best price
                    </Badge>
                  ) : null}
                  <span className="mt-1 block max-w-xs text-xs font-normal text-muted-foreground">
                    {offer.title}
                  </span>
                </th>
                <td className="border-t border-border px-4 py-3 align-top">
                  <ConditionBadgeList
                    conditions={offer.condition}
                    retailer={offer.retailer}
                    className="flex max-w-[16rem] flex-wrap gap-1.5"
                  />
                </td>
                <td className="border-t border-border px-4 py-3 text-right align-top tabular-nums">
                  {formatUsd(offer.price)}
                </td>
                <td className="border-t border-border px-4 py-3 text-right align-top tabular-nums">
                  {offer.shippingUnknown
                    ? 'At checkout'
                    : offer.effectiveShipping === 0
                      ? 'Free'
                      : formatUsd(offer.effectiveShipping)}
                </td>
                <td className="border-t border-border px-4 py-3 text-right align-top tabular-nums">
                  {formatUsd(offer.estimatedTax)}
                </td>
                <td className="border-t border-border px-4 py-3 text-right align-top font-bold tabular-nums">
                  {formatUsd(offer.totalCost)}
                </td>
                <td className="border-t border-border px-4 py-3 text-right align-top">
                  <a
                    href={`/go/${offer.id}`}
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90"
                  >
                    Go to store
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{` at ${retailer.name} (opens in a new tab)`}</span>
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
