import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/page-shell';

export const metadata: Metadata = {
  title: 'Affiliate disclosure',
  description:
    'PriceShelf earns affiliate commissions on some outbound retailer links. Here is exactly how that works and how it affects what you see.',
  alternates: { canonical: '/affiliate-disclosure' },
};

export default function AffiliateDisclosurePage() {
  return (
    <PageShell
      title="Affiliate disclosure"
      intro="Required disclosure under the US Federal Trade Commission Endorsement Guides (16 CFR Part 255)."
      updated="2026-01-15"
    >
      <h2>The short version</h2>
      <p>
        <strong>
          PriceShelf is reader supported. Some links to retailers on this site are affiliate links.
          If you click one and buy something, PriceShelf may earn a commission at no extra cost to
          you.
        </strong>
      </p>

      <h2>Which links are affiliate links</h2>
      <p>
        Outbound links marked &ldquo;Go to store&rdquo; may carry affiliate tracking. Every such
        link is tagged in the page source with{' '}
        <code>rel=&quot;sponsored nofollow noopener&quot;</code>, which is the markup search engines
        and browsers use to identify paid links.
      </p>
      <p>
        PriceShelf participates in the Amazon Associates Program, the eBay Partner Network, and
        retailer programmes operated through affiliate networks including Impact. As an Amazon
        Associate, PriceShelf earns from qualifying purchases.
      </p>

      <h2>What commissions do not affect</h2>
      <ul>
        <li>
          <strong>Ranking.</strong> Offers are sorted strictly by the criterion you choose: total
          landed cost, item price, rating, or cheapest without a membership. Commission rates are
          not an input to any sort.
        </li>
        <li>
          <strong>Your price.</strong> Affiliate tracking does not raise the price you pay. The
          retailer pays the commission out of its own margin.
        </li>
        <li>
          <strong>Which retailers appear.</strong> Retailers are included based on US market
          relevance, not on whether they run an affiliate programme. Retailers we earn nothing from
          are shown on equal terms, including at the top of results when they are cheapest.
        </li>
      </ul>

      <h2>Price accuracy</h2>
      <p>
        Prices, shipping costs and availability come from third-party product APIs and are cached
        for up to 15 minutes. Retailers change prices frequently. The price on the retailer site at
        the moment of purchase is the price that applies. Sales tax figures shown on PriceShelf are
        estimates based on published average state and local rates, not quotes.
      </p>

      <h2>No endorsement</h2>
      <p>
        PriceShelf is an independent comparison service. It is not affiliated with, endorsed by, or
        sponsored by any retailer listed. All trademarks belong to their respective owners.
      </p>

      <h2>Questions</h2>
      <p>
        More detail on methodology is in <Link href="/about">About PriceShelf</Link>. Our data
        practices are described in the <Link href="/privacy">privacy policy</Link>.
      </p>
    </PageShell>
  );
}
