import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { RETAILER_LIST } from '@/lib/retailers';

export const metadata: Metadata = {
  title: 'About PriceShelf',
  description:
    'How PriceShelf collects live retailer prices, calculates total landed cost, and decides which offer is genuinely the cheapest.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <PageShell
      title="About PriceShelf"
      intro="PriceShelf answers one question honestly: which store actually charges the least for the thing you want?"
    >
      <h2>What we compare</h2>
      <p>
        Every search queries live product APIs for {RETAILER_LIST.length} major US retailers:{' '}
        {RETAILER_LIST.map((retailer) => retailer.name).join(', ')}. Results are cached for 15
        minutes, so the prices you see are never more than a quarter of an hour old.
      </p>

      <h2>Why the cheapest sticker price is not the cheapest price</h2>
      <p>
        A $199 item with $12 shipping and a $17 tax estimate costs more than a $205 item shipped
        free. PriceShelf ranks by <strong>total landed cost</strong>: item price plus shipping plus
        estimated sales tax for your ship-to state.
      </p>
      <p>
        We also surface the conditions attached to a price. A Costco or Sams Club price needs a paid
        membership. An Amazon price may be Prime exclusive. A Walmart price may only ship free above
        $35. Those rules appear as badges on every offer, and you can hide membership-gated prices
        entirely with one toggle.
      </p>

      <h2>How the tax estimate works</h2>
      <p>
        We apply the combined average state and local sales tax rate published by the Tax Foundation
        for the state you select in the top bar. It is an estimate: the retailer charges the exact
        rate for your delivery address at checkout.
      </p>

      <h2>How products are matched</h2>
      <p>
        Provider results are filtered by GTIN/UPC where retailers publish one, and by weighted title
        similarity where they do not. Accessory listings (cases, cables, screen protectors) are
        removed unless you searched for them. Where one retailer lists the same product several
        times, we keep the cheapest listing.
      </p>

      <h2>How we make money</h2>
      <p>
        Some outbound links carry affiliate tracking, which pays PriceShelf a commission when you
        buy. It never changes your price and never changes the ranking: offers are ordered purely by
        total cost. See the <Link href="/affiliate-disclosure">full affiliate disclosure</Link> for
        details.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not scrape retailer websites. Every price comes from a licensed product API.</li>
        <li>We do not sell, rent or broker your personal data.</li>
        <li>We do not accept payment for higher placement in results.</li>
      </ul>

      <h2 id="accounts">Accounts</h2>
      <p>
        PriceShelf does not currently require or offer an account. Items you save are stored in your
        own browser and never leave your device.
      </p>
    </PageShell>
  );
}
