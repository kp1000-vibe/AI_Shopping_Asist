/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Filters } from '@/components/filters';
import { DEFAULT_FILTERS, type OfferFilters } from '@/lib/offers';

function setup(overrides: Partial<OfferFilters> = {}) {
  const onChange = vi.fn();
  const filters = { ...DEFAULT_FILTERS, ...overrides };
  render(
    <Filters
      filters={filters}
      onChange={onChange}
      retailers={['amazon', 'walmart', 'costco']}
      resultCount={3}
    />,
  );
  return { onChange, filters };
}

describe('Filters', () => {
  it('reports how many offers are shown', () => {
    setup();
    expect(screen.getByText('3 offers shown')).toBeInTheDocument();
  });

  it('toggles the membership filter', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByLabelText('Hide offers that need a membership'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hideMembership: true }));
  });

  it('toggles the in-stock filter', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByLabelText('In stock only'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ inStockOnly: true }));
  });

  it('lists only the retailers present in the results', () => {
    setup();
    expect(screen.getByLabelText('Amazon')).toBeInTheDocument();
    expect(screen.getByLabelText('Walmart')).toBeInTheDocument();
    expect(screen.queryByLabelText('Target')).not.toBeInTheDocument();
  });

  it('adds a retailer to the filter', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByLabelText('Amazon'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ retailers: ['amazon'] }));
  });

  it('removes a retailer that is already selected', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ retailers: ['amazon', 'walmart'] });

    await user.click(screen.getByLabelText('Amazon'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ retailers: ['walmart'] }));
  });

  it('accepts a price range', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    // The component is controlled, so with a stubbed onChange the input never
    // retains more than the character just typed.
    await user.type(screen.getByLabelText('Minimum price in dollars'), '1');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: 1 }));

    await user.type(screen.getByLabelText('Maximum price in dollars'), '9');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ maxPrice: 9 }));
  });

  it('clears an emptied price input back to null', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ minPrice: 100 });

    await user.clear(screen.getByLabelText('Minimum price in dollars'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: null }));
  });

  it('switches the condition filter', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByLabelText('Used or renewed'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ condition: 'used' }));
  });

  it('hides the clear button until a filter is active', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ inStockOnly: true });

    const clear = screen.getByRole('button', { name: /Clear/ });
    await user.click(clear);
    expect(onChange).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  it('has no clear button with default filters', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });
});
