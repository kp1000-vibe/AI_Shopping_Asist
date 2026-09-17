import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/page-shell';

export const metadata: Metadata = {
  title: 'Terms of use',
  description:
    'The terms that apply when you use PriceShelf, including price accuracy, acceptable use and limitation of liability.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <PageShell
      title="Terms of use"
      intro="By using PriceShelf you agree to these terms."
      updated="2026-01-15"
    >
      <h2>1. What PriceShelf is</h2>
      <p>
        PriceShelf is an informational price comparison service. We do not sell products, process
        payments, ship goods or handle returns. Every purchase is a contract between you and the
        retailer you click through to, on that retailer&rsquo;s terms.
      </p>

      <h2>2. Price and availability accuracy</h2>
      <p>
        Prices, shipping costs, stock status, ratings and buying conditions are supplied by
        third-party product APIs and are cached for up to 15 minutes. They can change or be
        withdrawn at any time. Sales tax figures are estimates derived from published average state
        and local rates and are not tax quotes. Always confirm the final price and any membership
        requirement on the retailer site before buying.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not scrape, mirror or bulk-download PriceShelf results.</li>
        <li>Do not attempt to bypass rate limits or otherwise disrupt the service.</li>
        <li>Do not use PriceShelf to infringe a third party&rsquo;s rights or break the law.</li>
      </ul>
      <p>The search API is rate limited to 30 requests per minute per IP address.</p>

      <h2>4. Intellectual property</h2>
      <p>
        The PriceShelf name, interface and code are ours or our licensors&rsquo;. Retailer names,
        logos, product titles and images belong to their respective owners and are shown for
        identification and comparison purposes only.
      </p>

      <h2>5. Affiliate relationships</h2>
      <p>
        Some outbound links earn us a commission. This is disclosed in full in the{' '}
        <Link href="/affiliate-disclosure">affiliate disclosure</Link> and does not influence
        ranking or your price.
      </p>

      <h2>6. No warranty</h2>
      <p>
        PriceShelf is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
        warranties of any kind, express or implied, including merchantability, fitness for a
        particular purpose and non-infringement. We do not warrant that results will be complete,
        accurate or uninterrupted.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, PriceShelf is not liable for indirect, incidental,
        special, consequential or punitive damages, or for any loss arising from a purchase decision
        made using the service, including price differences, missed promotions or unavailable stock.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms; continued use after a change constitutes acceptance. The
        &ldquo;last updated&rdquo; date above reflects the current version.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Delaware, United States, without regard
        to its conflict of law rules.
      </p>
    </PageShell>
  );
}
