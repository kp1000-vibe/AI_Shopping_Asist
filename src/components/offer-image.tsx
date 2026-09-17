'use client';

import * as React from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfferImageProps {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

/**
 * Product image with a graceful fallback. Retailer CDNs regularly return 404s
 * for expired listings, so a broken image must never leave an empty box.
 */
export function OfferImage({ src, alt, sizes, className, priority = false }: OfferImageProps) {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
          className,
        )}
        role="img"
        aria-label={`No image available for ${alt}`}
      >
        <ImageOff className="size-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn('object-contain', className)}
      onError={() => setFailed(true)}
    />
  );
}
