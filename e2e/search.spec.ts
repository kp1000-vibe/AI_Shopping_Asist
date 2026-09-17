import { expect, test } from '@playwright/test';

const QUERY = 'AirPods Pro 2';

test.describe('search and compare', () => {
  test('searches from the home page and lands on ranked results', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'One search. Every shelf price.',
    );

    const search = page.getByRole('search').first();
    await search.getByRole('combobox').fill(QUERY);
    await search.getByRole('combobox').press('Enter');

    await expect(page).toHaveURL(/\/search\?q=AirPods/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      `${QUERY} price comparison`,
    );

    await expect(page.getByTestId('best-price-card')).toBeVisible();
    await expect(page.getByTestId('offer-card').first()).toBeVisible();
  });

  test('shows the cheapest total first with a savings figure', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}`);

    const best = page.getByTestId('best-price-card');
    await expect(best).toBeVisible();
    await expect(best).toContainText(/Best price of \d+ offers/);
    await expect(best).toContainText(/Saves \$/);

    const bestTotal = await page.getByTestId('best-total').innerText();
    const otherTotals = await page.getByTestId('offer-total').allInnerTexts();

    const toNumber = (value: string) => Number(value.replace(/[^0-9.]/g, ''));
    for (const total of otherTotals) {
      expect(toNumber(bestTotal)).toBeLessThanOrEqual(toNumber(total));
    }
  });

  test('labels membership requirements on warehouse club offers', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}`);

    await expect(page.getByText('Costco membership required').first()).toBeVisible();
    await expect(page.getByText('Sams Club membership required').first()).toBeVisible();
  });

  test('hides membership offers when the filter is switched on', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}`);

    const before = await page.locator('[data-membership="required"]').count();
    expect(before).toBeGreaterThan(0);

    await page.getByLabel('Hide offers that need a membership').check();

    await expect(page.locator('[data-membership="required"]')).toHaveCount(0);
    await expect(page.getByText('Costco membership required')).toHaveCount(0);
    await expect(page).toHaveURL(/nomembership=1/);
  });

  test('sorts by the cheapest item price', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}&sort=lowest-price`);

    await expect(page.getByLabel('Sort offers')).toContainText('Lowest price');
    await expect(page.getByTestId('best-price-card')).toBeVisible();
  });

  test('filters to in-stock offers only', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}`);

    await expect(page.getByText('Out of stock').first()).toBeVisible();
    await page.getByLabel('In stock only').check();
    await expect(page.getByText('Out of stock')).toHaveCount(0);
  });

  test('restores filters from a shared URL', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}&nomembership=1&instock=1`);

    await expect(page.getByLabel('Hide offers that need a membership')).toBeChecked();
    await expect(page.getByLabel('In stock only')).toBeChecked();
    await expect(page.locator('[data-membership="required"]')).toHaveCount(0);
  });

  test('prompts for a query when the search box is empty', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Search for a product');
  });

  test('emits Product structured data for the results page', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}`);

    const raw = await page.locator('script#ld-product').innerText();
    const data = JSON.parse(raw) as {
      '@type': string;
      offers: { '@type': string; lowPrice: string; offerCount: number };
    };

    expect(data['@type']).toBe('Product');
    expect(data.offers['@type']).toBe('AggregateOffer');
    expect(data.offers.offerCount).toBeGreaterThan(0);
  });
});
