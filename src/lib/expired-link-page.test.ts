import { describe, expect, it } from 'vitest';
import { expiredLinkPage } from '@/lib/expired-link-page';

describe('expiredLinkPage', () => {
  const html = expiredLinkPage();

  it('is a complete standalone document', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('explains why the link stopped working and offers a way back', () => {
    expect(html).toContain('This offer link has expired');
    expect(html).toContain('24 hours');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/search"');
  });

  it('is excluded from search indexes', () => {
    expect(html).toContain('noindex, nofollow');
  });

  it('loads no external resources, so it works under the strict CSP', () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link[^>]+href=["']http/i);
    expect(html).not.toMatch(/src=["']http/i);
  });
});
