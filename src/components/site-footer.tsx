import Link from 'next/link';
import { Logo } from '@/components/logo';
import { CATEGORIES } from '@/lib/content';
import { RETAILER_LIST } from '@/lib/retailers';
import { searchPath } from '@/lib/slug';

const LEGAL_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/affiliate-disclosure', label: 'Affiliate disclosure' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-[#1A1A1A] text-neutral-300">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-neutral-400">
            PriceShelf compares live prices across major US retailers and shows the real landed
            cost, including shipping and estimated sales tax.
          </p>
        </div>

        <nav aria-label="Categories" className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Categories</h2>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <Link
                  href={searchPath(category.query)}
                  className="hover:text-white hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Stores" className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Stores compared</h2>
          <ul className="space-y-2 text-sm">
            {RETAILER_LIST.map((retailer) => (
              <li key={retailer.id}>
                <span>{retailer.name}</span>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company" className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Company</h2>
          <ul className="space-y-2 text-sm">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-3 py-6 text-xs text-neutral-400 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} PriceShelf. All rights reserved.</p>
          <p className="max-w-2xl md:text-right">
            PriceShelf earns commissions from qualifying purchases made through some outbound links.
            Prices and availability are supplied by third parties and can change at any time.{' '}
            <Link href="/affiliate-disclosure" className="underline hover:text-white">
              Read the full disclosure
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
