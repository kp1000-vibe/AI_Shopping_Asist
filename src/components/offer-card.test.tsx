/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { OfferCard } from '@/components/offer-card';
import { makePricedOffer } from '@/tests/fixtures';

describe('OfferCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the retailer, title, price and total', () => {
    render(<OfferCard offer={makePricedOffer({ retailer: 'walmart', price: 189 })} />);

    expect(screen.getByText('Walmart')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('AirPods Pro 2');
    expect(screen.getByText('$189.00')).toBeInTheDocument();
    expect(screen.getByTestId('offer-total')).toHaveTextContent('$203.16');
  });

  it('shows the strike-through list price and the discount', () => {
    render(<OfferCard offer={makePricedOffer({ price: 150, originalPrice: 200 })} />);
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  it('renders every buying-condition badge', () => {
    render(
      <OfferCard
        offer={makePricedOffer({
          retailer: 'costco',
          condition: ['membership-required', 'free-shipping'],
        })}
      />,
    );
    expect(screen.getByText('Costco membership required')).toBeInTheDocument();
    expect(screen.getByText('Free shipping')).toBeInTheDocument();
  });

  it('marks the membership state on the card for filtering', () => {
    const { rerender } = render(
      <OfferCard
        offer={makePricedOffer({ retailer: 'costco', condition: ['membership-required'] })}
      />,
    );
    expect(screen.getByTestId('offer-card')).toHaveAttribute('data-membership', 'required');

    rerender(<OfferCard offer={makePricedOffer({ retailer: 'target', condition: [] })} />);
    expect(screen.getByTestId('offer-card')).toHaveAttribute('data-membership', 'none');
  });

  it('says when shipping is only known at checkout', () => {
    render(<OfferCard offer={makePricedOffer({ shipping: null })} />);
    expect(screen.getByText('calculated at checkout')).toBeInTheDocument();
  });

  it('shows free shipping when the retailer reports zero', () => {
    render(<OfferCard offer={makePricedOffer({ shipping: 0 })} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows the rating and review count when present', () => {
    render(<OfferCard offer={makePricedOffer({ rating: 4.7, reviewCount: 12345 })} />);
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('(12.3K reviews)')).toBeInTheDocument();
  });

  it('omits the rating block when the retailer gives none', () => {
    render(<OfferCard offer={makePricedOffer({ rating: null, reviewCount: null })} />);
    expect(screen.queryByText(/reviews/)).not.toBeInTheDocument();
  });

  it('links to the tracked redirect with sponsored rel attributes', () => {
    const offer = makePricedOffer({ id: 'walmart-abc123', retailer: 'walmart' });
    render(<OfferCard offer={offer} />);

    const link = screen.getByTestId('go-to-store');
    expect(link).toHaveAttribute('href', '/go/walmart-abc123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'sponsored nofollow noopener');
  });

  it('shows the Best price badge only when marked best', () => {
    const { rerender } = render(<OfferCard offer={makePricedOffer()} />);
    expect(screen.queryByText('Best price')).not.toBeInTheDocument();

    rerender(<OfferCard offer={makePricedOffer()} best />);
    expect(screen.getByText('Best price')).toBeInTheDocument();
  });

  it('truncates a very long product title but keeps the full text available', () => {
    const title = `Apple AirPods Pro 2 ${'Extra Long Marketing Words '.repeat(10)}`.trim();
    render(<OfferCard offer={makePricedOffer({ title })} />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent?.length).toBeLessThan(title.length);
    expect(heading.textContent).toContain('…');
    expect(screen.getByTitle(title)).toBeInTheDocument();
  });

  it('falls back to a placeholder when there is no image', () => {
    render(<OfferCard offer={makePricedOffer({ image: null })} />);
    expect(screen.getByLabelText(/No image available/)).toBeInTheDocument();
  });

  it('toggles the saved state when the heart is pressed', async () => {
    const user = userEvent.setup();
    render(<OfferCard offer={makePricedOffer({ title: 'AirPods Pro 2' })} />);

    const save = screen.getByRole('button', { name: /^Save AirPods Pro 2/ });
    expect(save).toHaveAttribute('aria-pressed', 'false');

    await user.click(save);
    expect(
      await screen.findByRole('button', { name: /Remove AirPods Pro 2 from saved/ }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
