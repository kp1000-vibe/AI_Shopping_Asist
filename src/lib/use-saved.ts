'use client';

import * as React from 'react';
import type { Offer } from '@/lib/types';

const STORAGE_KEY = 'priceshelf:saved:v1';
const CHANGE_EVENT = 'priceshelf:saved-changed';

export interface SavedOffer {
  id: string;
  title: string;
  retailer: string;
  price: number;
  url: string;
  savedAt: string;
}

function read(): SavedOffer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedOffer =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SavedOffer).id === 'string' &&
        typeof (item as SavedOffer).title === 'string',
    );
  } catch {
    // Private browsing or a corrupted entry: fall back to an empty list.
    return [];
  }
}

function write(items: SavedOffer[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage may be unavailable or full; saving is a convenience only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Saved (wishlist) offers, persisted in the browser. There are no accounts on
 * PriceShelf, so this data never leaves the device.
 */
export function useSavedOffers() {
  const [items, setItems] = React.useState<SavedOffer[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setItems(read());
    setHydrated(true);

    const sync = () => setItems(read());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = React.useCallback((offer: Offer) => {
    const current = read();
    const exists = current.some((item) => item.id === offer.id);
    const next = exists
      ? current.filter((item) => item.id !== offer.id)
      : [
          ...current,
          {
            id: offer.id,
            title: offer.title,
            retailer: offer.retailer,
            price: offer.price,
            url: offer.url,
            savedAt: new Date().toISOString(),
          },
        ];
    write(next);
    setItems(next);
  }, []);

  const remove = React.useCallback((id: string) => {
    const next = read().filter((item) => item.id !== id);
    write(next);
    setItems(next);
  }, []);

  const isSaved = React.useCallback((id: string) => items.some((item) => item.id === id), [items]);

  return { items, count: items.length, hydrated, toggle, remove, isSaved };
}
