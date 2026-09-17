import { expect, test } from '@playwright/test';

test.describe('accessibility', () => {
  test('a skip link is the first focusable element', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText('Skip to main content');
    await expect(focused).toBeVisible();

    await focused.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('the whole search flow is reachable by keyboard', async ({ page }) => {
    await page.goto('/');

    const input = page.getByRole('search').first().getByRole('combobox');
    await input.focus();
    await page.keyboard.type('Dyson V15 Detect');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=Dyson/);
    await expect(page.getByTestId('best-price-card')).toBeVisible();
  });

  test('filters are operable with the keyboard', async ({ page }) => {
    await page.goto('/search?q=Dyson%20V15%20Detect');

    const checkbox = page.getByLabel('Hide offers that need a membership');
    await checkbox.focus();
    await page.keyboard.press('Space');

    await expect(checkbox).toBeChecked();
    await expect(page.locator('[data-membership="required"]')).toHaveCount(0);
  });

  test('interactive elements show a visible focus ring', async ({ page }) => {
    await page.goto('/search?q=Dyson%20V15%20Detect');

    const link = page.getByTestId('go-to-store').first();
    await link.focus();

    const outline = await link.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { shadow: style.boxShadow, outline: style.outlineStyle };
    });
    expect(outline.shadow !== 'none' || outline.outline !== 'none').toBe(true);
  });

  test('every product image has alt text or an explicit label', async ({ page }) => {
    await page.goto('/search?q=Dyson%20V15%20Detect');
    await expect(page.getByTestId('best-price-card')).toBeVisible();

    const missing = await page.evaluate(
      () =>
        [...document.querySelectorAll('img')].filter(
          (img) => !img.hasAttribute('alt') && !img.hasAttribute('aria-label'),
        ).length,
    );
    expect(missing).toBe(0);
  });

  test('the results count is announced to screen readers', async ({ page }) => {
    await page.goto('/search?q=Dyson%20V15%20Detect');
    await expect(page.locator('[aria-live="polite"]').first()).toContainText(/offers?/);
  });

  test('landmarks are present and labelled', async ({ page }) => {
    await page.goto('/search?q=Dyson%20V15%20Detect');

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  });
});
