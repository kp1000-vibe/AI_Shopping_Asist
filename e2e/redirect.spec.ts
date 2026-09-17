import { expect, test } from '@playwright/test';

const QUERY = 'Dyson V15 Detect';

test.describe('outbound redirect', () => {
  test('Go to store links are sponsored, no-follow and open in a new tab', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}`);

    const link = page.getByTestId('go-to-store').first();
    await expect(link).toHaveAttribute('rel', 'sponsored nofollow noopener');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('href', /^\/go\//);
  });

  test('redirects to the retailer product page with a 302', async ({ page, request }) => {
    await page.goto(`/search?q=${encodeURIComponent(QUERY)}`);

    const href = await page.getByTestId('go-to-store').first().getAttribute('href');
    expect(href).toBeTruthy();

    // Do not follow the redirect: the destination is a live retailer site.
    const response = await request.get(href!, { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    const location = response.headers()['location'];
    expect(location).toBeTruthy();
    expect(location).toMatch(/^https:\/\//);
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('an unknown offer id renders a 404 with a way back', async ({ page }) => {
    const response = await page.goto('/go/amazon-notreal');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This offer link has expired');
    await expect(page.getByRole('link', { name: 'Back to PriceShelf' })).toBeVisible();
  });

  test('a malformed offer id is rejected without a lookup', async ({ page }) => {
    const response = await page.goto('/go/not..a..valid..id');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This offer link has expired');
  });
});
