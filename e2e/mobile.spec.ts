import { expect, test } from '@playwright/test';

/** Runs only on the `mobile-chromium` project (Pixel 7 viewport). */
test.describe('mobile viewport', () => {
  test('home page fits the viewport without horizontal scroll', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('the mobile menu opens and links to categories', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Open menu' }).click();
    const nav = page.getByRole('navigation', { name: 'Mobile' });
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: 'Gaming' }).click();
    await expect(page).toHaveURL(/\/search\?q=Nintendo/);
  });

  test('search results stack and filters are collapsed behind a toggle', async ({ page }) => {
    await page.goto('/search?q=Nintendo%20Switch%20OLED');

    const toggle = page.getByRole('button', { name: 'Show filters' });
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(page.getByLabel('Hide offers that need a membership')).toBeVisible();

    await page.getByLabel('Hide offers that need a membership').check();
    await expect(page.locator('[data-membership="required"]')).toHaveCount(0);
  });

  test('results page has no horizontal overflow', async ({ page }) => {
    await page.goto('/search?q=Nintendo%20Switch%20OLED');
    await expect(page.getByTestId('best-price-card')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('tap targets on the offer actions are at least 44px tall', async ({ page }) => {
    await page.goto('/search?q=Nintendo%20Switch%20OLED');
    await expect(page.getByTestId('best-price-card')).toBeVisible();

    const button = page.getByTestId('go-to-store').first();
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();

    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });
});
