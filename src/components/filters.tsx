'use client';

import * as React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  type ConditionFilter,
  type OfferFilters,
} from '@/lib/offers';
import { getRetailer, type RetailerId } from '@/lib/retailers';

export interface FiltersProps {
  filters: OfferFilters;
  onChange: (filters: OfferFilters) => void;
  /** Retailers present in the current result set. */
  retailers: readonly RetailerId[];
  /** Number of offers left after filtering, shown in the heading. */
  resultCount: number;
}

const CONDITIONS: ReadonlyArray<{ value: ConditionFilter; label: string }> = [
  { value: 'any', label: 'Any condition' },
  { value: 'new', label: 'New only' },
  { value: 'used', label: 'Used or renewed' },
];

function parsePriceInput(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function Filters({ filters, onChange, retailers, resultCount }: FiltersProps) {
  const groupId = React.useId();
  const active = hasActiveFilters(filters);

  const toggleRetailer = (retailer: RetailerId, checked: boolean) => {
    const next = checked
      ? [...filters.retailers, retailer]
      : filters.retailers.filter((id) => id !== retailer);
    onChange({ ...filters, retailers: next });
  };

  return (
    <section
      aria-labelledby={`${groupId}-heading`}
      className="rounded-lg border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={`${groupId}-heading`} className="flex items-center gap-2 text-base font-bold">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
        </h2>
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
          >
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>

      <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'offer' : 'offers'} shown
      </p>

      <Separator className="my-4" />

      <div className="flex items-start gap-3">
        <Checkbox
          id={`${groupId}-membership`}
          checked={filters.hideMembership}
          onCheckedChange={(checked) => onChange({ ...filters, hideMembership: checked === true })}
        />
        <div className="space-y-1">
          <Label htmlFor={`${groupId}-membership`} className="cursor-pointer">
            Hide offers that need a membership
          </Label>
          <p className="text-xs text-muted-foreground">
            Removes Costco, Sams Club and Prime-exclusive pricing.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Checkbox
          id={`${groupId}-instock`}
          checked={filters.inStockOnly}
          onCheckedChange={(checked) => onChange({ ...filters, inStockOnly: checked === true })}
        />
        <Label htmlFor={`${groupId}-instock`} className="cursor-pointer">
          In stock only
        </Label>
      </div>

      <Separator className="my-4" />

      <fieldset>
        <legend className="mb-3 text-sm font-bold">Retailer</legend>
        <ul className="space-y-2.5">
          {retailers.map((retailerId) => {
            const retailer = getRetailer(retailerId);
            const inputId = `${groupId}-retailer-${retailerId}`;
            return (
              <li key={retailerId} className="flex items-center gap-3">
                <Checkbox
                  id={inputId}
                  checked={filters.retailers.includes(retailerId)}
                  onCheckedChange={(checked) => toggleRetailer(retailerId, checked === true)}
                />
                <Label htmlFor={inputId} className="cursor-pointer font-normal">
                  {retailer.name}
                </Label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <Separator className="my-4" />

      <fieldset>
        <legend className="mb-3 text-sm font-bold">Price range</legend>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor={`${groupId}-min`} className="sr-only">
              Minimum price in dollars
            </Label>
            <Input
              id={`${groupId}-min`}
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="Min"
              value={filters.minPrice ?? ''}
              onChange={(event) =>
                onChange({ ...filters, minPrice: parsePriceInput(event.target.value) })
              }
            />
          </div>
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <div className="flex-1">
            <Label htmlFor={`${groupId}-max`} className="sr-only">
              Maximum price in dollars
            </Label>
            <Input
              id={`${groupId}-max`}
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="Max"
              value={filters.maxPrice ?? ''}
              onChange={(event) =>
                onChange({ ...filters, maxPrice: parsePriceInput(event.target.value) })
              }
            />
          </div>
        </div>
      </fieldset>

      <Separator className="my-4" />

      <fieldset>
        <legend className="mb-3 text-sm font-bold">Condition</legend>
        <ul className="space-y-2.5">
          {CONDITIONS.map((option) => {
            const inputId = `${groupId}-condition-${option.value}`;
            return (
              <li key={option.value} className="flex items-center gap-3">
                <input
                  type="radio"
                  id={inputId}
                  name={`${groupId}-condition`}
                  value={option.value}
                  checked={filters.condition === option.value}
                  onChange={() => onChange({ ...filters, condition: option.value })}
                  className="size-4 accent-[#7C3AED]"
                />
                <Label htmlFor={inputId} className="cursor-pointer font-normal">
                  {option.label}
                </Label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </section>
  );
}
