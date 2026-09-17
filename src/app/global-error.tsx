'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary: replaces the whole document when the root layout
 * itself fails, so it cannot rely on any app styles or components.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] fatal error', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#1A1A1A',
          color: '#ffffff',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            PriceShelf is temporarily unavailable
          </h1>
          <p style={{ color: '#A1A1AA', lineHeight: 1.6 }}>
            An unexpected error stopped the page from loading. Please try again in a moment.
          </p>
          {error.digest ? (
            <p style={{ color: '#71717A', fontSize: '0.75rem', marginTop: '0.75rem' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              border: 'none',
              background: '#8B5CF6',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
