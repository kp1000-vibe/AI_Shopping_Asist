/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnnouncementBar } from '@/components/announcement-bar';
import { CategoryTiles } from '@/components/category-tiles';
import { HeroBento } from '@/components/hero-bento';
import { Logo, LogoMark } from '@/components/logo';
import { PageShell } from '@/components/page-shell';
import { ResultsSkeleton } from '@/components/results-skeleton';
import { RetailerStrip } from '@/components/retailer-strip';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { CATEGORIES } from '@/lib/content';
import { RETAILER_LIST } from '@/lib/retailers';
import { routerMock } from '@/tests/router-mock';

describe('Logo', () => {
  it('links home with an accessible name', () => {
    render(<Logo />);
    expect(screen.getByRole('link', { name: 'PriceShelf home' })).toHaveAttribute('href', '/');
  });

  it('renders the standalone mark', () => {
    render(<LogoMark />);
    expect(screen.getByRole('img', { name: 'PriceShelf' })).toBeInTheDocument();
  });

  it('supports the inverted treatment used on dark surfaces', () => {
    render(<Logo inverted href="/about" />);
    expect(screen.getByRole('link', { name: 'PriceShelf home' })).toHaveAttribute('href', '/about');
  });
});

describe('AnnouncementBar', () => {
  beforeEach(() => {
    document.cookie = 'ps_state=; path=/; max-age=0';
  });

  it('states the refresh cadence', () => {
    render(<AnnouncementBar />);
    expect(screen.getByText('Live prices updated every 15 min')).toBeInTheDocument();
  });

  it('shows the sign-in link and USD currency', () => {
    render(<AnnouncementBar />);
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('stores the chosen ship-to state and refreshes the page', async () => {
    const user = userEvent.setup();
    render(<AnnouncementBar />);

    await user.selectOptions(screen.getByLabelText(/Ship to state/), 'CA');

    expect(document.cookie).toContain('ps_state=CA');
    expect(routerMock.refresh).toHaveBeenCalled();
  });

  it('reads an existing preference from the cookie', async () => {
    document.cookie = 'ps_state=TX; path=/';
    render(<AnnouncementBar />);
    expect(await screen.findByDisplayValue('TX')).toBeInTheDocument();
  });
});

describe('SiteHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the primary navigation', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Deals' })).toHaveAttribute('href', '/#trending');
  });

  it('badges the stores link with the retailer count', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /Stores/ })).toHaveTextContent(
      String(RETAILER_LIST.length),
    );
  });

  it('exposes the categories menu trigger', () => {
    render(<SiteHeader />);

    // The menu contents are asserted in the Playwright suite: driving a Radix
    // portal in jsdom costs tens of seconds per interaction.
    const trigger = screen.getByRole('button', { name: /Categories/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('links the wishlist button to the saved page', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: /Saved items/ })).toHaveAttribute('href', '/saved');
  });

  it('toggles the mobile menu', () => {
    render(<SiteHeader />);

    // fireEvent rather than userEvent: the full header tree makes userEvent
    // pointer-event checks pathologically slow in jsdom.
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument();
  });
});

describe('SiteFooter', () => {
  it('carries the FTC affiliate disclosure and legal links', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/earns commissions from qualifying purchases/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read the full disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure',
    );
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  });

  it('lists every retailer being compared', () => {
    render(<SiteFooter />);
    const nav = screen.getByRole('navigation', { name: 'Stores' });
    for (const retailer of RETAILER_LIST) {
      expect(within(nav).getByText(retailer.name)).toBeInTheDocument();
    }
  });
});

describe('HeroBento', () => {
  it('renders exactly one h1 with the hero search', () => {
    render(<HeroBento />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'One search. Every shelf price.',
    );
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('renders the bento side cards as real searches', () => {
    render(<HeroBento />);
    expect(screen.getByText('Just Launched')).toBeInTheDocument();
    expect(screen.getByText('Tablet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Just Launched/ })).toHaveAttribute(
      'href',
      '/search?q=iPhone%2016%20Pro',
    );
  });
});

describe('CategoryTiles and RetailerStrip', () => {
  it('links every category to a live search', () => {
    render(<CategoryTiles />);
    for (const category of CATEGORIES) {
      expect(screen.getByRole('link', { name: new RegExp(category.name) })).toHaveAttribute(
        'href',
        expect.stringContaining('/search?q='),
      );
    }
  });

  it('lists the retailers and the trademark notice', () => {
    render(<RetailerStrip />);
    expect(
      screen.getByRole('heading', { name: `Comparing ${RETAILER_LIST.length} US retailers` }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with/i)).toBeInTheDocument();
  });
});

describe('PageShell', () => {
  it('renders one h1, a breadcrumb and the updated date', () => {
    render(
      <PageShell title="Privacy policy" intro="How we handle data" updated="2026-01-15">
        <p>Body</p>
      </PageShell>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy policy');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText(/January 15, 2026/)).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('omits the intro and date when not supplied', () => {
    render(
      <PageShell title="Saved items">
        <p>Body</p>
      </PageShell>,
    );
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });
});

describe('ThemeToggle', () => {
  it('exposes an accessible label', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
  });
});

describe('ResultsSkeleton', () => {
  it('announces the loading state', () => {
    render(<ResultsSkeleton />);
    expect(screen.getByText('Loading live prices')).toBeInTheDocument();
  });
});
