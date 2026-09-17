import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'PriceShelf works without an account. Here is why, and where your saved items live.',
  alternates: { canonical: '/sign-in' },
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <PageShell
      title="No sign in needed"
      intro="PriceShelf does not have accounts, and does not ask for your email to show you a price."
    >
      <p>
        Everything on PriceShelf works without logging in: search, filters, sorting and outbound
        links are all available immediately.
      </p>

      <h2>Where your saved items live</h2>
      <p>
        Items you save with the heart button are kept in your own browser&rsquo;s local storage.
        They never reach our servers, which means there is nothing to sign in to and nothing for us
        to lose. Clearing your browser data clears your list, and the list does not follow you to a
        second device.
      </p>

      <h2>Your ship-to state</h2>
      <p>
        The state you pick in the top bar is stored in a single first-party cookie so your tax
        estimate persists. That is the only preference we store.
      </p>

      <p>
        Full details are in the <Link href="/privacy">privacy policy</Link>.
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild>
          <Link href="/">Start comparing prices</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/saved">View saved items</Link>
        </Button>
      </div>
    </PageShell>
  );
}
