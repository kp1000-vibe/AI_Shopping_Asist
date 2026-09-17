/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ResultsView } from '@/components/results-view';
import { DEFAULT_FILTERS } from '@/lib/offers';
import { makeOfferSet } from '@/tests/fixtures';

function renderResults(overrides: Partial<Parameters<typeof ResultsView>[0]> = {}) {
  return render(
    <ResultsView
      query="AirPods Pro 2"
      offers={makeOfferSet()}
      initialFilters={DEFAULT_FILTERS}
      initialSort="lowest-total"
      {...overrides}
    />,
  );
}

describe('ResultsView', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/search?q=AirPods%20Pro%202');
  });

  it('highlights the cheapest total as the best price', () => {
    renderResults();
    const best = screen.getByTestId('best-price-card');
    expect(best).toHaveAttribute('data-retailer', 'ebay');
  });

  it('lists the remaining offers below the recommendation', () => {
    renderResults();
    expect(screen.getByRole('heading', { name: 'All offers' })).toBeInTheDocument();
    expect(screen.getAllByTestId('offer-card')).toHaveLength(4);
  });

  it('reports how many offers are visible', () => {
    renderResults();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 5 of 5 offers');
  });

  it('hides membership offers when the filter is switched on', async () => {
    const user = userEvent.setup();
    renderResults();

    await user.click(screen.getByLabelText('Hide offers that need a membership'));

    expect(screen.queryByText('Costco membership required')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 4 of 5 offers');
  });

  it('filters to in-stock offers only', async () => {
    const user = userEvent.setup();
    renderResults();

    await user.click(screen.getByLabelText('In stock only'));
    const cards = screen.getAllByTestId('offer-card');
    expect(cards.every((card) => card.getAttribute('data-retailer') !== 'homedepot')).toBe(true);
  });

  it('writes the active filters into the URL', async () => {
    const user = userEvent.setup();
    renderResults();

    await user.click(screen.getByLabelText('Hide offers that need a membership'));
    expect(window.location.search).toContain('nomembership=1');
  });

  it('starts from the filters supplied by the server', () => {
    renderResults({ initialFilters: { ...DEFAULT_FILTERS, hideMembership: true } });
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 4 of 5 offers');
    expect(screen.getByLabelText('Hide offers that need a membership')).toBeChecked();
  });

  it('respects the initial sort order', () => {
    renderResults({ initialSort: 'rating' });
    const cards = screen.getAllByTestId('offer-card');
    // Amazon and Walmart both sit at 4.7, so the cheaper total breaks the tie.
    expect(cards[0]).toHaveAttribute('data-retailer', 'walmart');
    expect(cards[1]).toHaveAttribute('data-retailer', 'amazon');
    // Home Depot has no rating at all, so it sorts last.
    expect(cards[cards.length - 1]).toHaveAttribute('data-retailer', 'homedepot');
  });

  it('shows an empty state when filters exclude everything', async () => {
    const user = userEvent.setup();
    renderResults();

    await user.type(screen.getByLabelText('Minimum price in dollars'), '9999');

    expect(
      screen.getByRole('heading', { name: 'No offers match these filters' }),
    ).toBeInTheDocument();
  });

  it('toggles the mobile filter panel', async () => {
    const user = userEvent.setup();
    renderResults();

    const toggle = screen.getByRole('button', { name: 'Show filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide filters' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('only offers retailers that are present in the result set', () => {
    renderResults();
    const panel = screen.getByRole('group', { name: 'Retailer' });
    expect(within(panel).queryByLabelText('SHEIN')).not.toBeInTheDocument();
    expect(within(panel).getByLabelText('Amazon')).toBeInTheDocument();
  });
});
