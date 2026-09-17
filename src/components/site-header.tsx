'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, Heart, Menu, ShoppingBag, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { SearchBar } from '@/components/search-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATEGORIES } from '@/lib/content';
import { RETAILER_LIST } from '@/lib/retailers';
import { searchPath } from '@/lib/slug';
import { useSavedOffers } from '@/lib/use-saved';
import { cn } from '@/lib/utils';

function CountBubble({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <span
      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
      aria-label={`${count} ${label}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function SiteHeader({ defaultQuery = '' }: { defaultQuery?: string }) {
  const { count, hydrated } = useSavedOffers();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const savedCount = hydrated ? count : 0;

  const navLinkClass =
    'rounded-md px-1 py-1 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center gap-3 lg:gap-6">
        <Logo className="shrink-0" />

        <div className="hidden min-w-0 flex-1 lg:block">
          <SearchBar defaultValue={defaultQuery} />
        </div>

        <nav aria-label="Main" className="hidden items-center gap-5 lg:flex">
          <Link href="/" className={navLinkClass}>
            Home
          </Link>
          <Link href="/#trending" className={navLinkClass}>
            Deals
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(navLinkClass, 'inline-flex items-center gap-1')}>
              Categories
              <ChevronDown className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Shop by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORIES.map((category) => (
                <DropdownMenuItem key={category.slug} asChild>
                  <Link href={searchPath(category.query)}>
                    <span className="flex flex-col">
                      <span className="font-semibold">{category.name}</span>
                      <span className="text-xs text-muted-foreground">{category.description}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/#stores" className={cn(navLinkClass, 'inline-flex items-center gap-1.5')}>
            Stores
            <Badge variant="default" className="px-2 py-0 text-[10px]">
              {RETAILER_LIST.length}
            </Badge>
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          <Button asChild variant="outline" size="icon" className="relative">
            <Link href="/saved" aria-label={`Saved items (${savedCount})`}>
              <Heart className="size-5" aria-hidden="true" />
              <CountBubble count={savedCount} label="saved items" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="icon" className="relative hidden sm:inline-flex">
            <Link href="/saved" aria-label="Your shortlist">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <div className="container pb-3 lg:hidden">
        <SearchBar defaultValue={defaultQuery} />
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="container border-t border-border py-4 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/"
                className="block rounded-lg px-3 py-2 font-semibold hover:bg-accent"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/#trending"
                className="block rounded-lg px-3 py-2 font-semibold hover:bg-accent"
                onClick={() => setMobileOpen(false)}
              >
                Deals
              </Link>
            </li>
            <li>
              <Link
                href="/#stores"
                className="block rounded-lg px-3 py-2 font-semibold hover:bg-accent"
                onClick={() => setMobileOpen(false)}
              >
                Stores
              </Link>
            </li>
          </ul>

          <p className="px-3 pb-2 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Categories
          </p>
          <ul className="grid grid-cols-2 gap-1">
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={searchPath(category.query)}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
