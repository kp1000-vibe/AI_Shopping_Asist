import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/page-shell';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What PriceShelf stores, what it does not, and the choices you have. No accounts, no data sales, no third-party ad tracking.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy policy"
      intro="PriceShelf is built to need as little of your data as possible."
      updated="2026-01-15"
    >
      <h2>Information we collect</h2>
      <h3>Search queries</h3>
      <p>
        Search terms are sent to our price providers to fetch results, and are stored in a cache key
        for up to 15 minutes. They are not linked to you.
      </p>

      <h3>Technical data</h3>
      <p>
        Our hosting provider records standard request logs (IP address, user agent, timestamp, URL)
        for security and abuse prevention. We use the IP address to rate limit the search API to 30
        requests per minute. Rate limit counters expire after 60 seconds.
      </p>

      <h3>Outbound clicks</h3>
      <p>
        When you click &ldquo;Go to store&rdquo;, we record that the offer was clicked so we can
        measure which comparisons are useful. Click counters are aggregate per offer and per
        retailer and are not tied to an individual.
      </p>

      <h3>Saved items</h3>
      <p>
        Items you save with the heart button are stored in your browser&rsquo;s local storage. They
        never reach our servers, and clearing your browser data removes them.
      </p>

      <h3>Preferences</h3>
      <p>
        The ship-to state you choose is stored in a first-party cookie (<code>ps_state</code>) so
        the tax estimate persists between visits. It contains a two-letter state code and nothing
        else.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not require or offer accounts, so we hold no names, emails or passwords.</li>
        <li>We do not sell, rent or share personal information.</li>
        <li>We do not run third-party advertising or cross-site tracking pixels.</li>
        <li>We do not send your search terms to retailers as a referrer on outbound clicks.</li>
      </ul>

      <h2>Third parties</h2>
      <p>
        To return prices we send your search term to our data providers (which may include SerpApi,
        Rainforest API and affiliate network catalogue APIs). When you follow an outbound link, the
        destination retailer and its affiliate network receive the request and apply their own
        privacy policies and cookies. Our caching and rate limiting use Upstash Redis.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Clear saved items and the ship-to cookie by clearing site data for this domain.</li>
        <li>Block affiliate cookies in your browser; PriceShelf will still work normally.</li>
      </ul>

      <h2>Children</h2>
      <p>
        PriceShelf is not directed at children under 13 and does not knowingly collect their data.
      </p>

      <h2>Changes</h2>
      <p>
        Material changes to this policy will be reflected in the &ldquo;last updated&rdquo; date
        above. Related reading: <Link href="/terms">terms of use</Link> and the{' '}
        <Link href="/affiliate-disclosure">affiliate disclosure</Link>.
      </p>
    </PageShell>
  );
}
