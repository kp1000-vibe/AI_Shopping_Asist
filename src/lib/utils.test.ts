import { describe, expect, it } from 'vitest';
import { cn, formatCompactNumber, formatRelativeTime, truncate } from '@/lib/utils';

describe('cn', () => {
  it('merges conflicting Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', false && 'hidden', undefined, 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('truncate', () => {
  it('leaves short titles alone', () => {
    expect(truncate('AirPods Pro 2', 90)).toBe('AirPods Pro 2');
  });

  it('cuts very long titles on a word boundary', () => {
    const long =
      'Apple AirPods Pro 2 Wireless Earbuds Active Noise Cancellation Bluetooth Headphones Personalized Spatial Audio Sweat Resistant USB-C Charging Case';
    const result = truncate(long, 60);
    expect(result.length).toBeLessThanOrEqual(61);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('  ');
  });

  it('hard cuts when there is no usable word boundary', () => {
    const result = truncate('a'.repeat(120), 20);
    expect(result).toBe(`${'a'.repeat(20)}…`);
  });
});

describe('formatCompactNumber', () => {
  it('shortens large review counts', () => {
    expect(formatCompactNumber(15234)).toBe('15.2K');
    expect(formatCompactNumber(64)).toBe('64');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  it('reports very recent timestamps as just now', () => {
    expect(formatRelativeTime('2026-03-01T11:59:30.000Z', now)).toBe('just now');
  });

  it('reports minutes, hours and days', () => {
    expect(formatRelativeTime('2026-03-01T11:48:00.000Z', now)).toBe('12 minutes ago');
    expect(formatRelativeTime('2026-03-01T09:00:00.000Z', now)).toBe('3 hours ago');
    expect(formatRelativeTime('2026-02-27T12:00:00.000Z', now)).toBe('2 days ago');
  });

  it('degrades gracefully for an unparseable date', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('just now');
  });
});
