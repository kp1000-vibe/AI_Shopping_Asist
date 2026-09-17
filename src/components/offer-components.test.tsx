/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConditionBadgeList } from '@/components/condition-badges';
import { JsonLd } from '@/components/json-ld';
import { OfferImage } from '@/components/offer-image';
import { OffersTable } from '@/components/offers-table';
import { ProductGallery } from '@/components/product-gallery';
import { ProviderNotice } from '@/components/provider-notice';
import { SortSelect } from '@/components/sort-select';
import { bestOffer } from '@/lib/offers';
import { SORT_LABELS, SORT_OPTIONS } from '@/lib/types';
import { makeOfferSet } from '@/tests/fixtures';

describe('ConditionBadgeList', () => {
  it('renders one badge per condition with an explanation', () => {
    render(<ConditionBadgeList conditions={['membership-required', 'used']} retailer="costco" />);
    expect(screen.getByText('Costco membership required')).toBeInTheDocument();
    expect(screen.getByText('Used')).toBeInTheDocument();
    expect(screen.getByTitle(/paid Costco membership/)).toBeInTheDocument();
  });

  it('renders nothing when there are no conditions', () => {
    const { container } = render(<ConditionBadgeList conditions={[]} retailer="amazon" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ProviderNotice', () => {
  it('warns when a deployment has no providers configured', () => {
    render(<ProviderNotice providers={[]} partial={false} providersConfigured={false} />);
    expect(screen.getByText(/No price sources are configured/)).toBeInTheDocument();
  });

  it('names the stores that did not answer', () => {
    render(
      <ProviderNotice
        providersConfigured
        partial
        providers={[
          { provider: 'Amazon', ok: true, durationMs: 400, offers: 3 },
          { provider: 'Walmart', ok: false, durationMs: 8000, offers: 0, reason: 'timeout' },
        ]}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Some stores did not respond (Walmart)');
  });

  it('renders nothing when everything answered', () => {
    const { container } = render(
      <ProviderNotice
        providersConfigured
        partial={false}
        providers={[{ provider: 'Amazon', ok: true, durationMs: 400, offers: 3 }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OfferImage', () => {
  it('renders the image when a source is given', () => {
    render(<OfferImage src="https://images.example.com/a.jpg" alt="AirPods" sizes="100px" />);
    expect(screen.getByRole('img', { name: 'AirPods' })).toBeInTheDocument();
  });

  it('falls back to a placeholder when there is no source', () => {
    render(<OfferImage src={null} alt="AirPods" sizes="100px" />);
    expect(screen.getByRole('img', { name: 'No image available for AirPods' })).toBeInTheDocument();
  });
});

describe('ProductGallery', () => {
  const images = [
    'https://images.example.com/a.jpg',
    'https://images.example.com/b.jpg',
    'https://images.example.com/c.jpg',
  ];

  it('shows thumbnails and switches the active image', async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={images} alt="AirPods Pro 2" />);

    const thumbs = screen.getAllByRole('button', { name: /Show image/ });
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0]).toHaveAttribute('aria-current', 'true');

    await user.click(thumbs[2]!);
    expect(screen.getByRole('button', { name: 'Show image 3 of 3' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('hides the thumbnail strip for a single image', () => {
    render(<ProductGallery images={[images[0]!]} alt="AirPods Pro 2" />);
    expect(screen.queryByRole('button', { name: /Show image/ })).not.toBeInTheDocument();
  });

  it('shows the placeholder when a product has no imagery at all', () => {
    render(<ProductGallery images={[]} alt="AirPods Pro 2" />);
    expect(screen.getByRole('img', { name: /No image available/ })).toBeInTheDocument();
  });
});

describe('OffersTable', () => {
  it('renders a row per offer with sponsored outbound links', () => {
    const offers = makeOfferSet();
    render(<OffersTable offers={offers} bestOfferId={bestOffer(offers)?.id} />);

    expect(screen.getAllByTestId('offer-row')).toHaveLength(offers.length);
    const links = screen.getAllByRole('link', { name: /Go to store/ });
    expect(links).toHaveLength(offers.length);
    expect(links[0]).toHaveAttribute('rel', 'sponsored nofollow noopener');
  });

  it('marks the best price row', () => {
    const offers = makeOfferSet();
    render(<OffersTable offers={offers} bestOfferId={bestOffer(offers)?.id} />);
    expect(screen.getByText('Best price')).toBeInTheDocument();
  });

  it('labels shipping that is only known at checkout', () => {
    render(<OffersTable offers={makeOfferSet()} />);
    expect(screen.getByText('At checkout')).toBeInTheDocument();
  });

  it('shows free shipping and a column header set', () => {
    render(<OffersTable offers={makeOfferSet()} />);
    const header = screen.getAllByRole('row')[0]!;
    expect(within(header).getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText('Free').length).toBeGreaterThan(0);
  });
});

describe('SortSelect', () => {
  it('renders the current sort option', () => {
    render(<SortSelect value="lowest-total" onChange={() => {}} />);
    expect(screen.getByLabelText('Sort offers')).toHaveTextContent('Lowest total cost');
  });

  it('shows the active sort on the trigger', () => {
    // Opening the portalled listbox is covered by the Playwright suite:
    // driving a Radix portal in jsdom costs tens of seconds per interaction.
    render(<SortSelect value="lowest-price" onChange={() => {}} />);
    expect(screen.getByLabelText('Sort offers')).toHaveTextContent(SORT_LABELS['lowest-price']);
  });

  it('labels every sort option, including the membership-aware one', () => {
    expect(SORT_OPTIONS.map((option) => SORT_LABELS[option])).toContain(
      'Cheapest with no membership',
    );
  });

  it('is labelled and expandable', () => {
    render(<SortSelect value="rating" onChange={() => {}} />);
    const trigger = screen.getByLabelText('Sort offers');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent(SORT_LABELS.rating);
  });
});

describe('JsonLd', () => {
  it('serialises structured data and escapes angle brackets', () => {
    const { container } = render(
      <JsonLd id="ld-test" data={{ '@type': 'Product', name: '<script>alert(1)</script>' }} />,
    );
    const script = container.querySelector('script#ld-test');
    expect(script).toHaveAttribute('type', 'application/ld+json');
    expect(script?.innerHTML).not.toContain('<script>');
    expect(script?.innerHTML).toContain('\\u003cscript');
  });
});
