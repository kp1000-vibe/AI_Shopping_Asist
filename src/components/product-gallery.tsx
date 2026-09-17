'use client';

import * as React from 'react';
import { OfferImage } from '@/components/offer-image';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: readonly string[];
  alt: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = React.useState(0);
  const current = images[active] ?? null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
        <OfferImage src={current} alt={alt} sizes="(max-width: 1024px) 100vw, 420px" priority />
      </div>

      {images.length > 1 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === active}
                className={cn(
                  'relative size-16 overflow-hidden rounded-md border bg-muted transition-colors',
                  index === active ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
              >
                <OfferImage src={image} alt="" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
