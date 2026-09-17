'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, RefreshCw } from 'lucide-react';
import { SALES_TAX_RATES, DEFAULT_TAX_STATE } from '@/lib/total-cost';
import { STATE_COOKIE } from '@/lib/state-cookie';

const STATE_CODES = Object.keys(SALES_TAX_RATES);

interface AnnouncementBarProps {
  /** Ship-to state read from the cookie on the server, so there is no flash. */
  initialState?: string;
}

/**
 * Top utility bar. The ship-to selector is a real control: it stores the state
 * in a cookie and drives the sales-tax estimate used for total cost.
 */
export function AnnouncementBar({ initialState = DEFAULT_TAX_STATE }: AnnouncementBarProps) {
  const router = useRouter();
  const [state, setState] = React.useState(initialState);

  // Read the stored preference on the client so the shell can stay static.
  React.useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${STATE_COOKIE}=([A-Za-z]{2})`));
    const stored = match?.[1]?.toUpperCase();
    if (stored && stored in SALES_TAX_RATES) setState(stored);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setState(next);
    document.cookie = `${STATE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div className="border-b border-border bg-[#F3F4F6] text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
      <div className="container flex h-10 items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Globe className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">English</span>
          <span aria-hidden="true" className="hidden text-neutral-400 sm:inline">
            ·
          </span>
          <label htmlFor="ship-to-state" className="sr-only">
            Ship to state, used for the sales tax estimate
          </label>
          <select
            id="ship-to-state"
            value={state}
            onChange={handleChange}
            className="rounded-md bg-transparent px-1 py-0.5 font-semibold text-neutral-800 focus-visible:ring-2 focus-visible:ring-ring dark:text-neutral-100"
          >
            {STATE_CODES.map((code) => (
              <option key={code} value={code}>
                {code === 'US' ? 'US' : code}
              </option>
            ))}
          </select>
          <span className="font-semibold">USD</span>
        </div>

        <p className="flex items-center gap-1.5 text-center font-medium">
          <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Live prices updated every 15 min</span>
        </p>

        <Link
          href="/sign-in"
          className="rounded-md font-semibold hover:text-foreground hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
