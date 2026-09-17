'use client';

import { ArrowDownWideNarrow } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isSortOption, SORT_LABELS, SORT_OPTIONS, type SortOption } from '@/lib/types';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowDownWideNarrow className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="sort-offers" className="whitespace-nowrap text-sm font-semibold">
        Sort by
      </label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (isSortOption(next)) onChange(next);
        }}
      >
        <SelectTrigger id="sort-offers" className="w-[15rem]" aria-label="Sort offers">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {SORT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
