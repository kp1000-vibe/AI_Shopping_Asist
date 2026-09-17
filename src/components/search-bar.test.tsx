/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBar } from '@/components/search-bar';
import { routerMock } from '@/tests/router-mock';

const push = routerMock.push;
const originalFetch = globalThis.fetch;

function mockSuggestions(suggestions: string[]) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ suggestions }),
  } as Response) as unknown as typeof fetch;
}

describe('SearchBar', () => {
  beforeEach(() => {
    push.mockClear();
    mockSuggestions([]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders an accessible search form', () => {
    render(<SearchBar />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText('Search for a product')).toBeInTheDocument();
  });

  it('navigates to the results page on submit', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'AirPods Pro 2');
    await user.keyboard('{Enter}');

    expect(push).toHaveBeenCalledWith('/search?q=AirPods%20Pro%202');
  });

  it('refuses to search for fewer than two characters', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'a');
    await user.keyboard('{Enter}');

    expect(push).not.toHaveBeenCalled();
  });

  it('trims whitespace before searching', async () => {
    const user = userEvent.setup();
    render(<SearchBar defaultValue="  Dyson V15  " />);

    await user.click(screen.getByRole('button', { name: /Search/ }));
    expect(push).toHaveBeenCalledWith('/search?q=Dyson%20V15');
  });

  it('shows debounced suggestions from the API', async () => {
    mockSuggestions(['AirPods Pro 2', 'AirPods Max']);
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'air');

    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /AirPods Pro 2/ })).toBeInTheDocument();
  });

  it('does not query suggestions for a single character', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'a');
    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled());
  });

  it('searches for a clicked suggestion', async () => {
    mockSuggestions(['Dyson V15 Detect']);
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'dys');
    await user.click(await screen.findByRole('option', { name: /Dyson V15 Detect/ }));

    expect(push).toHaveBeenCalledWith('/search?q=Dyson%20V15%20Detect');
  });

  it('supports keyboard navigation through the suggestion list', async () => {
    mockSuggestions(['AirPods Pro 2', 'AirPods Max']);
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'air');
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('option', { name: /AirPods Max/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: /AirPods Pro 2/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/search?q=AirPods%20Pro%202');
  });

  it('closes the suggestion list on Escape', async () => {
    mockSuggestions(['AirPods Pro 2']);
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'air');
    await screen.findByRole('listbox');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('keeps working when the suggestion endpoint fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'airpods');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/search?q=airpods');
  });

  it('ignores a malformed suggestions payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: 'nope' }),
    } as Response) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole('combobox'), 'airpods');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('renders the hero variant with a visible submit label', () => {
    render(<SearchBar size="hero" />);
    expect(screen.getByRole('button', { name: 'Search' })).toBeVisible();
  });
});
