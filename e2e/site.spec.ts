import { expect, test } from '@playwright/test';

test.describe('site pages', () => {
  test('renders a custom 404 for an unknown route', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This shelf is empty');
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
  });

  test('serves robots.txt and the sitemap', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap:');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('/product/airpods-pro-2');
  });

  test('sets the security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('carries the FTC affiliate disclosure', async ({ page }) => {
    await page.goto('/affiliate-disclosure');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Affiliate disclosure');
    await expect(page.getByText(/PriceShelf is reader supported/)).toBeVisible();
    await expect(page.getByText(/As an Amazon Associate/)).toBeVisible();
  });

  test('legal pages are reachable from the footer', async ({ page }) => {
    await page.goto('/');

    for (const [label, heading] of [
      ['Privacy', 'Privacy policy'],
      ['Terms', 'Terms of use'],
      ['About', 'About PriceShelf'],
    ] as const) {
      await page.getByRole('contentinfo').getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await page.goBack();
    }
  });

  test('every page has exactly one h1', async ({ page }) => {
    for (const path of ['/', '/about', '/privacy', '/terms', '/affiliate-disclosure', '/search']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    }
  });

  test('renders a product comparison page with a full offer table', async ({ page }) => {
    await page.goto('/product/airpods-pro-2');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Airpods Pro 2');
    await expect(page.getByText(/Price range/)).toBeVisible();

    const rows = page.getByTestId('offer-row');
    expect(await rows.count()).toBeGreaterThan(1);
    await expect(page.getByText('Best price').first()).toBeVisible();
  });

  test('exposes the WebSite SearchAction on the home page', async ({ page }) => {
    await page.goto('/');

    const raw = await page.locator('script#ld-website').innerText();
    const data = JSON.parse(raw) as { potentialAction: { target: { urlTemplate: string } } };
    expect(data.potentialAction.target.urlTemplate).toContain('search?q={search_term_string}');
  });

  test('rate limits the search API', async ({ request }) => {
    const responses = await Promise.all(
      Array.from({ length: 40 }, () => request.get('/api/search?q=AirPods%20Pro%202')),
    );

    const statuses = responses.map((response) => response.status());
    expect(statuses.filter((status) => status === 200).length).toBeGreaterThan(0);
    expect(statuses).toContain(429);
  });

  test('validates the search API query', async ({ request }) => {
    const response = await request.get('/api/search?q=a');
    expect([400, 429]).toContain(response.status());
  });
});
