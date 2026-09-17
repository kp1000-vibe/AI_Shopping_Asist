'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] render error', error);
  }, [error]);

  return (
    <div className="container flex max-w-2xl flex-col items-center py-20 text-center">
      <AlertCircle className="size-12 text-destructive" aria-hidden="true" />
      <h1 className="mt-6 text-balance text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        We could not load prices for this page. This is usually a temporary problem with one of our
        data providers.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reference: <code>{error.digest}</code>
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
