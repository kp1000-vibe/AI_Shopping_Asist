/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BestPriceCard } from '@/components/best-price-card';
import { bestOffer } from '@/lib/offers';
import { makeOfferSet, makePricedOffer } from '@/tests/fixtures';

describe('BestPriceCard', () => {
  it('announces how many offers were compared', () => {
    render(<BestPriceCard offer={makePricedOffer()} offerCount={5} />);
    expect(screen.getByText('Best price of 5 offers')).toBeInTheDocument();
  });

  it('uses the singular form for a lone offer', () => {
    render(<BestPriceCard offer={makePricedOffer()} offerCount={1} />);
    expect(screen.getByText('Best price of 1 offer')).toBeInTheDocument();
  });

  it('shows the saving against the priciest store', () => {
    const offers = makeOfferSet();
    const best = bestOffer(offers);
    expect(best).not.toBeNull();

    render(<BestPriceCard offer={best!} offerCount={offers.length} />);
    expect(screen.getByText(/Saves \$\d/)).toBeInTheDocument();
  });

  it('hides the savings line when there is nothing to save', () => {
    render(<BestPriceCard offer={makePricedOffer()} offerCount={1} />);
    expect(screen.queryByText(/Saves /)).not.toBeInTheDocument();
  });

  it('renders the product title as the page-level offer heading', () => {
    render(<BestPriceCard offer={makePricedOffer()} offerCount={3} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('AirPods Pro 2');
  });

  it('shows the total cost breakdown', () => {
    render(<BestPriceCard offer={makePricedOffer({ price: 100, shipping: 10 })} offerCount={3} />);
    expect(screen.getByText('Est. tax:')).toBeInTheDocument();
    expect(screen.getByTestId('best-total')).toHaveTextContent('$117.49');
  });

  it('marks shipping as calculated at checkout when unknown', () => {
    render(<BestPriceCard offer={makePricedOffer({ shipping: null })} offerCount={2} />);
    expect(screen.getByText('at checkout')).toBeInTheDocument();
  });

  it('links out through the sponsored redirect', () => {
    render(<BestPriceCard offer={makePricedOffer({ id: 'costco-xyz789' })} offerCount={4} />);
    const link = screen.getByRole('link', { name: /Go to store/ });
    expect(link).toHaveAttribute('href', '/go/costco-xyz789');
    expect(link).toHaveAttribute('rel', 'sponsored nofollow noopener');
  });

  it('shows the discount versus list price', () => {
    render(
      <BestPriceCard offer={makePricedOffer({ price: 150, originalPrice: 200 })} offerCount={2} />,
    );
    expect(screen.getByText('25% off list')).toBeInTheDocument();
  });

  it('shows membership conditions on the recommended offer', () => {
    render(
      <BestPriceCard
        offer={makePricedOffer({ retailer: 'samsclub', condition: ['membership-required'] })}
        offerCount={2}
      />,
    );
    expect(screen.getByText('Sams Club membership required')).toBeInTheDocument();
  });
});
